import { useEffect, useState } from 'react'
import PuzzleBoard from './PuzzleBoard.jsx'
import { sliceImage } from '../lib/puzzle.js'
import { getPuzzleByOwnerToken, subscribeToPuzzle } from '../lib/db.js'

// Overlay, read-only live view of the recipient's board via Supabase Realtime.
// Unlike Watch.jsx (a full page reached by navigating away), this renders on
// top of the owner's own Play screen without touching that screen's state —
// closing it just unmounts this panel and the owner's game underneath is
// exactly as they left it.
export default function LiveWatchPanel({ ownerToken, onClose }) {
  const [puzzle, setPuzzle] = useState(null)
  const [tiles, setTiles] = useState(null)
  const [board, setBoard] = useState(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    let unsubscribe
    let pollId
    let cancelled = false
    async function load() {
      const row = await getPuzzleByOwnerToken(ownerToken)
      if (!row || cancelled) return
      setPuzzle(row)
      setBoard(row.current_piece_state || null)
      const sliced = await sliceImage(row.image_url, row.grid_size)
      if (cancelled) return
      setTiles(sliced)

      // Primary: instant updates via Supabase Realtime (when it's working).
      unsubscribe = subscribeToPuzzle(ownerToken, (updated) => {
        setPuzzle(updated)
        setBoard(updated.current_piece_state)
      })

      // Backup: poll every 1.5s regardless, so watching stays live even if
      // Realtime is unavailable, blocked by a network, or drops silently.
      pollId = setInterval(async () => {
        try {
          const fresh = await getPuzzleByOwnerToken(ownerToken)
          if (!fresh || cancelled) return
          setPuzzle(fresh)
          setBoard(fresh.current_piece_state || null)
        } catch {
          // transient — next poll will retry
        }
      }, 1500)
    }
    load()
    return () => {
      cancelled = true
      unsubscribe && unsubscribe()
      pollId && clearInterval(pollId)
    }
  }, [ownerToken])

  useEffect(() => {
    if (!puzzle?.started_at || puzzle.status === 'completed') return
    const startedAt = new Date(puzzle.started_at).getTime()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [puzzle?.started_at, puzzle?.status])

  const displaySeconds = puzzle?.status === 'completed' ? puzzle.score_seconds ?? 0 : elapsed

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="card rounded-2xl p-6 max-w-lg w-full flex flex-col items-center gap-4 relative">
        <button
          onClick={onClose}
          aria-label="Close live watching"
          className="focus-ring btn-ghost absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-lg"
        >
          ✕
        </button>

        <h2 className="font-display text-xl text-pink-200">Watching live</h2>
        <p className="text-sm text-white/50 -mt-2">Read-only — your own puzzle keeps running behind this.</p>

        {!puzzle && <p className="text-white/60 py-8">Loading…</p>}

        {puzzle && (
          <>
            {puzzle.started_at && (
              <div className="text-sm text-white/60">
                {Math.floor(displaySeconds / 60)}:{String(displaySeconds % 60).padStart(2, '0')}
                {puzzle.status === 'completed' && ' (final)'}
              </div>
            )}

            {board ? (
              <PuzzleBoard board={board} tiles={tiles || []} gridSize={puzzle.grid_size} interactive={false} />
            ) : (
              <p className="text-white/60 py-8">Waiting for them to start…</p>
            )}
          </>
        )}

        <button onClick={onClose} className="focus-ring btn-primary px-5 py-2.5 rounded-xl text-sm mt-2">
          Close & Back to My Puzzle
        </button>
      </div>
    </div>
  )
}
