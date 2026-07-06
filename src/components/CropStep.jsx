import { useEffect, useRef, useState } from 'react'

// A lightweight, dependency-free square cropper: drag to pan, slider to zoom,
// button to rotate in 90-degree steps. Renders the crop result at confirm time.
export default function CropStep({ file, onConfirm, onReset }) {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const SIZE = 320

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      draw()
    }
    img.src = URL.createObjectURL(file)
    return () => URL.revokeObjectURL(img.src)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  useEffect(draw, [zoom, rotation, offset])

  // Effective (post-rotation) dimensions, used both for the cover-scale
  // calculation and for clamping pan so the square is always fully covered.
  function effectiveDims(img) {
    const swapped = rotation === 90 || rotation === 270
    return swapped ? { w: img.height, h: img.width } : { w: img.width, h: img.height }
  }

  function currentScale(img) {
    const { w, h } = effectiveDims(img)
    return Math.max(SIZE / w, SIZE / h) * zoom
  }

  // Keeps the scaled image edges from ever coming inside the SIZE x SIZE
  // square — this is what prevents the black/empty corners bug.
  function clampOffset(candidate, img) {
    const scale = currentScale(img)
    const { w, h } = effectiveDims(img)
    const maxX = Math.max(0, (w * scale - SIZE) / 2)
    const maxY = Math.max(0, (h * scale - SIZE) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, candidate.x)),
      y: Math.min(maxY, Math.max(-maxY, candidate.y)),
    }
  }

  useEffect(() => {
    if (!imgRef.current) return
    setOffset((o) => clampOffset(o, imgRef.current))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, rotation])

  function draw() {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    canvas.width = SIZE
    canvas.height = SIZE
    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.fillStyle = '#0b1730'
    ctx.fillRect(0, 0, SIZE, SIZE)
    ctx.save()
    ctx.translate(SIZE / 2 + offset.x, SIZE / 2 + offset.y)
    ctx.rotate((rotation * Math.PI) / 180)
    const scale = currentScale(img)
    ctx.drawImage(img, (-img.width * scale) / 2, (-img.height * scale) / 2, img.width * scale, img.height * scale)
    ctx.restore()
  }

  function startDrag(e) {
    dragging.current = true
    const p = 'touches' in e ? e.touches[0] : e
    lastPos.current = { x: p.clientX, y: p.clientY }
  }
  function moveDrag(e) {
    if (!dragging.current) return
    const p = 'touches' in e ? e.touches[0] : e
    const dx = p.clientX - lastPos.current.x
    const dy = p.clientY - lastPos.current.y
    lastPos.current = { x: p.clientX, y: p.clientY }
    setOffset((o) => clampOffset({ x: o.x + dx, y: o.y + dy }, imgRef.current))
  }
  function endDrag() {
    dragging.current = false
  }

  function confirm() {
    const canvas = canvasRef.current
    canvas.toBlob((blob) => onConfirm(blob), 'image/jpeg', 0.92)
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        className="rounded-2xl overflow-hidden border border-white/15 cursor-grab active:cursor-grabbing touch-none"
        style={{ width: SIZE, height: SIZE }}
        onMouseDown={startDrag}
        onMouseMove={moveDrag}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchStart={startDrag}
        onTouchMove={moveDrag}
        onTouchEnd={endDrag}
      >
        <canvas ref={canvasRef} width={SIZE} height={SIZE} />
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <label className="text-xs text-white/60 flex flex-col gap-1">
          Zoom
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          />
        </label>
        <button
          onClick={() => setRotation((r) => (r + 90) % 360)}
          className="focus-ring btn-ghost px-4 py-2 rounded-xl text-sm self-start"
        >
          Rotate 90°
        </button>
      </div>

      <div className="flex gap-3">
        <button onClick={onReset} className="focus-ring btn-ghost px-5 py-2.5 rounded-xl text-sm">
          Choose Another Image
        </button>
        <button onClick={confirm} className="focus-ring btn-primary px-6 py-2.5 rounded-xl text-sm">
          Continue
        </button>
      </div>
    </div>
  )
}
