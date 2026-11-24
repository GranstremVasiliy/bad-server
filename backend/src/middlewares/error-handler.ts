import { ErrorRequestHandler } from 'express'

const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
    console.error(err)

    if (res.headersSent) {
        return next(err)
    }

    const candidateStatus = err.statusCode ?? err.status

    const statusCode =
        Number.isInteger(candidateStatus) &&
        candidateStatus >= 400 &&
        candidateStatus <= 599
            ? candidateStatus
            : 500

    const message =
        statusCode >= 500
            ? 'На сервере произошла ошибка'
            : err.message || 'Ошибка запроса'

    res.status(statusCode).send({ message })
}

export default errorHandler
