// 사용자 혼용을 막기 위한 식별자 비교입니다. JWT 서명·권한 검증은 서버가 담당합니다.
export function getAccessTokenSubject(token: unknown): string | null {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3 || parts.some((part) => !part)) return null

  try {
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')), (char) => char.charCodeAt(0))
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes))
    if (!payload || typeof payload !== 'object') return null
    const claims = payload as Record<string, unknown>
    return claims.type === 'access' && typeof claims.sub === 'string' && /^[1-9]\d*$/.test(claims.sub)
      ? claims.sub
      : null
  } catch {
    return null
  }
}
