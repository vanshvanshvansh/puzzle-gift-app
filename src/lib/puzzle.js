// Core sliding-puzzle logic: grid indices, shuffle, move validation.
// Board is represented as an array of length n*n where board[i] = piece id
// currently sitting in cell i. The "empty" slot is piece id (n*n - 1).

export function makeSolvedBoard(n) {
  const total = n * n
  return Array.from({ length: total }, (_, i) => i)
}

function isSolvable(board, n) {
  // Standard 15-puzzle solvability check (inversions + blank row parity)
  const total = n * n
  const blankValue = total - 1
  const arr = board.filter((v) => v !== blankValue)
  let inversions = 0
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] > arr[j]) inversions++
    }
  }
  const blankIndex = board.indexOf(blankValue)
  const blankRowFromBottom = n - Math.floor(blankIndex / n)

  if (n % 2 === 1) {
    return inversions % 2 === 0
  } else {
    if (blankRowFromBottom % 2 === 0) return inversions % 2 === 1
    return inversions % 2 === 0
  }
}

function randomPermutation(n) {
  const total = n * n
  const arr = Array.from({ length: total }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Produces a fresh shuffled, solvable, non-trivial board.
export function shuffleBoard(n) {
  const blankValue = n * n - 1
  let board
  do {
    board = randomPermutation(n)
  } while (!isSolvable(board, n) || isSolved(board))
  return board
}

export function isSolved(board) {
  return board.every((v, i) => v === i)
}

export function neighbors(index, n) {
  const row = Math.floor(index / n)
  const col = index % n
  const list = []
  if (row > 0) list.push(index - n)
  if (row < n - 1) list.push(index + n)
  if (col > 0) list.push(index - 1)
  if (col < n - 1) list.push(index + 1)
  return list
}

// Attempts to move the piece at `index` into the blank slot, if adjacent.
// Returns a new board array, or the same array if the move is illegal.
export function tryMove(board, index, n) {
  const blankValue = n * n - 1
  const blankIndex = board.indexOf(blankValue)
  if (!neighbors(index, n).includes(blankIndex)) return board
  const next = board.slice()
  ;[next[index], next[blankIndex]] = [next[blankIndex], next[index]]
  return next
}

// Crops+slices a source image (already square-cropped) into n*n square
// tile data URLs, in row-major "piece id" order matching makeSolvedBoard.
export async function sliceImage(imageUrl, n) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const size = Math.min(img.width, img.height)
      const tileSrc = size / n
      const tiles = []
      for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
          const canvas = document.createElement('canvas')
          canvas.width = 512 / n
          canvas.height = 512 / n
          const ctx = canvas.getContext('2d')
          ctx.drawImage(
            img,
            col * tileSrc,
            row * tileSrc,
            tileSrc,
            tileSrc,
            0,
            0,
            canvas.width,
            canvas.height
          )
          tiles.push(canvas.toDataURL('image/jpeg', 0.85))
        }
      }
      resolve(tiles)
    }
    img.onerror = reject
    img.src = imageUrl
  })
}
