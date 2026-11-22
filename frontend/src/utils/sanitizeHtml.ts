import DOMPurify from 'dompurify'

export default function sanitizeHtml(value: string): string {
    return DOMPurify.sanitize(value, {
        ALLOWED_TAGS: [
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
        ALLOWED_ATTR: ['href'],
        ALLOW_DATA_ATTR: false,
        ALLOW_ARIA_ATTR: false,
    })
}