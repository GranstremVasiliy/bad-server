import { resolve, sep } from 'path'

export const TEMP_UPLOAD_DIR = resolve(__dirname, '../../upload-temp')

const publicRoot = resolve(__dirname, '../public')

export const PUBLIC_UPLOAD_DIR = resolve(
    publicRoot,
    process.env.UPLOAD_PATH || ''
)

if (
    PUBLIC_UPLOAD_DIR !== publicRoot &&
    !PUBLIC_UPLOAD_DIR.startsWith(`${publicRoot}${sep}`)
) {
    throw new Error('UPLOAD_PATH должен указывать на каталог внутри public')
}
