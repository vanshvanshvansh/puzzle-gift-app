// Fixed, full-viewport, animated aurora-mesh background.
// Renders ALL theme variants stacked at once and crossfades between them
// via opacity — this is what makes theme changes (e.g. picking a category
// in Create, or a modal opening) transition smoothly instead of snapping.
const THEME_CONFIG = {
  default: { colors: ['#8b5cf6', '#ec4899', '#3b82f6'], symbols: [] },
  relationship: { colors: ['#fb7185', '#f472b6', '#f87171'], symbols: ['💗', '💕', '✨'] },
  family: { colors: ['#fde68a', '#7dd3fc', '#fbcfe8'], symbols: ['⭐', '✨', '🌟'] },
  friend: { colors: ['#60a5fa', '#34d399', '#a78bfa'], symbols: ['🎮', '🤝', '🎧'] },
  fun: { colors: ['#f472b6', '#fde047', '#22d3ee'], symbols: ['🎉', '🎊', '🥳'] },
}

const SYMBOL_POSITIONS = [
  { top: '14%', left: '10%' },
  { top: '68%', left: '78%' },
  { top: '42%', left: '58%' },
]

export default function ThemedBackground({ theme }) {
  const active = theme && THEME_CONFIG[theme] ? theme : 'default'

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-[#050308]">
      {Object.entries(THEME_CONFIG).map(([key, cfg]) => (
        <div
          key={key}
          className="absolute inset-0 transition-opacity ease-in-out"
          style={{ opacity: key === active ? 1 : 0, transitionDuration: '1300ms' }}
          aria-hidden="true"
        >
          <div className="blob blob-a" style={{ background: cfg.colors[0] }} />
          <div className="blob blob-b" style={{ background: cfg.colors[1] }} />
          <div className="blob blob-c" style={{ background: cfg.colors[2] }} />
          {cfg.symbols.map((sym, i) => (
            <span
              key={i}
              className="floating-symbol"
              style={{ ...SYMBOL_POSITIONS[i % SYMBOL_POSITIONS.length], animationDelay: `${i * 3.5}s` }}
            >
              {sym}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
