import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { REFRESH_TOKEN } from '../config'
import ForbiddenError from '../errors/forbidden-error'

const CSRF_COOKIE_NAME = '_csrf'
const CSRF_TOKEN_LIFETIME_MS = 60 * 60 * 1000

const csrfSecret = process.env.CSRF_SECRET

if (!csrfSecret || Buffer.byteLength(csrfSecret, 'utf8') < 32) {
    throw new Error(
        'CSRF_SECRET должен содержать случайный секрет длиной не менее 32 байт'
    )
}

const secret: string = csrfSecret

const csrfCookieOptions = {
    httpOnly: true,
    secure: process.env.CSRF_COOKIE_SECURE === 'true',
    sameSite: 'lax' as const,
    path: '/',
}

function getBinding(req: Request): string | null {
    const binding: unknown = req.cookies?.[CSRF_COOKIE_NAME]

    if (typeof binding !== 'string' || !/^[a-f0-9]{64}$/.test(binding)) {
        return null
    }

    return binding
}

function getRefreshToken(req: Request): string {
    const refreshToken: unknown = req.cookies?.[REFRESH_TOKEN.cookie.name]

    return typeof refreshToken === 'string' ? refreshToken : ''
}

function createSignature(
    binding: string,
    refreshToken: string,
    timestamp: string,
    nonce: string
): string {
    const message = JSON.stringify([binding, refreshToken, timestamp, nonce])

    return createHmac('sha256', secret).update(message).digest('hex')
}

function rejectCsrf(next: NextFunction) {
    return next(new ForbiddenError('Отсутствует или недействителен CSRF-токен'))
}

export function issueCsrfToken(req: Request, res: Response) {
    let binding = getBinding(req)

    if (!binding) {
        binding = randomBytes(32).toString('hex')

        res.cookie(CSRF_COOKIE_NAME, binding, csrfCookieOptions)
    }

    const timestamp = Date.now().toString()
    const nonce = randomBytes(32).toString('hex')
    const signature = createSignature(
        binding,
        getRefreshToken(req),
        timestamp,
        nonce
    )

    res.setHeader('Cache-Control', 'no-store')

    return res.status(200).json({
        csrfToken: `${timestamp}.${nonce}.${signature}`,
    })
}

export function csrfProtection(
    req: Request,
    _res: Response,
    next: NextFunction
) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next()
    }

    const binding = getBinding(req)
    const token = req.get('X-CSRF-Token')

    if (!binding || !token || token.length > 200) {
        return rejectCsrf(next)
    }

    const parts = token.split('.')

    if (parts.length !== 3) {
        return rejectCsrf(next)
    }

    const [timestamp, nonce, signature] = parts

    if (
        !/^\d{13}$/.test(timestamp) ||
        !/^[a-f0-9]{64}$/.test(nonce) ||
        !/^[a-f0-9]{64}$/.test(signature)
    ) {
        return rejectCsrf(next)
    }

    const issuedAt = Number(timestamp)
    const age = Date.now() - issuedAt

    if (age < 0 || age > CSRF_TOKEN_LIFETIME_MS) {
        return rejectCsrf(next)
    }

    const expectedSignature = createSignature(
        binding,
        getRefreshToken(req),
        timestamp,
        nonce
    )

    const actualBuffer = Uint8Array.from(Buffer.from(signature, 'hex'))
    const expectedBuffer = Uint8Array.from(
        Buffer.from(expectedSignature, 'hex')
    )

    if (!timingSafeEqual(actualBuffer, expectedBuffer)) {
        return rejectCsrf(next)
    }

    return next()
}
