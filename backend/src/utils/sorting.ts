import BadRequestError from '../errors/bad-request-error'

export default function getSorting(
    fieldValue: unknown,
    orderValue: unknown,
    allowedFields: readonly string[]
): Record<string, 1 | -1> {
    const field = fieldValue === undefined ? 'createdAt' : fieldValue
    const order = orderValue === undefined ? 'desc' : orderValue

    if (typeof field !== 'string' || !allowedFields.includes(field)) {
        throw new BadRequestError('Передано недопустимое поле сортировки')
    }

    if (typeof order !== 'string' || !['asc', 'desc'].includes(order)) {
        throw new BadRequestError(
            'Параметр "sortOrder" должен быть "asc" или "desc"'
        )
    }

    const direction: 1 | -1 = order === 'desc' ? -1 : 1

    return {
        [field]: direction,
    }
}
