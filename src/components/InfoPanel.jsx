const POINTS = [
  'Upload a photo — it turns into a sliding puzzle.',
  'Pick a grid size — bigger grid, harder puzzle.',
  "Choose who it's for — Partner, Family, Friend, or Just for Fun — sets the vibe.",
  "Set a timer — once it's up, the photo and puzzle are gone for good. Nothing sticks around forever.",
  'Share the link — they solve it on their end, no sign-up needed.',
  'Check "My Puzzles" to watch their progress live, or give up / delete anytime.',
  'A blurred reference photo gives quick hint peeks while they solve.',
  'If they finish, they can send a letter back — it shows up as a glowing gift box on your home page.',
]

export default function InfoPanel({ open, onClose }) {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`info-panel fixed top-0 left-0 h-full w-[85vw] max-w-sm z-50 card rounded-r-3xl p-6 overflow-y-auto ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl">How it works</h2>
          <button onClick={onClose} className="focus-ring btn-ghost w-8 h-8 rounded-full flex items-center justify-center text-sm">
            ✕
          </button>
        </div>
        <ul className="flex flex-col gap-3 text-sm text-white/85">
          {POINTS.map((point, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-pink-300">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
