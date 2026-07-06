import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GiftBox from '../components/GiftBox.jsx'
import ThemedBackground from '../components/ThemedBackground.jsx'
import InfoPanel from '../components/InfoPanel.jsx'
import LetterPaper, { fontSizeForLength } from '../components/LetterPaper.jsx'
import { getOwnedPuzzles } from '../lib/localStore.js'
import { getPuzzleByOwnerToken } from '../lib/db.js'

export default function Home() {
  const navigate = useNavigate()
  const [letterPuzzle, setLetterPuzzle] = useState(null)
  const [showLetter, setShowLetter] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function checkGifts() {
      const owned = getOwnedPuzzles()
      for (const p of owned) {
        try {
          const row = await getPuzzleByOwnerToken(p.owner_token)
          if (row?.letter_text && !cancelled) {
            setLetterPuzzle(row)
            break
          }
        } catch {
          // row may have expired/been deleted — ignore
        }
      }
    }
    checkGifts()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <ThemedBackground theme={showLetter ? letterPuzzle?.theme_category : null} />

      <button
        onClick={() => setInfoOpen(true)}
        aria-label="How this works"
        className="focus-ring btn-ghost absolute top-6 left-6 w-10 h-10 rounded-full flex items-center justify-center text-sm font-display"
      >
        i
      </button>

      <button
        onClick={() => navigate('/dashboard')}
        className="focus-ring btn-ghost absolute top-6 right-6 px-4 py-2 rounded-xl text-sm"
        aria-label="Go to your dashboard"
      >
        My Puzzles
      </button>

      <div className="absolute left-6 bottom-6 md:left-10 md:bottom-10">
        <GiftBox hasLetter={!!letterPuzzle} onClick={() => letterPuzzle && setShowLetter(true)} />
      </div>

      <div className="text-center max-w-xl">
        <p className="text-pink-200/80 text-sm md:text-base tracking-wide mb-3">
          Challenge your partner, friend, or family
        </p>
        <h1 className="font-display text-4xl md:text-6xl font-800 tracking-tight mb-8">
          Create Your Puzzle
        </h1>
        <button
          onClick={() => navigate('/create')}
          className="focus-ring btn-primary px-8 py-4 rounded-2xl text-lg font-display"
        >
          Create
        </button>
      </div>

      <p className="absolute bottom-6 text-xs text-white/40 text-center px-6">
        All puzzles and photos are permanently deleted after your chosen time. Nothing is stored forever.
      </p>

      <InfoPanel open={infoOpen} onClose={() => setInfoOpen(false)} />

      {showLetter && letterPuzzle && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={() => setShowLetter(false)}>
          <div className="w-full max-w-md flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <LetterPaper
              theme={letterPuzzle.theme_category}
              imageUrl={letterPuzzle.letter_image_url}
              completedAt={letterPuzzle.completed_at}
              scoreSeconds={letterPuzzle.score_seconds}
            >
              <p className={`whitespace-pre-wrap ${fontSizeForLength(letterPuzzle.letter_text?.length || 0)}`}>
                {letterPuzzle.letter_text}
              </p>
            </LetterPaper>
            <button
              onClick={() => setShowLetter(false)}
              className="focus-ring btn-ghost px-5 py-2 rounded-xl text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
