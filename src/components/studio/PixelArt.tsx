/** Pixel art SVGs — rendered via rect grids, image-rendering: pixelated */

const S = 4 // base pixel size in SVG units

function px(col: number, row: number, color: string, w = 1, h = 1) {
  return (
    <rect
      key={`${col}-${row}`}
      x={col * S}
      y={row * S}
      width={S * w}
      height={S * h}
      fill={color}
    />
  )
}

// ─── Color palette ───────────────────────────────────────
const K  = '#191919' // black
const DG = '#555555' // dark gray
const MG = '#888888' // mid gray
const LG = '#cccccc' // light gray
const W  = '#ffffff' // white
const _ = null       // transparent

// ─── Pixel Writer Scene (empty state, 40×28 cells) ───────
// A writer at a desk, window with stars, minimal
const WRITER_SCENE: (string | null)[][] = [
  // row 0-2: starry background
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,K,_,_,_,_,_,_,_,_,_,K,_,_,_,_,_,_,_,_,_,_,_,K,_,_,_,_,_,_,_,_,_,K,_,_,_,_,_],
  [_,K,K,K,_,_,_,_,_,_,K,K,K,_,_,_,_,_,_,_,_,_,K,K,K,K,_,_,_,_,_,_,K,K,K,_,_,_,_,_],
  [_,_,K,_,_,_,_,_,_,_,_,_,K,_,_,_,_,_,_,_,_,_,_,_,K,_,_,_,_,_,_,_,_,_,K,_,_,_,_,_],
  [_,_,_,_,_,_,_,K,_,_,_,_,_,_,_,_,_,_,K,_,_,_,_,_,_,_,_,_,_,_,K,_,_,_,_,_,_,_,_,_],
  // row 5-7: window frame top
  [_,_,_,_,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,_,_,_,_],
  [_,_,_,_,K,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,K,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,K,_,_,_,_],
  [_,_,_,_,K,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,K,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,K,_,_,_,_],
  [_,_,_,_,K,MG,DG,DG,MG,MG,MG,MG,DG,MG,MG,MG,MG,MG,K,MG,MG,MG,MG,MG,DG,MG,MG,MG,MG,DG,DG,MG,MG,MG,MG,K,_,_,_,_],
  [_,_,_,_,K,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,K,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,K,_,_,_,_],
  [_,_,_,_,K,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,K,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,MG,K,_,_,_,_],
  [_,_,_,_,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,_,_,_],
  // row 12-14: desk surface
  [_,_,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,_,_],
  [_,_,K,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,K,_,_],
  [_,_,K,LG,K,K,K,K,K,K,K,K,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,K,K,K,K,K,K,_,_],
  // row 15-19: monitor on desk
  [_,_,_,_,K,W,W,W,W,W,W,W,W,K,_,_,_,_,_,K,K,K,K,K,K,K,K,K,K,K,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,K,W,W,W,W,W,W,W,W,K,_,_,_,_,_,K,W,W,W,W,W,W,W,W,W,K,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,K,W,W,LG,LG,LG,W,W,W,K,_,_,_,_,_,K,W,LG,LG,W,W,LG,LG,W,W,K,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,K,W,W,W,W,W,W,W,W,K,_,_,_,_,_,K,W,W,W,W,W,W,W,W,W,K,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,K,K,K,K,K,K,K,K,K,K,_,_,_,_,_,K,K,K,K,K,K,K,K,K,K,K,_,_,_,_,_,_,_,_,_,_],
  // row 20: desk edge
  [_,_,_,_,_,_,K,K,_,_,_,_,_,_,_,_,_,_,_,_,K,K,K,K,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  // row 21-23: person silhouette
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,K,K,K,K,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,K,DG,DG,DG,DG,K,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,K,DG,DG,DG,DG,DG,DG,K,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,K,DG,DG,DG,DG,DG,DG,K,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,K,K,DG,DG,DG,DG,K,K,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,K,DG,DG,DG,DG,K,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_,_,_,K,K,K,K,K,K,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
]

export function PixelWriterScene() {
  const cols = WRITER_SCENE[0].length
  const rows = WRITER_SCENE.length
  return (
    <svg
      width={cols * S * 2}
      height={rows * S * 2}
      viewBox={`0 0 ${cols * S} ${rows * S}`}
      style={{ imageRendering: 'pixelated', display: 'block' }}
    >
      {WRITER_SCENE.flatMap((row, r) =>
        row.map((color, c) => color ? px(c, r, color) : null)
      )}
    </svg>
  )
}

// ─── Pixel Book (cover placeholder, 12×16 cells) ─────────
const BOOK: (string | null)[][] = [
  [_,K,K,K,K,K,K,K,K,K,K,_],
  [K,W,W,W,W,W,W,W,W,W,W,K],
  [K,LG,W,W,W,W,W,W,W,W,W,K],
  [K,LG,W,K,K,K,K,K,W,W,W,K],
  [K,LG,W,K,W,W,W,K,W,W,W,K],
  [K,LG,W,K,W,W,W,K,W,W,W,K],
  [K,LG,W,K,K,K,K,K,W,W,W,K],
  [K,LG,W,W,W,W,W,W,W,W,W,K],
  [K,LG,W,W,W,W,W,W,W,W,W,K],
  [K,LG,W,K,K,W,K,K,K,W,W,K],
  [K,LG,W,W,W,W,W,W,W,W,W,K],
  [K,LG,W,W,W,W,W,W,W,W,W,K],
  [K,LG,W,K,K,K,W,K,K,W,W,K],
  [K,LG,W,W,W,W,W,W,W,W,W,K],
  [K,LG,LG,LG,LG,LG,LG,LG,LG,LG,LG,K],
  [_,K,K,K,K,K,K,K,K,K,K,_],
]

export function PixelBook({ size = 96 }: { size?: number }) {
  const cols = BOOK[0].length
  const rows = BOOK.length
  const cellW = size / cols
  const cellH = (size * 1.3) / rows
  return (
    <svg
      width={size}
      height={size * 1.3}
      viewBox={`0 0 ${cols} ${rows}`}
      style={{ imageRendering: 'pixelated', display: 'block' }}
    >
      {BOOK.flatMap((row, r) =>
        row.map((color, c) =>
          color ? <rect key={`${c}-${r}`} x={c} y={r} width={1} height={1} fill={color} /> : null
        )
      )}
    </svg>
  )
}

// ─── Pixel Pen (small icon, 8×8) ─────────────────────────
const PEN: (string | null)[][] = [
  [_,_,_,_,_,_,K,_],
  [_,_,_,_,_,K,DG,K],
  [_,_,_,_,K,DG,DG,K],
  [_,_,_,K,DG,DG,K,_],
  [_,_,K,DG,DG,K,_,_],
  [_,K,DG,DG,K,_,_,_],
  [K,DG,K,K,_,_,_,_],
  [K,K,_,_,_,_,_,_],
]

export function PixelPen({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" style={{ imageRendering: 'pixelated', display: 'block' }}>
      {PEN.flatMap((row, r) =>
        row.map((color, c) =>
          color ? <rect key={`${c}-${r}`} x={c} y={r} width={1} height={1} fill={color} /> : null
        )
      )}
    </svg>
  )
}

// ─── Pixel Sparkle (3×3 cross) ────────────────────────────
export function PixelStar({ size = 12, color = K }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 5 5" style={{ imageRendering: 'pixelated', display: 'block', flexShrink: 0 }}>
      <rect x={2} y={0} width={1} height={1} fill={color} />
      <rect x={0} y={2} width={1} height={1} fill={color} />
      <rect x={2} y={2} width={1} height={1} fill={color} />
      <rect x={4} y={2} width={1} height={1} fill={color} />
      <rect x={2} y={4} width={1} height={1} fill={color} />
    </svg>
  )
}

// ─── Pixel Check ──────────────────────────────────────────
export function PixelCheck({ size = 10, color = '#333' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 5 5" style={{ imageRendering: 'pixelated', display: 'block', flexShrink: 0 }}>
      <rect x={0} y={2} width={1} height={1} fill={color} />
      <rect x={1} y={3} width={1} height={1} fill={color} />
      <rect x={2} y={4} width={1} height={1} fill={color} />
      <rect x={3} y={1} width={1} height={1} fill={color} />
      <rect x={4} y={0} width={1} height={1} fill={color} />
    </svg>
  )
}

// ─── Pixel X ──────────────────────────────────────────────
export function PixelX({ size = 10, color = '#555' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 5 5" style={{ imageRendering: 'pixelated', display: 'block', flexShrink: 0 }}>
      <rect x={0} y={0} width={1} height={1} fill={color} />
      <rect x={4} y={0} width={1} height={1} fill={color} />
      <rect x={1} y={1} width={1} height={1} fill={color} />
      <rect x={3} y={1} width={1} height={1} fill={color} />
      <rect x={2} y={2} width={1} height={1} fill={color} />
      <rect x={1} y={3} width={1} height={1} fill={color} />
      <rect x={3} y={3} width={1} height={1} fill={color} />
      <rect x={0} y={4} width={1} height={1} fill={color} />
      <rect x={4} y={4} width={1} height={1} fill={color} />
    </svg>
  )
}

// ─── Pixel Loader (rotating squares) ──────────────────────
export function PixelLoader({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 6 6"
      style={{ imageRendering:'pixelated', display:'block', flexShrink:0, animation:'spin 0.8s steps(4) infinite' }}>
      <rect x={2} y={0} width={2} height={2} fill={K} />
      <rect x={4} y={2} width={2} height={2} fill={MG} />
      <rect x={2} y={4} width={2} height={2} fill={LG} />
      <rect x={0} y={2} width={2} height={2} fill={MG} />
    </svg>
  )
}

// ─── BookBuddy Logo (open book + star, 16×14) ────────────
export function BookBuddyLogo({ size = 28 }: { size?: number }) {
  const h = Math.round(size * 14 / 16)
  return (
    <svg width={size} height={h} viewBox="0 0 16 14"
      style={{ imageRendering: 'pixelated', display: 'block', flexShrink: 0 }}>
      {/* spine */}
      <rect x={7} y={2} width={2} height={10} fill={K} />
      {/* left page */}
      <rect x={1} y={3} width={6} height={8} fill={LG} />
      <rect x={0} y={4} width={1} height={6} fill={K} />
      <rect x={1} y={2} width={6} height={1} fill={K} />
      <rect x={1} y={11} width={6} height={1} fill={K} />
      <rect x={2} y={5} width={4} height={1} fill={MG} />
      <rect x={2} y={7} width={3} height={1} fill={MG} />
      <rect x={2} y={9} width={4} height={1} fill={MG} />
      {/* right page */}
      <rect x={9} y={3} width={6} height={8} fill={W} />
      <rect x={15} y={4} width={1} height={6} fill={K} />
      <rect x={9} y={2} width={6} height={1} fill={K} />
      <rect x={9} y={11} width={6} height={1} fill={K} />
      <rect x={10} y={5} width={4} height={1} fill={LG} />
      <rect x={10} y={7} width={3} height={1} fill={LG} />
      <rect x={10} y={9} width={4} height={1} fill={LG} />
      {/* star buddy (top-right corner) */}
      <rect x={13} y={0} width={1} height={1} fill={K} />
      <rect x={12} y={1} width={3} height={1} fill={K} />
      <rect x={11} y={0} width={1} height={3} fill={K} />
      <rect x={14} y={0} width={1} height={3} fill={K} />
      <rect x={12} y={3} width={1} height={1} fill={K} />
      <rect x={14} y={3} width={1} height={1} fill={K} />
    </svg>
  )
}

// ─── Pixel Chapter icon (mini book, 6×8) ─────────────────
export function PixelChapter({ size = 14, filled = false }: { size?: number; filled?: boolean }) {
  const c = filled ? K : DG
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 6 8"
      style={{ imageRendering:'pixelated', display:'block', flexShrink:0 }}>
      <rect x={0} y={0} width={6} height={8} fill={filled ? K : LG} />
      <rect x={1} y={1} width={4} height={6} fill={W} />
      <rect x={0} y={0} width={1} height={8} fill={c} />
      <rect x={2} y={3} width={3} height={1} fill={filled ? LG : MG} />
      <rect x={2} y={5} width={2} height={1} fill={filled ? LG : MG} />
    </svg>
  )
}
