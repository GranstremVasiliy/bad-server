import { randomUUID } from 'crypto'
import { mkdir } from 'fs'
import { TEMP_UPLOAD_DIR } from '../utils/uploadPaths'
import multer from 'multer'
import BadRequestError from '../errors/bad-request-error'

const MAX_FILE_SIZE = 5 * 1024 * 1024

const allowedTypes = new Map<string, string>([
    ['image/png', '.png'],
    ['image/jpeg', '.jpg'],
    ['image/jpg', '.jpg'],
    ['image/gif', '.gif'],
])

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        mkdir(TEMP_UPLOAD_DIR, { recursive: true }, (error) => {
            cb(error, TEMP_UPLOAD_DIR)
        })
    },

    filename: (_req, file, cb) => {
        const extension = allowedTypes.get(file.mimetype)

        if (!extension) {
            return cb(
                new BadRequestError(
                    'Разрешены только изображения PNG, JPEG и GIF'
                ),
                ''
            )
        }

        return cb(null, `${randomUUID()}${extension}`)
    },
})

const fileMiddleware = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
        fields: 0,
        parts: 2,
        fieldNameSize: 100,
    },
    fileFilter: (_req, file, cb) => {
        if (!allowedTypes.has(file.mimetype)) {
            return cb(
                new BadRequestError(
                    'Разрешены только изображения PNG, JPEG и GIF'
                )
            )
        }

        return cb(null, true)
    },
})

export default fileMiddleware
