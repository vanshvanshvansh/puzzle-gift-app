import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOwnedPuzzles, removeOwnedPuzzle } from '../lib/localStore.js'
import { getPuzzleByOwnerToken, deletePuzzle } from '../lib/db.js'
import { THEMES } from '../lib/themes.js'
import ThemedBackground from '../components/ThemedBackground.jsx'

export default function Dashboard() {
  const navigate = useNavigate()
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadCards() {
    const owned = getOwnedPuzzles()
    const results = await Promise.all(
      owned.map(async (p) => {
        try {
          const row = await getPuzzleByOwnerToken(p.owner_token)
          if (!row) return { ...p, expired: true }
          return row
        } catch {
          return { ...p, expired: true }
        }
      })
    )
    results.forEach((r) => {
      if (r.expired) removeOwnedPuzzle(r.owner_token)
    })
    setCards(results.filter((r) => !r.expired))
    setLoading(false)
  }

  useEffect(() => {
    loadCards()
    // Poll every 4s so status (pending -> in_progress -> completed) and the
    // Watch Live button stay up to date without needing a manual page reload.
    const id = setInterval(loadCards, 4000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="min-h-screen px-6 py-10 flex flex-col items-center relative">
      <ThemedBackground theme={null} />
      <div className="w-full max-w-2xl flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl">My Puzzles</h1>
        <div className="flex gap-2">
          <button onClick={loadCards} className="focus-ring btn-ghost px-4 py-2 rounded-xl text-sm">
            Refresh
          </button>
          <button onClick={() => navigate('/')} className="focus-ring btn-ghost px-4 py-2 rounded-xl text-sm">
            Home
          </button>
        </div>
      </div>

      {loading && <p className="text-white/60">Loading…</p>}
      {!loading && cards.length === 0 && (
        <div className="text-center text-white/60 flex flex-col gap-4 items-center">
          <p>No puzzles yet. Create one and it'll show up here.</p>
          <button onClick={() => navigate('/create')} className="focus-ring btn-primary px-6 py-3 rounded-2xl">
            Create a Puzzle
          </button>
        </div>
      )}

      <div className="w-full max-w-2xl flex flex-col gap-4">
        {cards.map((row) => (
          <PuzzleCard key={row.owner_token} row={row} navigate={navigate} onRemoved={loadCards} />
        ))}
      </div>
    </div>
  )
}

function PuzzleCard({ row, navigate, onRemoved }) {
  const isExpired = new Date(row.expires_at) < new Date()
  const expiresIn = Math.max(0, new Date(row.expires_at) - new Date())
  const mins = Math.floor(expiresIn / 60000)
  const [copyLabel, setCopyLabel] = useState('Copy Share Link')
  const [removing, setRemoving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function copyLink() {
    const url = `${window.location.origin}/play/${row.share_token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopyLabel('Copied!')
      setTimeout(() => setCopyLabel('Copy Share Link'), 2000)
    } catch {
      window.prompt('Copy this link:', url)
    }
  }

  async function handleRemove() {
    setConfirmDelete(false)
    setRemoving(true)
    try {
      await deletePuzzle(row)
    } catch (e) {
      console.error(e)
    }
    removeOwnedPuzzle(row.owner_token)
    onRemoved()
  }

  return (
    <div className="card rounded-2xl p-5 flex items-center justify-between gap-4">
      <div>
        <p className="font-display text-lg">{THEMES[row.theme_category]?.label || row.theme_category} · {row.grid_size}×{row.grid_size}</p>
        <p className="text-xs text-white/50">
          Created {new Date(row.created_at).toLocaleString()} ·{' '}
          {isExpired ? 'Expired' : `Expires in ${mins} min`}
        </p>
        <p className="text-sm mt-1">
          {isExpired && 'This link no longer works — you can remove it from your list.'}
          {!isExpired && row.status === 'pending' && 'Waiting for them to open the link you send.'}
          {!isExpired && row.status === 'in_progress' && 'They are playing right now — tap Watch Live to see their moves.'}
          {!isExpired && row.status === 'completed' && `They completed it in ${Math.floor(row.score_seconds / 60)}m ${row.score_seconds % 60}s`}
          {!isExpired && row.status === 'given_up' && 'They gave up on this one.'}
        </p>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        {isExpired ? (
          <button
            onClick={handleRemove}
            disabled={removing}
            className="focus-ring btn-ghost px-4 py-2 rounded-xl text-sm text-red-300"
          >
            {removing ? 'Removing…' : 'Remove'}
          </button>
        ) : (
          <>
            {(row.status === 'in_progress' || row.status === 'completed') && (
              <button
                onClick={() => navigate(`/dashboard/watch/${row.owner_token}`)}
                className="focus-ring btn-primary px-4 py-2 rounded-xl text-sm"
              >
                {row.status === 'in_progress' ? 'Watch Live' : 'View Final Board'}
              </button>
            )}
            <button onClick={copyLink} className="focus-ring btn-ghost px-4 py-2 rounded-xl text-sm">
              {copyLabel}
            </button>
            <button
              onClick={() => navigate(`/own/${row.owner_token}`)}
              className="focus-ring btn-ghost px-4 py-2 rounded-xl text-sm"
            >
              Try It Yourself
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="focus-ring text-xs text-white/40 hover:text-red-300 underline"
            >
              Delete
            </button>
          </>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setConfirmDelete(false)}>
          <div className="card rounded-2xl p-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4">Delete this puzzle and its link permanently?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDelete(false)} className="focus-ring btn-ghost px-4 py-2 rounded-xl text-sm">
                Cancel
              </button>
              <button onClick={handleRemove} disabled={removing} className="focus-ring btn-primary px-4 py-2 rounded-xl text-sm">
                {removing ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
