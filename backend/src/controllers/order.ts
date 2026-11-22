import { NextFunction, Request, Response } from 'express'
import { FilterQuery, Error as MongooseError, PipelineStage } from 'mongoose'
import BadRequestError from '../errors/bad-request-error'
import NotFoundError from '../errors/not-found-error'
import Order, { IOrder } from '../models/order'
import Product from '../models/product'
import User from '../models/user'
import getPagination from '../utils/pagination'
import getSearchRegex from '../utils/search'
import getSorting from '../utils/sorting'
import getNumberRange from '../utils/numberRange'
import getDateRange from '../utils/dateRange'
import sanitizeComment from '../utils/sanitizeComment'

// eslint-disable-next-line max-len
// GET /orders?page=2&limit=5&sort=totalAmount&order=desc&orderDateFrom=2024-07-01&orderDateTo=2024-08-01&status=delivering&totalAmountFrom=100&totalAmountTo=1000&search=%2B1

export const getOrders = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const {
            status,
            totalAmountFrom,
            totalAmountTo,
            orderDateFrom,
            orderDateTo,
        } = req.query

        const { page, limit, skip } = getPagination(
            req.query.page,
            req.query.limit
        )

        const sort = getSorting(req.query.sortField, req.query.sortOrder, [
            'createdAt',
            'orderNumber',
            'totalAmount',
            'status',
        ])

        const searchRegex = getSearchRegex(req.query.search)

        const filters: FilterQuery<Partial<IOrder>> = {}

        if (status !== undefined && status !== '') {
            const allowedStatuses = [
                'new',
                'delivering',
                'completed',
                'cancelled',
            ]

            if (
                typeof status !== 'string' ||
                !allowedStatuses.includes(status)
            ) {
                throw new BadRequestError('Передан недопустимый статус заказа')
            }

            filters.status = status
        }

        const totalAmountRange = getNumberRange(
            totalAmountFrom,
            totalAmountTo,
            'totalAmountFrom',
            'totalAmountTo'
        )

        if (totalAmountRange) {
            filters.totalAmount = totalAmountRange
        }

        const orderDateRange = getDateRange(
            orderDateFrom,
            orderDateTo,
            'orderDateFrom',
            'orderDateTo'
        )

        if (orderDateRange) {
            filters.createdAt = orderDateRange
        }

        const aggregatePipeline: PipelineStage[] = [
            {
                $match: filters,
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products',
                    foreignField: '_id',
                    as: 'products',
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'customer',
                    foreignField: '_id',
                    as: 'customer',
                },
            },
            {
                $unwind: '$customer',
            },
            {
                $project: {
                    'customer.password': 0,
                    'customer.tokens': 0,
                    'customer.salt': 0,
                },
            },
        ]

        if (searchRegex) {
            const searchConditions: FilterQuery<IOrder>[] = [
                {
                    'products.title': searchRegex,
                },
            ]

            if (typeof req.query.search === 'string') {
                const searchNumber = Number(req.query.search.trim())

                if (Number.isSafeInteger(searchNumber)) {
                    searchConditions.push({
                        orderNumber: searchNumber,
                    })
                }
            }

            aggregatePipeline.push({
                $match: {
                    $or: searchConditions,
                },
            })
        }

        aggregatePipeline.push({
            $facet: {
                orders: [
                    {
                        $sort: {
                            ...sort,
                            _id: 1,
                        },
                    },
                    {
                        $skip: skip,
                    },
                    {
                        $limit: limit,
                    },
                    {
                        $project: {
                            _id: 1,
                            orderNumber: 1,
                            status: 1,
                            totalAmount: 1,
                            products: 1,
                            customer: 1,
                            createdAt: 1,
                        },
                    },
                ],
                metadata: [
                    {
                        $count: 'totalOrders',
                    },
                ],
            },
        })

        const [result] = await Order.aggregate<{
            orders: IOrder[]
            metadata: { totalOrders: number }[]
        }>(aggregatePipeline)

        const orders = result?.orders ?? []
        const totalOrders = result?.metadata[0]?.totalOrders ?? 0
        const totalPages = Math.ceil(totalOrders / limit)

        res.status(200).json({
            orders,
            pagination: {
                totalOrders,
                totalPages,
                currentPage: page,
                pageSize: limit,
            },
        })
    } catch (error) {
        next(error)
    }
}

export const getOrdersCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.user._id
        const searchRegex = getSearchRegex(req.query.search)

        const { page, limit, skip } = getPagination(
            req.query.page,
            req.query.limit,
            5
        )

        await User.findById(userId)
            .select('_id')
            .orFail(
                () =>
                    new NotFoundError(
                        'Пользователь по заданному id отсутствует в базе'
                    )
            )

        const filters: FilterQuery<Partial<IOrder>> = {
            customer: userId,
        }

        if (searchRegex) {
            const productIds = await Product.find({
                title: searchRegex,
            }).distinct('_id')

            const searchConditions: FilterQuery<IOrder>[] = [
                {
                    products: {
                        $in: productIds,
                    },
                },
            ]

            if (typeof req.query.search === 'string') {
                const searchNumber = Number(req.query.search.trim())

                if (Number.isSafeInteger(searchNumber)) {
                    searchConditions.push({
                        orderNumber: searchNumber,
                    })
                }
            }

            filters.$or = searchConditions
        }

        const [orders, totalOrders] = await Promise.all([
            Order.find(filters)
                .sort({
                    createdAt: -1,
                    _id: -1,
                })
                .skip(skip)
                .limit(limit)
                .populate([
                    'products',
                    {
                        path: 'customer',
                        select: '-password -tokens -salt',
                    },
                ]),
            Order.countDocuments(filters),
        ])

        const totalPages = Math.ceil(totalOrders / limit)

        return res.send({
            orders,
            pagination: {
                totalOrders,
                totalPages,
                currentPage: page,
                pageSize: limit,
            },
        })
    } catch (error) {
        return next(error)
    }
}

// Get order by ID
export const getOrderByNumber = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const order = await Order.findOne({
            orderNumber: req.params.orderNumber,
        })
            .populate([
                'products',
                {
                    path: 'customer',
                    select: '-password -tokens -salt',
                },
            ])
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
        return res.status(200).json(order)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }
        return next(error)
    }
}

export const getOrderCurrentUserByNumber = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.user._id

        const order = await Order.findOne({
            orderNumber: req.params.orderNumber,
            customer: userId,
        })
            .populate([
                'products',
                {
                    path: 'customer',
                    select: '-password -tokens -salt',
                },
            ])
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному номеру отсутствует в базе'
                    )
            )

        return res.status(200).json(order)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(
                new BadRequestError('Передан некорректный номер заказа')
            )
        }

        return next(error)
    }
}
// POST /product
export const createOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.user._id
        const { address, payment, phone, total, email, items, comment } =
            req.body

        const cleanComment = sanitizeComment(comment)

        if (
            !Array.isArray(items) ||
            items.length === 0 ||
            items.length > 100 ||
            !items.every(
                (id: unknown) =>
                    typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id)
            )
        ) {
            throw new BadRequestError(
                'Передайте от 1 до 100 корректных id товаров'
            )
        }

        if (typeof total !== 'number' || !Number.isFinite(total) || total < 0) {
            throw new BadRequestError(
                'Сумма заказа должна быть неотрицательным числом'
            )
        }

        const itemIds: string[] = items.map((id: string) => id.toLowerCase())

        const uniqueItemIds = [...new Set(itemIds)]

        const products = await Product.find({
            _id: { $in: uniqueItemIds },
        }).select('_id price')

        const productsById = new Map(
            products.map((product) => [product._id.toString(), product])
        )

        const totalBasket = itemIds.reduce((sum, id) => {
            const product = productsById.get(id)

            if (!product) {
                throw new BadRequestError(`Товар с id ${id} не найден`)
            }

            if (
                typeof product.price !== 'number' ||
                !Number.isFinite(product.price) ||
                product.price < 0
            ) {
                throw new BadRequestError(
                    `Товар с id ${id} недоступен для покупки`
                )
            }

            return sum + product.price
        }, 0)

        if (!Number.isFinite(totalBasket)) {
            throw new BadRequestError('Не удалось рассчитать сумму заказа')
        }

        if (totalBasket !== total) {
            throw new BadRequestError('Неверная сумма заказа')
        }

        const newOrder = new Order({
            totalAmount: totalBasket,
            products: itemIds,
            payment,
            phone,
            email,
            comment: cleanComment,
            customer: userId,
            deliveryAddress: address,
        })

        await newOrder.save()

        await newOrder.populate([
            'products',
            {
                path: 'customer',
                select: '-password -tokens -salt',
            },
        ])

        return res.status(200).json(newOrder)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }

        if (error instanceof MongooseError.CastError) {
            return next(
                new BadRequestError('Переданы некорректные данные заказа')
            )
        }

        return next(error)
    }
}
// Update an order
export const updateOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { status } = req.body
        const updatedOrder = await Order.findOneAndUpdate(
            { orderNumber: req.params.orderNumber },
            { status },
            { new: true, runValidators: true }
        )
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
            .populate([
                'products',
                {
                    path: 'customer',
                    select: '-password -tokens -salt',
                },
            ])
        return res.status(200).json(updatedOrder)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }
        return next(error)
    }
}

// Delete an order
export const deleteOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const deletedOrder = await Order.findByIdAndDelete(req.params.id)
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
            .populate([
                'products',
                {
                    path: 'customer',
                    select: '-password -tokens -salt',
                },
            ])
        return res.status(200).json(deletedOrder)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }
        return next(error)
    }
}
