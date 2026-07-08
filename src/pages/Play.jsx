import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PuzzleBoard from '../components/PuzzleBoard.jsx'
import ReferencePanel from '../components/ReferencePanel.jsx'
import LetterFlow from '../components/LetterFlow.jsx'
import ThemedBackground from '../components/ThemedBackground.jsx'
import LiveWatchPanel from '../components/LiveWatchPanel.jsx'
import { shuffleBoard, tryMove, isSolved, sliceImage } from '../lib/puzzle.js'
import { getPuzzleByShareToken, getPuzzleByOwnerToken, updatePuzzleByToken } from '../lib/db.js'

const EMPTY_SESSION = {
  puzzle: null,
  tiles: null,
  board: null,
  phase: 'loading',
  countdown: 3,
  elapsed: 0,
  copyLabel: 'Share Link',
}

async function sliceImageWithRetry(imageUrl, gridSize, attempts = 3) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      return await sliceImage(imageUrl, gridSize)
    } catch (e) {
      lastErr = e
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  throw lastErr
}

export default function Play({ mode }) {
  const navigate = useNavigate()
  const { shareToken, ownerToken } = useParams()
  const token = mode === 'owner' ? ownerToken : shareToken
  const tokenField = mode === 'owner' ? 'owner_token' : 'share_token'

  const [own, setOwn] = useState({ ...EMPTY_SESSION })
  const [guest, setGuest] = useState(null)
  const [viewingGuest, setViewingGuest] = useState(false)

  const [confirmGiveUp, setConfirmGiveUp] = useState(false)
  const [showWatch, setShowWatch] = useState(false)
  const [pasteStatus, setPasteStatus] = useState('idle')

  const timerRef = useRef(null)
  const broadcastTimeout = useRef(null)

  const active = viewingGuest && guest ? guest : own
  const setActive = viewingGuest && guest ? setGuest : setOwn
  const activeToken = viewingGuest && guest ? guest.puzzle.share_token : token
  const activeTokenField = viewingGuest && guest ? 'share_token' : tokenField
  const isTracked = (viewingGuest && guest) || mode === 'recipient'

  useEffect(() => {
    async function load() {
      try {
        const row = mode === 'owner' ? await getPuzzleByOwnerToken(token) : await getPuzzleByShareToken(token)
        if (!row) {
          setOwn((s) => ({ ...s, phase: 'notfound' }))
          return
        }
        if (new Date(row.expires_at) < new Date()) {
          setOwn((s) => ({ ...s, phase: 'expired' }))
          return
        }
        const sliced = await sliceImageWithRetry(row.image_url, row.grid_size)
        const phase =
          mode === 'owner'
            ? 'idle'
            : row.status === 'completed'
            ? 'solved'
            : row.status === 'given_up'
            ? 'given_up'
            : 'idle'
        setOwn({ ...EMPTY_SESSION, puzzle: row, tiles: sliced, phase })
      } catch (e) {
        console.error(e)
        setOwn((s) => ({ ...s, phase: 'notfound' }))
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (active.phase === 'playing') {
      timerRef.current = setInterval(() => {
        setActive((s) => ({ ...s, elapsed: s.elapsed + 1 }))
      }, 1000)
      return () => clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.phase, viewingGuest])

  async function handlePasteLink() {
    setPasteStatus('checking')

    let text
    try {
      text = await navigator.clipboard.readText()
    } catch (e) {
      console.error(e)
      setPasteStatus('network')
      setTimeout(() => setPasteStatus('idle'), 2500)
      return
    }

    const cleaned = text.trim()
    const playMatch = cleaned.match(/\/play\/([A-Za-z0-9_-]+)/)
    const ownMatch = cleaned.match(/\/own\/([A-Za-z0-9_-]+)/)

    if (!playMatch && !ownMatch) {
      setPasteStatus('invalid')
      setTimeout(() => setPasteStatus('idle'), 2500)
      return
    }

    let row
    try {
      row = playMatch
        ? await getPuzzleByShareToken(playMatch[1])
        : await getPuzzleByOwnerToken(ownMatch[1])
    } catch (e) {
      console.error(e)
      setPasteStatus('network')
      setTimeout(() => setPasteStatus('idle'), 2500)
      return
    }

    if (!row || new Date(row.expires_at) < new Date()) {
      setPasteStatus('invalid')
      setTimeout(() => setPasteStatus('idle'), 2500)
      return
    }

    try {
      const sliced = await sliceImageWithRetry(row.image_url, row.grid_size)
      const phase = row.status === 'completed' ? 'solved' : row.status === 'given_up' ? 'given_up' : 'idle'
      setGuest({ ...EMPTY_SESSION, puzzle: row, tiles: sliced, phase })
      setViewingGuest(true)
      setPasteStatus('idle')
    } catch (e) {
      console.error(e)
      setPasteStatus('network')
      setTimeout(() => setPasteStatus('idle'), 2500)
    }
  }

  async function handleStart() {
    setActive((s) => ({ ...s, phase: 'countdown' }))
    let c = 3
    setActive((s) => ({ ...s, countdown: c }))
    const iv = setInterval(() => {
      c -= 1
      setActive((s) => ({ ...s, countdown: c }))
      if (c <= 0) {
        clearInterval(iv)
        const fresh = shuffleBoard(active.puzzle.grid_size)
        setActive((s) => ({ ...s, board: fresh, elapsed: 0, phase: 'playing' }))
        if (isTracked) {
          updatePuzzleByToken(activeTokenField, activeToken, {
            status: 'in_progress',
            started_at: new Date().toISOString(),
            current_piece_state: fresh,
          }).catch(console.error)
        }
      }
    }, 700)
  }

  function handlePieceClick(index) {
    if (active.phase !== 'playing') return
    const next = tryMove(active.board, index, active.puzzle.grid_size)
    if (next === active.board) return
    setActive((s) => ({ ...s, board: next }))

    if (isTracked) {
      clearTimeout(broadcastTimeout.current)
      broadcastTimeout.current = setTimeout(() => {
        updatePuzzleByToken(activeTokenField, activeToken, { current_piece_state: next }).catch(console.error)
      }, 300)
    }

    if (isSolved(next)) {
      finishSolved(next)
    }
  }

  async function finishSolved(finalBoard) {
    clearInterval(timerRef.current)
    setActive((s) => ({ ...s, phase: 'solved' }))
    if (!isTracked) return
    const payload = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      score_seconds: active.elapsed,
      current_piece_state: finalBoard,
    }
    try {
      const updated = await updatePuzzleByToken(activeTokenField, activeToken, payload)
      setActive((s) => ({ ...s, puzzle: updated }))
    } catch (e) {
      console.error(e)
    }
  }

  async function handleGiveUp() {
    setConfirmGiveUp(false)
    if (isTracked) {
      try {
        await updatePuzzleByToken(activeTokenField, activeToken, { status: 'given_up' })
      } catch (e) {
        console.error(e)
      }
    }
    setActive((s) => ({ ...s, phase: 'given_up' }))
    setTimeout(() => {
      if (viewingGuest) {
        setViewingGuest(false)
        setGuest(null)
      } else {
        navigate(mode === 'owner' ? '/dashboard' : '/')
      }
    }, 1200)
  }

  async function handleShare() {
    const url = `${window.location.origin}/play/${own.puzzle.share_token}`
    try {
      await navigator.clipboard.writeText(url)
      setOwn((s) => ({ ...s, copyLabel: 'Link copied!' }))
      setTimeout(() => setOwn((s) => ({ ...s, copyLabel: 'Share Link' })), 2000)
    } catch {
      window.prompt('Copy this link:', url)
    }
  }

  async function handleSendLetter(text) {
    const letter_image_url = active.puzzle.image_url
    await updatePuzzleByToken(activeTokenField, activeToken, { letter_text: text, letter_image_url })
  }

  if (own.phase === 'loading') return <CenterMsg>Loading your puzzle…</CenterMsg>
  if (own.phase === 'notfound') return <CenterMsg>This puzzle link doesn't exist.</CenterMsg>
  if (own.phase === 'expired')
    return (
      <CenterMsg>
        This puzzle has expired.
        <br />
        <span className="text-white/50 text-sm">Photos and links are permanently removed after their time window.</span>
      </CenterMsg>
    )

  const pasteLabel =
    pasteStatus === 'invalid'
      ? 'Not a valid link'
      : pasteStatus === 'network'
      ? 'Slow connection — try again'
      : pasteStatus === 'checking'
      ? 'Checking…'
      : '📋 Paste Link'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 gap-6 relative">
      <ThemedBackground theme={active.puzzle?.theme_category} />
      <button
        onClick={() => navigate(mode === 'owner' ? '/dashboard' : '/')}
        className="focus-ring btn-ghost absolute top-6 left-6 px-4 py-2 rounded-xl text-sm"
      >
        ← Back
      </button>

      {active.puzzle && (
        <h1 className="font-display text-xl md:text-2xl text-center text-pink-200">
          {active.puzzle.challenge_label}
        </h1>
      )}
      {mode === 'owner' && viewingGuest && (
        <p className="text-xs text-white/40 -mt-4">Playing a puzzle you pasted in</p>
      )}

      {(active.phase === 'playing' || active.phase === 'idle' || active.phase === 'countdown') && active.puzzle && (
        <div className="text-sm text-white/60">
          {Math.floor(active.elapsed / 60)}:{String(active.elapsed % 60).padStart(2, '0')}
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center gap-6">
        {active.board && active.phase === 'playing' && active.puzzle && (
          <ReferencePanel imageUrl={active.puzzle.image_url} gridSize={active.puzzle.grid_size} />
        )}

        <div className={active.phase === 'idle' || active.phase === 'countdown' ? 'blur-md scale-95 opacity-70' : ''}>
          {active.puzzle && (
            <PuzzleBoard
              board={active.board || Array.from({ length: active.puzzle.grid_size * active.puzzle.grid_size }, (_, i) => i)}
              tiles={active.tiles || []}
              gridSize={active.puzzle.grid_size}
              interactive={active.phase === 'playing'}
              onPieceClick={handlePieceClick}
            />
          )}
        </div>
      </div>

      {active.phase === 'countdown' && (
        <div className="font-display text-6xl">{active.countdown > 0 ? active.countdown : 'Go!'}</div>
      )}

      {active.phase === 'idle' && (
        <button onClick={handleStart} className="focus-ring btn-primary px-6 py-3 rounded-2xl">
          Start Game
        </button>
      )}

      {active.phase === 'playing' && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={handleStart}
            className="focus-ring btn-ghost w-[150px] px-4 py-2 rounded-xl text-sm text-white/70"
          >
            Restart (new shuffle)
          </button>
          <button
            onClick={() => setConfirmGiveUp(true)}
            className="focus-ring btn-ghost w-[150px] px-4 py-2 rounded-xl text-sm text-white/70"
          >
            Give Up
          </button>
        </div>
      )}

      {active.phase === 'solved' && active.puzzle && (
        <div className="flex flex-col items-center gap-4">
          <p className="font-display text-2xl text-pink-200">
            Completed in {Math.floor((active.puzzle.score_seconds ?? active.elapsed) / 60)}m{' '}
            {(active.puzzle.score_seconds ?? active.elapsed) % 60}s 🎉
          </p>
          {(mode === 'recipient' || (mode === 'owner' && viewingGuest)) && !active.puzzle.letter_text && (
            <LetterFlow puzzle={active.puzzle} onSend={handleSendLetter} />
          )}
          {mode === 'owner' && !viewingGuest && (
            <button onClick={() => navigate('/dashboard')} className="focus-ring btn-ghost px-5 py-2.5 rounded-xl text-sm">
              Back to Dashboard
            </button>
          )}
        </div>
      )}

      {active.phase === 'given_up' && <p className="text-white/60">Alright — heading back…</p>}

      {mode === 'owner' && (
        <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-white/10 w-full max-w-sm">
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button onClick={handleShare} className="focus-ring btn-ghost w-[150px] px-4 py-2 rounded-xl text-sm">
              {own.copyLabel}
            </button>
            <button
              onClick={() => setShowWatch(true)}
              className="focus-ring btn-ghost w-[150px] px-4 py-2 rounded-xl text-sm"
            >
              🔴 Live Watching
            </button>
            <button onClick={handlePasteLink} className="focus-ring btn-ghost w-[150px] px-4 py-2 rounded-xl text-sm">
              {pasteLabel}
            </button>
          </div>
          <p className="text-[11px] text-white/35 text-center px-4">
            If a paste or share doesn't work the first time, please try a couple more times — it's usually just a slow connection.
          </p>
        </div>
      )}

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
      {showWatch && mode === 'owner' && (
        <LiveWatchPanel ownerToken={own.puzzle?.owner_token} onClose={() => setShowWatch(false)} />
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
