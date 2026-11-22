import { rateLimit } from 'express-rate-limit'

export const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        message: 'Слишком много запросов. Повторите попытку позже',
    },
})

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        message: 'Слишком много попыток. Повторите попытку через 15 минут',
    },
})
