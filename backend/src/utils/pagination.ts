import BadRequestError from '../errors/bad-request-error'

const MAX_PAGE_SIZE = 10

function parsePositiveInteger(
    value: unknown,
    defaultValue: number,
    fieldName: string
): number {
    if (value === undefined) {
        return defaultValue
    }

    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
        throw new BadRequestError(
            `Параметр "${fieldName}" должен быть положительным целым числом`
        )
    }

    const parsedValue = Number(value)

    if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
        throw new BadRequestError(
            `Параметр "${fieldName}" должен быть положительным целым числом`
        )
    }

    return parsedValue
}

export default function getPagination(
    pageValue: unknown,
    limitValue: unknown,
    defaultLimit = MAX_PAGE_SIZE
) {
    const page = parsePositiveInteger(pageValue, 1, 'page')

    const requestedLimit = parsePositiveInteger(
        limitValue,
        defaultLimit,
        'limit'
    )

    const limit = Math.min(requestedLimit, MAX_PAGE_SIZE)
    const skip = (page - 1) * limit

    if (!Number.isSafeInteger(skip)) {
        throw new BadRequestError('Слишком большое значение страницы')
    }

    return {
        page,
        limit,
        skip,
    }
}
