import { Router } from 'express'
import { MulterError } from 'multer'
import { uploadFile } from '../controllers/upload'
import fileMiddleware from '../middlewares/file'
import BadRequestError from '../errors/bad-request-error'

const uploadRouter = Router()

const uploadSingleFile = fileMiddleware.single('file')

uploadRouter.post(
    '/',
    (req, res, next) => {
        uploadSingleFile(req, res, (error: unknown) => {
            if (error instanceof MulterError) {
                if (error.code === 'LIMIT_FILE_SIZE') {
                    return next(
                        new BadRequestError(
                            'Размер файла не должен превышать 5 МиБ'
                        )
                    )
                }

                return next(
                    new BadRequestError(
                        'Разрешён один файл в поле "file" без дополнительных полей'
                    )
                )
            }

            if (error) {
                return next(error)
            }

            return next()
        })
    },
    uploadFile
)

export default uploadRouter
