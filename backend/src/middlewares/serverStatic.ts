import express from 'express'
import path from 'path'

export default function serveStatic(baseDir: string) {
    return express.static(path.resolve(baseDir), {
        dotfiles: 'deny',
        index: false,
        redirect: false,
        fallthrough: true,
    })
}
