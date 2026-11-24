import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import { Error as MongooseError } from 'mongoose'
import BadRequestError from '../errors/bad-request-error'
import ConflictError from '../errors/conflict-error'
import NotFoundError from '../errors/not-found-error'
import Product from '../models/product'
import movingFile from '../utils/movingFile'
import getPagination from '../utils/pagination'
import { PUBLIC_UPLOAD_DIR, TEMP_UPLOAD_DIR } from '../utils/uploadPaths'
import {
    clearProductsCache,
    getCachedProducts,
    getProductsCacheVersion,
    setCachedProducts,
} from '../utils/productsCache'

// GET /product
const getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, skip } = getPagination(
            req.query.page,
            req.query.limit,
            5
        )

        // Используем проверенные значения, а не исходный req.query.
        const cacheKey = `${page}:${limit}`
        const cachedBody = getCachedProducts(cacheKey)

        if (cachedBody !== undefined) {
            res.setHeader('X-Cache', 'HIT')

            return res.type('application/json').send(cachedBody)
        }

        // Запоминаем версию до асинхронного обращения к базе.
        const requestVersion = getProductsCacheVersion()

        const options = {
            skip,
            limit,
        }

        const products = await Product.find({}, null, options)
        const totalProducts = await Product.countDocuments({})
        const totalPages = Math.ceil(totalProducts / limit)

        const body = JSON.stringify({
            items: products,
            pagination: {
                totalProducts,
                totalPages,
                currentPage: Number(page),
                pageSize: Number(limit),
            },
        })

        // Результат не попадёт в кэш, если за время чтения товар изменился.
        setCachedProducts(cacheKey, body, requestVersion)

        res.setHeader('X-Cache', 'MISS')

        return res.type('application/json').send(body)
    } catch (err) {
        return next(err)
    }
}

// POST /product
const createProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { description, category, price, title, image } = req.body

        // Переносим картинку из временной папки
        if (image) {
            await movingFile(image.fileName, TEMP_UPLOAD_DIR, PUBLIC_UPLOAD_DIR)
        }

        const product = await Product.create({
            description,
            image,
            category,
            price,
            title,
        })

        clearProductsCache()

        return res.status(constants.HTTP_STATUS_CREATED).send(product)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Товар с таким заголовком уже существует')
            )
        }
        return next(error)
    }
}

// TODO: Добавить guard admin
// PUT /product
const updateProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { productId } = req.params
        const { image } = req.body

        const currentProduct = await Product.findById(productId).orFail(
            () => new NotFoundError('Нет товара по заданному id')
        )

        if (image && image.fileName !== currentProduct.image?.fileName) {
            await movingFile(image.fileName, TEMP_UPLOAD_DIR, PUBLIC_UPLOAD_DIR)
        }

        const product = await Product.findByIdAndUpdate(
            productId,
            {
                $set: {
                    ...req.body,
                    price: req.body.price ? req.body.price : null,
                    image: req.body.image ? req.body.image : undefined,
                },
            },
            { runValidators: true, new: true }
        ).orFail(() => new NotFoundError('Нет товара по заданному id'))
        clearProductsCache()
        return res.send(product)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID товара'))
        }
        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Товар с таким заголовком уже существует')
            )
        }
        return next(error)
    }
}

// TODO: Добавить guard admin
// DELETE /product
const deleteProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { productId } = req.params
        const product = await Product.findByIdAndDelete(productId).orFail(
            () => new NotFoundError('Нет товара по заданному id')
        )

        clearProductsCache()

        return res.send(product)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID товара'))
        }
        return next(error)
    }
}

export { createProduct, deleteProduct, getProducts, updateProduct }
