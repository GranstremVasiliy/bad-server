import BadRequestError from '../errors/bad-request-error'

const MAX_SEARCH_LENGTH = 100

export default function getSearchRegex(value: unknown): RegExp | undefined {
    if (value === undefined) {
        return undefined
    }

    if (typeof value !== 'string') {
        throw new BadRequestError('Параметр "search" должен быть строкой')
    }

    if (value.length > MAX_SEARCH_LENGTH) {
        throw new BadRequestError(
            `Параметр "search" не должен превышать ${MAX_SEARCH_LENGTH} символов`
        )
    }

    const search = value.trim()

    if (search.length === 0) {
        return undefined
    }

    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    return new RegExp(escapedSearch, 'i')
}
