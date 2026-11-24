import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import mongoose from 'mongoose'
import path from 'path'
import { DB_ADDRESS } from './config'
import errorHandler from './middlewares/error-handler'
import serveStatic from './middlewares/serverStatic'
import routes from './routes'
import { apiLimiter, authLimiter } from './middlewares/rateLimit'
import ForbiddenError from './errors/forbidden-error'
import { csrfProtection } from './middlewares/csrf'

const { PORT = 3000 } = process.env
const app = express()

const allowedOrigins = new Set(
    (
        process.env.CORS_ALLOWED_ORIGINS ||
        'http://localhost,http://localhost:5173'
    )
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
)

app.set('trust proxy', 1)

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.has(origin)) {
                callback(null, true)
                return
            }

            callback(new ForbiddenError('Источник запроса не разрешён'))
        },
        credentials: true,
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    })
)

app.use(apiLimiter)
app.use(['/auth/login', '/auth/register'], authLimiter)

app.use(cookieParser())

app.use(csrfProtection)

app.use(serveStatic(path.join(__dirname, 'public')))

app.use(urlencoded({ extended: true }))
app.use(json())
app.use(routes)
app.use(errors())
app.use(errorHandler)

// eslint-disable-next-line no-console

const bootstrap = async () => {
    try {
        await mongoose.connect(DB_ADDRESS)
        app.listen(PORT, () => console.log('ok'))
    } catch (error) {
        console.error(error)

        setTimeout(() => {
            bootstrap()
        }, 5000)
    }
}

bootstrap()
