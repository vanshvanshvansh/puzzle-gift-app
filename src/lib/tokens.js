// High-entropy, URL-safe random tokens. Uses crypto.getRandomValues so
// share_token cannot be brute-forced or used to derive owner_token.
export function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
