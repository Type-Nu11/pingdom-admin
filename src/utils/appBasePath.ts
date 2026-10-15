/** Only same-origin absolute directory paths can be a browser-router basename. */
export function normalizeAppBasePath(value?: string): string {
  if (value === undefined || value === '') return '/'
  // Require a slash between segments so invalid input cannot trigger
  // exponential backtracking by repeatedly splitting one long segment.
  if (value !== '/' && !/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/?$/.test(value)) {
    throw new Error('VITE_APP_BASE_PATH must be an absolute directory path such as / or /operator/.')
  }
  const base = value.endsWith('/') ? value : `${value}/`
  if (['api', 'auth', 'swagger-ui', 'v3'].includes(base.split('/')[1].toLowerCase())) {
    throw new Error('VITE_APP_BASE_PATH must not overlap API or Swagger routes.')
  }
  return base
}

/** Strip exactly one deployment prefix at the browser boundary, never in stored targets. */
export function browserPathToAppPath(value: string, base: string): string | null {
  if (!value.startsWith('/') || value.startsWith('//') || /[\\\s]/u.test(value) || [...value].some(char => char.charCodeAt(0) < 32)) return null
  const normalized = normalizeAppBasePath(base)
  if (normalized === '/') return value
  const pathname = value.split(/[?#]/u, 1)[0]
  if (pathname === normalized.slice(0, -1)) return `/${value.slice(pathname.length)}`
  return value.startsWith(normalized) ? `/${value.slice(normalized.length)}` : null
}
