import { constants } from 'fs'
import { copyFile, mkdir, unlink } from 'fs/promises'
import { basename, join } from 'path'
import BadRequestError from '../errors/bad-request-error'

async function movingFile(
    imagePath: string,
    from: string,
    to: string
): Promise<void> {
    if (typeof imagePath !== 'string' || !imagePath.trim()) {
        throw new BadRequestError('Не указан путь изображения')
    }

    const fileName = basename(imagePath)

    if (
        !fileName ||
        fileName === '.' ||
        fileName === '..' ||
        fileName.includes('\\')
    ) {
        throw new BadRequestError('Некорректное имя изображения')
    }

    const sourcePath = join(from, fileName)
    const destinationPath = join(to, fileName)

    await mkdir(to, { recursive: true })

    try {
        await copyFile(sourcePath, destinationPath, constants.COPYFILE_EXCL)
    } catch (error) {
        const { code } = error as NodeJS.ErrnoException

        if (code === 'ENOENT') {
            throw new BadRequestError(
                'Загруженный файл не найден. Загрузите изображение повторно'
            )
        }

        if (code === 'EEXIST') {
            throw new BadRequestError('Файл с таким именем уже сохранён')
        }

        throw error
    }

    await unlink(sourcePath)
}

export default movingFile
