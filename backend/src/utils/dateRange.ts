import BadRequestError from '../errors/bad-request-error'

const FILTER_UTC_OFFSET_MS = 3 * 60 * 60 * 1000

interface DateRange {
    $gte?: Date
    $lt?: Date
}

function parseDate(value: unknown, fieldName: string): Date | undefined {
    if (value === undefined || value === '') {
        return undefined
    }

    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new BadRequestError(
            `Параметр "${fieldName}" должен иметь формат YYYY-MM-DD`
        )
    }

    const date = new Date(`${value}T00:00:00.000Z`)

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
    ) {
        throw new BadRequestError(
            `Параметр "${fieldName}" содержит несуществующую дату`
        )
    }

    return date
}

export default function getDateRange(
    fromValue: unknown,
    toValue: unknown,
    fromName: string,
    toName: string
): DateRange | undefined {
    const from = parseDate(fromValue, fromName)
    const to = parseDate(toValue, toName)

    if (from && to && from.getTime() > to.getTime()) {
        throw new BadRequestError(
            `Параметр "${fromName}" не должен быть позже "${toName}"`
        )
    }

    if (!from && !to) {
        return undefined
    }

    const range: DateRange = {}

    if (from) {
        range.$gte = new Date(from.getTime() - FILTER_UTC_OFFSET_MS)
    }

    if (to) {
        const nextDay = new Date(to.getTime())
        nextDay.setUTCDate(nextDay.getUTCDate() + 1)

        range.$lt = new Date(nextDay.getTime() - FILTER_UTC_OFFSET_MS)
    }

    return range
}
