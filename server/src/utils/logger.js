import { createRequire } from 'module'

const require = createRequire(import.meta.url)
void require

const isDev = process.env.NODE_ENV !== 'production'

export const logger = {
  info: (...args) => isDev && console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => isDev && console.log('[DEBUG]', ...args),
}
