import { NextFunction, Request, Response } from 'express'
import { FilterQuery, Error as MongooseError } from 'mongoose'
import NotFoundError from '../errors/not-found-error'
import Order from '../models/order'
import User, { IUser } from '../models/user'
import BadRequestError from '../errors/bad-request-error'
import ConflictError from '../errors/conflict-error'
import getPagination from '../utils/pagination'
import getSearchRegex from '../utils/search'
import getSorting from '../utils/sorting'
import getNumberRange from '../utils/numberRange'
import getDateRange from '../utils/dateRange'
import Product from '../models/product'

// TODO: Добавить guard admin
// eslint-disable-next-line max-len
// Get GET /customers?page=2&limit=5&sort=totalAmount&order=desc&registrationDateFrom=2023-01-01&registrationDateTo=2023-12-31&lastOrderDateFrom=2023-01-01&lastOrderDateTo=2023-12-31&totalAmountFrom=100&totalAmountTo=1000&orderCountFrom=1&orderCountTo=10
export const getCustomers = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const {
            registrationDateFrom,
            registrationDateTo,
            lastOrderDateFrom,
            lastOrderDateTo,
            totalAmountFrom,
            totalAmountTo,
            orderCountFrom,
            orderCountTo,
        } = req.query

        const { page, limit, skip } = getPagination(
            req.query.page,
            req.query.limit
        )

        const searchRegex = getSearchRegex(req.query.search)

        const filters: FilterQuery<Partial<IUser>> = {}

        const registrationDateRange = getDateRange(
            registrationDateFrom,
            registrationDateTo,
            'registrationDateFrom',
            'registrationDateTo'
        )

        if (registrationDateRange) {
            filters.createdAt = registrationDateRange
        }

        const lastOrderDateRange = getDateRange(
            lastOrderDateFrom,
            lastOrderDateTo,
            'lastOrderDateFrom',
            'lastOrderDateTo'
        )

        if (lastOrderDateRange) {
            filters.lastOrderDate = lastOrderDateRange
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

        const orderCountRange = getNumberRange(
            orderCountFrom,
            orderCountTo,
            'orderCountFrom',
            'orderCountTo',
            true
        )

        if (orderCountRange) {
            filters.orderCount = orderCountRange
        }

        if (searchRegex) {
            const productIds = await Product.find({
                title: searchRegex,
            }).distinct('_id')

            const customerIds = await Order.find({
                $or: [
                    {
                        deliveryAddress: searchRegex,
                    },
                    {
                        products: {
                            $in: productIds,
                        },
                    },
                ],
            }).distinct('customer')

            filters.$or = [
                {
                    name: searchRegex,
                },
                {
                    _id: {
                        $in: customerIds,
                    },
                },
            ]
        }

        const sort = getSorting(req.query.sortField, req.query.sortOrder, [
            'createdAt',
            'name',
            'totalAmount',
            'orderCount',
            'lastOrderDate',
        ])

        const options = {
            sort,
            skip,
            limit,
        }

        const users = await User.find(filters, null, options).populate([
            'orders',
            {
                path: 'lastOrder',
                populate: {
                    path: 'products',
                },
            },
            {
                path: 'lastOrder',
                populate: {
                    path: 'customer',
                },
            },
        ])

        const totalUsers = await User.countDocuments(filters)
        const totalPages = Math.ceil(totalUsers / limit)

        res.status(200).json({
            customers: users,
            pagination: {
                totalUsers,
                totalPages,
                currentPage: page,
                pageSize: limit,
            },
        })
    } catch (error) {
        next(error)
    }
}

// TODO: Добавить guard admin
// Get /customers/:id
export const getCustomerById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = await User.findById(req.params.id)
            .populate(['orders', 'lastOrder'])
            .orFail(
                () =>
                    new NotFoundError(
                        'Пользователь по заданному id отсутствует в базе'
                    )
            )

        res.status(200).json(user)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(
                new BadRequestError('Передан невалидный ID пользователя')
            )
        }

        return next(error)
    }
}

// TODO: Добавить guard admin
// Patch /customers/:id
export const updateCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { name, email, phone } = req.body

        const updates: {
            name?: string
            email?: string
            phone?: string
        } = {}

        if (name !== undefined) {
            updates.name = name
        }

        if (email !== undefined) {
            updates.email = email
        }

        if (phone !== undefined) {
            updates.phone = phone
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            {
                new: true,
                runValidators: true,
            }
        )
            .orFail(
                () =>
                    new NotFoundError(
                        'Пользователь по заданному id отсутствует в базе'
                    )
            )
            .populate(['orders', 'lastOrder'])

        res.status(200).json(updatedUser)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }

        if (error instanceof MongooseError.CastError) {
            return next(
                new BadRequestError('Передан невалидный ID пользователя')
            )
        }

        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Пользователь с таким email уже существует')
            )
        }

        return next(error)
    }
}

// TODO: Добавить guard admin
// Delete /customers/:id
export const deleteCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id).orFail(
            () =>
                new NotFoundError(
                    'Пользователь по заданному id отсутствует в базе'
                )
        )
        res.status(200).json(deletedUser)
    } catch (error) {
        next(error)
    }
}
