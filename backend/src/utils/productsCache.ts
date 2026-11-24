const CACHE_TTL_MS = 30 * 1000
const MAX_CACHE_ENTRIES = 100

type CacheEntry = {
    body: string
    expiresAt: number
}

const cache = new Map<string, CacheEntry>()

// Версия меняется при очистке.

let cacheVersion = 0

export const getProductsCacheVersion = (): number => cacheVersion

export const getCachedProducts = (key: string): string | undefined => {
    const entry = cache.get(key)

    if (!entry) {
        return undefined
    }

    if (entry.expiresAt <= Date.now()) {
        cache.delete(key)
        return undefined
    }

    return entry.body
}

export const setCachedProducts = (
    key: string,
    body: string,
    requestVersion: number
): void => {
    if (requestVersion !== cacheVersion) {
        return
    }

    const now = Date.now()

    // Освобождаем место от просроченных записей.
    cache.forEach((entry, entryKey) => {
        if (entry.expiresAt <= now) {
            cache.delete(entryKey)
        }
    })

    cache.delete(key)

    if (cache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = cache.keys().next().value

        if (oldestKey !== undefined) {
            cache.delete(oldestKey)
        }
    }

    cache.set(key, {
        body,
        expiresAt: now + CACHE_TTL_MS,
    })
}

export const clearProductsCache = (): void => {
    cacheVersion += 1
    cache.clear()
}
