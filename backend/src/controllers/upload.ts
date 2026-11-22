import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import { readFile, writeFile, unlink } from 'fs/promises'
import sharp from 'sharp'
import BadRequestError from '../errors/bad-request-error'

const MAX_INPUT_PIXELS = 16_000_000
const MAX_FILE_SIZE = 5 * 1024 * 1024

async function validateImage(input: Buffer, mimeType: string): Promise<Buffer> {
    try {
        const image = sharp(input, {
            limitInputPixels: MAX_INPUT_PIXELS,
            failOn: 'warning',
        })

        const metadata = await image.metadata()

        const matchesFormat =
            (metadata.format === 'png' && mimeType === 'image/png') ||
            (metadata.format === 'jpeg' &&
                ['image/jpeg', 'image/jpg'].includes(mimeType)) ||
            (metadata.format === 'gif' && mimeType === 'image/gif')

        if (!matchesFormat) {
            throw new BadRequestError(
                'Содержимое файла не соответствует разрешённому типу изображения'
            )
        }

        if (
            !metadata.width ||
            !metadata.height ||
            metadata.width * metadata.height > MAX_INPUT_PIXELS
        ) {
            throw new BadRequestError(
                'Изображение не должно превышать 16 миллионов пикселей'
            )
        }

        if ((metadata.pages ?? 1) > 1) {
            throw new BadRequestError(
                'Анимированные изображения пока не поддерживаются'
            )
        }

        let output: Buffer

        if (metadata.format === 'png') {
            output = await image.png().toBuffer()
        } else if (metadata.format === 'jpeg') {
            output = await image.jpeg().toBuffer()
        } else {
            output = await image.gif().toBuffer()
        }

        if (output.length > MAX_FILE_SIZE) {
            throw new BadRequestError(
                'Размер обработанного изображения превышает 5 МиБ'
            )
        }

        return output
    } catch (error) {
        if (error instanceof BadRequestError) {
            throw error
        }

        throw new BadRequestError(
            'Не удалось обработать изображение: файл повреждён или имеет недопустимые параметры'
        )
    }
}

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const file = req.file

    if (!file) {
        return next(new BadRequestError('Файл не загружен'))
    }

    try {
        const input = await readFile(file.path)
        const output = await validateImage(input, file.mimetype)

        await writeFile(file.path, Uint8Array.from(output))

        const fileName = process.env.UPLOAD_PATH
            ? `/${process.env.UPLOAD_PATH}/${file.filename}`
            : `/${file.filename}`

        return res.status(constants.HTTP_STATUS_CREATED).send({
            fileName,
            originalName: file.originalname,
        })
    } catch (error) {
        try {
            await unlink(file.path)
        } catch (cleanupError) {
            return next(cleanupError)
        }

        return next(error)
    }
}

export default {}
