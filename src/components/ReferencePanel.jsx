import { useEffect, useState } from 'react'

// Shows the full image at 60% blur, with 5 random cells sharpening every
// ~5 seconds to give spatial hints without ever revealing the whole image.
// Uses the CSS "sprite sheet" technique (one background-image, sized up by
// gridSize, shifted per cell) since it's far less fragile than nesting
// absolutely-positioned <img> crops.
export default function ReferencePanel({ imageUrl, gridSize }) {
  const [sharpCells, setSharpCells] = useState([])

  useEffect(() => {
    function pickRandom() {
      const total = gridSize * gridSize
      const picked = new Set()
      while (picked.size < Math.min(5, total)) {
        picked.add(Math.floor(Math.random() * total))
      }
      setSharpCells([...picked])
    }
    pickRandom()
    const id = setInterval(pickRandom, 5000)
    return () => clearInterval(id)
  }, [gridSize])

  const cellPercent = 100 / gridSize

  return (
    <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden border border-white/15 shrink-0 bg-navy-900">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(6px)',
          opacity: 0.6,
        }}
      />
      {Array.from({ length: gridSize * gridSize }).map((_, i) => {
        const row = Math.floor(i / gridSize)
        const col = i % gridSize
        const isSharp = sharpCells.includes(i)
        return (
          <div
            key={i}
            className="absolute transition-opacity duration-500"
            style={{
              top: `${row * cellPercent}%`,
              left: `${col * cellPercent}%`,
              width: `${cellPercent}%`,
              height: `${cellPercent}%`,
              opacity: isSharp ? 1 : 0,
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
              backgroundPosition: `${gridSize > 1 ? (col * 100) / (gridSize - 1) : 0}% ${
                gridSize > 1 ? (row * 100) / (gridSize - 1) : 0
              }%`,
            }}
          />
        )
      })}
    </div>
  )
}
