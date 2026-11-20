import BadRequestError from '../errors/bad-request-error'

interface NumberRange {
    $gte?: number
    $lte?: number
}

function parseNumber(
    value: unknown,
    fieldName: string,
    integerOnly: boolean
): number | undefined {
    if (value === undefined || value === '') {
        return undefined
    }

    if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value)) {
        throw new BadRequestError(
            `Параметр "${fieldName}" должен быть неотрицательным числом`
        )
    }

    const parsedValue = Number(value)

    if (
        !Number.isFinite(parsedValue) ||
        parsedValue > Number.MAX_SAFE_INTEGER
    ) {
        throw new BadRequestError(
            `Параметр "${fieldName}" выходит за допустимый диапазон`
        )
    }

    if (
        integerOnly &&
        (!/^\d+$/.test(value) || !Number.isSafeInteger(parsedValue))
    ) {
        throw new BadRequestError(
            `Параметр "${fieldName}" должен быть целым числом`
        )
    }

    return parsedValue
}

export default function getNumberRange(
    fromValue: unknown,
    toValue: unknown,
    fromName: string,
    toName: string,
    integerOnly = false
): NumberRange | undefined {
    const from = parseNumber(fromValue, fromName, integerOnly)
    const to = parseNumber(toValue, toName, integerOnly)

    if (from !== undefined && to !== undefined && from > to) {
        throw new BadRequestError(
            `Параметр "${fromName}" не должен превышать "${toName}"`
        )
    }

    if (from === undefined && to === undefined) {
        return undefined
    }

    const range: NumberRange = {}

    if (from !== undefined) {
        range.$gte = from
    }

    if (to !== undefined) {
        range.$lte = to
    }

    return range
}
