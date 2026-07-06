import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PuzzleBoard from '../components/PuzzleBoard.jsx'
import ThemedBackground from '../components/ThemedBackground.jsx'
import { sliceImage } from '../lib/puzzle.js'
import { getPuzzleByOwnerToken, subscribeToPuzzle } from '../lib/db.js'

// Read-only live view of the recipient's board via Supabase Realtime.
export default function Watch() {
  const { ownerToken } = useParams()
  const navigate = useNavigate()
  const [puzzle, setPuzzle] = useState(null)
  const [tiles, setTiles] = useState(null)
  const [board, setBoard] = useState(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    let unsubscribe
    async function load() {
      const row = await getPuzzleByOwnerToken(ownerToken)
      if (!row) return
      setPuzzle(row)
      setBoard(row.current_piece_state || null)
      const sliced = await sliceImage(row.image_url, row.grid_size)
      setTiles(sliced)
      unsubscribe = subscribeToPuzzle(ownerToken, (updated) => {
        setPuzzle(updated)
        setBoard(updated.current_piece_state)
      })
    }
    load()
    return () => unsubscribe && unsubscribe()
  }, [ownerToken])

  // Live-ticking timer sourced from started_at, matching what the solver sees.
  // Freezes on score_seconds once the puzzle is completed.
  useEffect(() => {
    if (!puzzle?.started_at || puzzle.status === 'completed') return
    const startedAt = new Date(puzzle.started_at).getTime()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [puzzle?.started_at, puzzle?.status])

  if (!puzzle) return <div className="min-h-screen flex items-center justify-center">Loading…</div>

  const displaySeconds = puzzle.status === 'completed' ? puzzle.score_seconds ?? 0 : elapsed

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 py-10 relative">
      <ThemedBackground theme={puzzle.theme_category} />
      <h1 className="font-display text-xl text-pink-200">Watching live</h1>
      <p className="text-sm text-white/50">You're watching only — this view can't move any pieces.</p>

      {puzzle.started_at && (
        <div className="text-sm text-white/60">
          {Math.floor(displaySeconds / 60)}:{String(displaySeconds % 60).padStart(2, '0')}
          {puzzle.status === 'completed' && ' (final)'}
        </div>
      )}

      {board ? (
        <PuzzleBoard board={board} tiles={tiles || []} gridSize={puzzle.grid_size} interactive={false} />
      ) : (
        <p className="text-white/60">Waiting for them to start…</p>
      )}
      <button onClick={() => navigate('/dashboard')} className="focus-ring btn-ghost px-5 py-2.5 rounded-xl text-sm">
        Back to Dashboard
      </button>
    </div>
  )
}
