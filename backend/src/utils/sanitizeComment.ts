import sanitizeHtml from 'sanitize-html'
import BadRequestError from '../errors/bad-request-error'

const MAX_COMMENT_LENGTH = 2000

export default function sanitizeComment(value: unknown): string {
    if (value === undefined) {
        return ''
    }

    if (typeof value !== 'string') {
        throw new BadRequestError('Комментарий должен быть строкой')
    }

    if (value.length > MAX_COMMENT_LENGTH) {
        throw new BadRequestError(
            'Комментарий не должен превышать 2000 символов'
        )
    }

    const cleanComment = sanitizeHtml(value, {
        allowedTags: [
            'p',
            'br',
            'div',
            'span',
            'a',
            'b',
            'strong',
            'i',
            'em',
            'u',
            's',
            'ul',
            'ol',
            'li',
        ],
        allowedAttributes: {
            a: ['href'],
        },
        allowedSchemes: ['http', 'https'],
        allowProtocolRelative: false,
        disallowedTagsMode: 'discard',
    })

    if (cleanComment.length > MAX_COMMENT_LENGTH) {
        throw new BadRequestError(
            'Комментарий после обработки превышает 2000 символов'
        )
    }

    return cleanComment
}
