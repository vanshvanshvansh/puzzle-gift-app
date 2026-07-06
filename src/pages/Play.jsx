import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PuzzleBoard from '../components/PuzzleBoard.jsx'
import ReferencePanel from '../components/ReferencePanel.jsx'
import LetterFlow from '../components/LetterFlow.jsx'
import ThemedBackground from '../components/ThemedBackground.jsx'
import { shuffleBoard, tryMove, isSolved, sliceImage } from '../lib/puzzle.js'
import { getPuzzleByShareToken, getPuzzleByOwnerToken, updatePuzzleByToken } from '../lib/db.js'

export default function Play({ mode }) {
  const navigate = useNavigate()
  const { shareToken, ownerToken } = useParams()
  const token = mode === 'owner' ? ownerToken : shareToken
  const tokenField = mode === 'owner' ? 'owner_token' : 'share_token'

  const [puzzle, setPuzzle] = useState(null)
  const [tiles, setTiles] = useState(null)
  const [board, setBoard] = useState(null)
  const [phase, setPhase] = useState('loading') // loading | idle | countdown | playing | solved | given_up | expired | notfound
  const [countdown, setCountdown] = useState(3)
  const [elapsed, setElapsed] = useState(0)
  const [copyLabel, setCopyLabel] = useState('Share Link')
  const [confirmGiveUp, setConfirmGiveUp] = useState(false)

  const timerRef = useRef(null)
  const broadcastTimeout = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        const row = mode === 'owner' ? await getPuzzleByOwnerToken(token) : await getPuzzleByShareToken(token)
        if (!row) {
          setPhase('notfound')
          return
        }
        if (new Date(row.expires_at) < new Date()) {
          setPhase('expired')
          return
        }
        setPuzzle(row)
        const sliced = await sliceImage(row.image_url, row.grid_size)
        setTiles(sliced)
        if (mode === 'owner') {
          // The owner's own playthrough is a private, independent session —
          // it should never be locked out just because the recipient (whose
          // progress lives in the same DB row) has already finished or given up.
          setPhase('idle')
        } else {
          setPhase(row.status === 'completed' ? 'solved' : row.status === 'given_up' ? 'given_up' : 'idle')
        }
      } catch (e) {
        console.error(e)
        setPhase('notfound')
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (phase === 'playing') {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
      return () => clearInterval(timerRef.current)
    }
  }, [phase])

  // Only the RECIPIENT's session is ever broadcast to the DB / Watch view.
  // The owner playing their own copy is a private local session — it must
  // never overwrite the shared current_piece_state, or Watch would show
  // the wrong game and moves would look "invisible".
  const isTracked = mode === 'recipient'

  async function handleStart() {
    setPhase('countdown')
    let c = 3
    setCountdown(c)
    const iv = setInterval(() => {
      c -= 1
      setCountdown(c)
      if (c <= 0) {
        clearInterval(iv)
        const fresh = shuffleBoard(puzzle.grid_size)
        setBoard(fresh)
        setElapsed(0)
        setPhase('playing')
        if (isTracked) {
          updatePuzzleByToken(tokenField, token, {
            status: 'in_progress',
            started_at: new Date().toISOString(),
            current_piece_state: fresh,
          }).catch(console.error)
        }
      }
    }, 700)
  }

  function handlePieceClick(index) {
    if (phase !== 'playing') return
    const next = tryMove(board, index, puzzle.grid_size)
    if (next === board) return
    setBoard(next)

    if (isTracked) {
      clearTimeout(broadcastTimeout.current)
      broadcastTimeout.current = setTimeout(() => {
        updatePuzzleByToken(tokenField, token, { current_piece_state: next }).catch(console.error)
      }, 300)
    }

    if (isSolved(next)) {
      finishSolved(next)
    }
  }

  async function finishSolved(finalBoard) {
    clearInterval(timerRef.current)
    setPhase('solved')
    if (!isTracked) return
    const payload = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      score_seconds: elapsed,
      current_piece_state: finalBoard,
    }
    try {
      const updated = await updatePuzzleByToken(tokenField, token, payload)
      setPuzzle(updated)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleGiveUp() {
    setConfirmGiveUp(false)
    if (isTracked) {
      try {
        await updatePuzzleByToken(tokenField, token, { status: 'given_up' })
      } catch (e) {
        console.error(e)
      }
    }
    setPhase('given_up')
    setTimeout(() => navigate(mode === 'owner' ? '/dashboard' : '/'), 1200)
  }

  async function handleShare() {
    const url = `${window.location.origin}/play/${puzzle.share_token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopyLabel('Link copied!')
      setTimeout(() => setCopyLabel('Share Link'), 2000)
    } catch {
      window.prompt('Copy this link:', url)
    }
  }

  async function handleSendLetter(text) {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    // Best-effort snapshot: reuse the reference image itself as the "completed image".
    const letter_image_url = puzzle.image_url
    await updatePuzzleByToken(tokenField, token, { letter_text: text, letter_image_url })
  }

  if (phase === 'loading') return <CenterMsg>Loading your puzzle…</CenterMsg>
  if (phase === 'notfound') return <CenterMsg>This puzzle link doesn't exist.</CenterMsg>
  if (phase === 'expired')
    return (
      <CenterMsg>
        This puzzle has expired.
        <br />
        <span className="text-white/50 text-sm">Photos and links are permanently removed after their time window.</span>
      </CenterMsg>
    )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 gap-6 relative">
      <ThemedBackground theme={puzzle?.theme_category} />
      <button
        onClick={() => navigate(mode === 'owner' ? '/dashboard' : '/')}
        className="focus-ring btn-ghost absolute top-6 left-6 px-4 py-2 rounded-xl text-sm"
      >
        ← Back
      </button>

      {puzzle && (
        <h1 className="font-display text-xl md:text-2xl text-center text-pink-200">
          {puzzle.challenge_label}
        </h1>
      )}

      {(phase === 'playing' || phase === 'idle' || phase === 'countdown') && puzzle && (
        <div className="text-sm text-white/60">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</div>
      )}

      <div className="flex flex-col md:flex-row items-center gap-6">
        {board && phase === 'playing' && puzzle && (
          <ReferencePanel imageUrl={puzzle.image_url} gridSize={puzzle.grid_size} />
        )}

        <div className={phase === 'idle' || phase === 'countdown' ? 'blur-md scale-95 opacity-70' : ''}>
          {puzzle && (
            <PuzzleBoard
              board={board || Array.from({ length: puzzle.grid_size * puzzle.grid_size }, (_, i) => i)}
              tiles={tiles || []}
              gridSize={puzzle.grid_size}
              interactive={phase === 'playing'}
              onPieceClick={handlePieceClick}
            />
          )}
        </div>
      </div>

      {phase === 'countdown' && (
        <div className="font-display text-6xl">{countdown > 0 ? countdown : 'Go!'}</div>
      )}

      {phase === 'idle' && (
        <div className="flex gap-3">
          <button onClick={handleStart} className="focus-ring btn-primary px-6 py-3 rounded-2xl">
            Start Game
          </button>
          {mode === 'owner' && (
            <button onClick={handleShare} className="focus-ring btn-ghost px-6 py-3 rounded-2xl">
              {copyLabel}
            </button>
          )}
        </div>
      )}

      {phase === 'playing' && (
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={handleStart}
            className="focus-ring btn-ghost px-5 py-2 rounded-xl text-sm text-white/70"
          >
            Restart (new shuffle)
          </button>
          <button
            onClick={() => setConfirmGiveUp(true)}
            className="focus-ring btn-ghost px-5 py-2 rounded-xl text-sm text-white/70"
          >
            Give Up
          </button>
          {mode === 'owner' && (
            <button
              onClick={handleShare}
              className="focus-ring btn-ghost px-5 py-2 rounded-xl text-sm text-white/70"
            >
              {copyLabel === 'Share Link' ? 'Share This Puzzle' : copyLabel}
            </button>
          )}
        </div>
      )}

      {phase === 'solved' && puzzle && (
        <div className="flex flex-col items-center gap-4">
          <p className="font-display text-2xl text-pink-200">
            Completed in {Math.floor((puzzle.score_seconds ?? elapsed) / 60)}m {(puzzle.score_seconds ?? elapsed) % 60}s 🎉
          </p>
          {mode === 'recipient' && !puzzle.letter_text && (
            <LetterFlow puzzle={puzzle} onSend={handleSendLetter} />
          )}
          {mode === 'owner' && (
            <button onClick={() => navigate('/dashboard')} className="focus-ring btn-ghost px-5 py-2.5 rounded-xl text-sm">
              Back to Dashboard
            </button>
          )}
        </div>
      )}

      {phase === 'given_up' && <p className="text-white/60">Alright — heading back…</p>}

      {confirmGiveUp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="card rounded-2xl p-6 max-w-sm w-full text-center">
            <p className="mb-4">Are you sure you want to give up?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmGiveUp(false)} className="focus-ring btn-ghost px-4 py-2 rounded-xl text-sm">
                Keep Playing
              </button>
              <button onClick={handleGiveUp} className="focus-ring btn-primary px-4 py-2 rounded-xl text-sm">
                Give Up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CenterMsg({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center text-lg text-white/80">
      {children}
    </div>
  )
}
