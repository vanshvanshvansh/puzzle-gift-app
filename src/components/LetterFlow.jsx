import { useRef, useState } from 'react'
import { THEMES } from '../lib/themes.js'
import LetterPaper, { fontSizeForLength } from './LetterPaper.jsx'

const MAX_CHARS = 500

export default function LetterFlow({ puzzle, onSend, sending }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(THEMES[puzzle.theme_category]?.letterTemplate || '')
  const [sent, setSent] = useState(false)
  const textareaRef = useRef(null)

  function autoGrow(el) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3">
        <LetterPaper theme={puzzle.theme_category}>
          <p className={fontSizeForLength(text.length)}>{text}</p>
        </LetterPaper>
        <p className="text-pink-200 font-display text-lg mt-2">Letter sent! 💌</p>
      </div>
    )
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="focus-ring btn-primary px-6 py-3 rounded-2xl">
        Send a letter back
      </button>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <LetterPaper theme={puzzle.theme_category}>
        <textarea
          ref={(el) => {
            textareaRef.current = el
            if (el) autoGrow(el)
          }}
          value={text}
          maxLength={MAX_CHARS}
          onChange={(e) => setText(e.target.value)}
          onInput={(e) => autoGrow(e.target)}
          rows={4}
          className={`letter-textarea ${fontSizeForLength(text.length)}`}
          placeholder="Write your letter…"
        />
      </LetterPaper>

      <div className="flex items-center gap-4 w-full max-w-md justify-between">
        <span className="text-xs text-white/40">{text.length}/{MAX_CHARS}</span>
        <div className="flex gap-3">
          <button onClick={() => setOpen(false)} className="focus-ring btn-ghost px-4 py-2 rounded-xl text-sm">
            Cancel
          </button>
          <button
            onClick={async () => {
              await onSend(text)
              setSent(true)
            }}
            disabled={sending || text.trim().length === 0}
            className="focus-ring btn-primary px-5 py-2 rounded-xl text-sm disabled:opacity-40"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
