export default function PuzzleBoard({ board, tiles, gridSize, onPieceClick, interactive = true }) {
  const blankValue = gridSize * gridSize - 1

  return (
    <div
      className="grid gap-[2px] bg-white/10 rounded-2xl overflow-hidden border border-white/15"
      style={{
        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        width: 'min(80vw, 420px)',
        height: 'min(80vw, 420px)',
      }}
    >
      {board.map((pieceId, index) => {
        const isBlank = pieceId === blankValue
        return (
          <button
            key={index}
            disabled={isBlank || !interactive}
            onClick={() => onPieceClick && onPieceClick(index)}
            className={`focus-ring relative bg-navy-800 ${
              isBlank ? '' : 'cursor-pointer hover:brightness-110'
            } transition`}
            aria-label={isBlank ? 'Empty slot' : `Puzzle piece ${pieceId + 1}`}
          >
            {!isBlank && tiles[pieceId] && (
              <img src={tiles[pieceId]} alt="" className="w-full h-full object-cover select-none pointer-events-none" draggable={false} />
            )}
          </button>
        )
      })}
    </div>
  )
}
