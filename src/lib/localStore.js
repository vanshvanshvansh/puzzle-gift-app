// Owner-side puzzle list persisted in localStorage.
// Stores owner_token + light metadata only.
const KEY = 'puzzlegift_owned_puzzles'

export function getOwnedPuzzles() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addOwnedPuzzle(entry) {
  const list = getOwnedPuzzles()
  list.unshift(entry) // newest first
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function removeOwnedPuzzle(owner_token) {
  const list = getOwnedPuzzles().filter((p) => p.owner_token !== owner_token)
  localStorage.setItem(KEY, JSON.stringify(list))
}
