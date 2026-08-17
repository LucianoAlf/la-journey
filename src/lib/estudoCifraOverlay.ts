export type CifraOverlayAnchor = {
  left: number
  top: number
  width: number
  height: number
}

const OVERLAY_GAP = 10
const MIN_TOP = 8

export function cifraOverlayFixedStyle(anchor: CifraOverlayAnchor): {
  position: 'fixed'
  left: number
  top: number
  transform: 'translate(-50%, -100%)'
  zIndex: number
} {
  return {
    position: 'fixed',
    left: anchor.left + anchor.width / 2,
    top: Math.max(MIN_TOP, anchor.top - OVERLAY_GAP),
    transform: 'translate(-50%, -100%)',
    zIndex: 40,
  }
}
