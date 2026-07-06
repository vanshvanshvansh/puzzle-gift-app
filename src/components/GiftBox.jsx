export default function GiftBox({ hasLetter, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={hasLetter ? 'You have a letter waiting — open your gift' : 'Gift box, empty for now'}
      className={`focus-ring relative flex items-center justify-center rounded-3xl transition-transform hover:scale-105 ${
        hasLetter ? 'animate-pulseGlow' : ''
      }`}
      style={{ width: '18vh', height: '18vh', minWidth: 96, minHeight: 96 }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect x="15" y="42" width="70" height="42" rx="6"
          fill={hasLetter ? '#ffbd3d' : '#12386b'} stroke="#4dd6e8" strokeWidth="2" />
        <rect x="10" y="30" width="80" height="16" rx="4"
          fill={hasLetter ? '#ffd166' : '#1e5fb8'} stroke="#4dd6e8" strokeWidth="2" />
        <rect x="46" y="30" width="8" height="54" fill="#4dd6e8" opacity="0.8" />
        <path d="M50 30 C 35 10, 15 15, 30 28 Z" fill={hasLetter ? '#ffd166' : '#2f6fed'} />
        <path d="M50 30 C 65 10, 85 15, 70 28 Z" fill={hasLetter ? '#ffd166' : '#2f6fed'} />
      </svg>
      {hasLetter && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gift-400 animate-float" />
      )}
    </button>
  )
}
