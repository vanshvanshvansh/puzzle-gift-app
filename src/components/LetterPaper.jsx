// Shared visual design for both composing (LetterFlow) and viewing (Home
// gift-box modal) a letter — so both feel like the exact same physical
// object. Pure CSS/emoji, no external images: keeps it fast, license-free,
// and guaranteed to always fit no matter the text length.

const LETTER_STYLES = {
  relationship: {
    paperGradient: 'linear-gradient(160deg, #fff1f2 0%, #ffe1e8 55%, #fecdd3 100%)',
    accent: '#e11d48',
    seal: '💗',
    font: 'font-script',
    ink: '#7f1d3a',
  },
  family: {
    paperGradient: 'linear-gradient(160deg, #fdf6e3 0%, #faf0d3 55%, #f3e0a8 100%)',
    accent: '#b45309',
    seal: '⭐',
    font: 'font-familyserif italic',
    ink: '#5b3a1a',
  },
  friend: {
    paperGradient: 'linear-gradient(160deg, #f2fbf7 0%, #e3f6ef 50%, #dbeeff 100%)',
    accent: '#0891b2',
    seal: '🤝',
    font: 'font-handwritten',
    ink: '#0f3d3e',
  },
  fun: {
    paperGradient: 'linear-gradient(135deg, #fff0f6 0%, #fff9db 45%, #e0fbfc 100%)',
    accent: '#db2777',
    seal: '🎉',
    font: 'font-fun',
    ink: '#831843',
  },
}

export function getLetterStyle(theme) {
  return LETTER_STYLES[theme] || LETTER_STYLES.relationship
}

// Bigger font for short notes, smaller for longer ones — always fits,
// never overflows, regardless of what the person writes (up to 500 chars).
export function fontSizeForLength(len) {
  if (len <= 120) return 'text-2xl md:text-3xl leading-relaxed'
  if (len <= 250) return 'text-xl md:text-2xl leading-relaxed'
  if (len <= 380) return 'text-lg md:text-xl leading-relaxed'
  return 'text-base md:text-lg leading-relaxed'
}

export default function LetterPaper({ theme, imageUrl, completedAt, scoreSeconds, children }) {
  const style = getLetterStyle(theme)
  const caption = [
    scoreSeconds != null ? `Completed in ${Math.floor(scoreSeconds / 60)}m ${scoreSeconds % 60}s` : null,
    completedAt
      ? new Date(completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="relative mx-auto w-full max-w-md" style={{ transform: 'rotate(-0.6deg)' }}>
      <div
        className="letter-paper relative px-6 py-11 md:px-10 md:py-12"
        style={{ background: style.paperGradient, color: style.ink }}
      >
        <div className="letter-seal" style={{ background: style.accent }}>
          <span>{style.seal}</span>
        </div>

        {imageUrl && (
          <div className="polaroid mx-auto mb-6">
            <img src={imageUrl} alt="Completed puzzle" />
            {caption && <p className="polaroid-caption">{caption}</p>}
          </div>
        )}

        <div className={style.font}>{children}</div>
      </div>
    </div>
  )
}
