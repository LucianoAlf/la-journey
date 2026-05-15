import type { FloatingElement } from './floatingElements'

export type FloatingResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

interface ResizeInput {
  element: FloatingElement
  handle: FloatingResizeHandle
  deltaXPercent: number
  deltaYPercent: number
  fromCenter?: boolean
  keepAspectRatio?: boolean
}

interface RotationInput {
  center: { x: number; y: number }
  pointer: { x: number; y: number }
}

const MIN_FLOATING_ELEMENT_SIZE = 2
const MAX_FLOATING_ELEMENT_SIZE = 100

function roundTenths(value: number) {
  return Math.round(value * 10) / 10
}

function clampSize(value: number) {
  return Math.max(MIN_FLOATING_ELEMENT_SIZE, Math.min(MAX_FLOATING_ELEMENT_SIZE, value))
}

function shouldKeepAspectRatio(element: FloatingElement, handle: FloatingResizeHandle, explicit?: boolean) {
  if (explicit) return true
  if (!['nw', 'ne', 'se', 'sw'].includes(handle)) return false
  if (element.type === 'iconify_icon') return true
  return element.type === 'shape' && ['circle', 'star'].includes(element.shape)
}

export function calculateFloatingElementResize({
  element,
  handle,
  deltaXPercent,
  deltaYPercent,
  fromCenter = false,
  keepAspectRatio,
}: ResizeInput): Partial<FloatingElement> {
  const startWidth = element.width
  const startHeight = element.height ?? element.width
  const horizontalSign = handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0
  const verticalSign = handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0
  const multiplier = fromCenter ? 2 : 1

  let nextWidth = clampSize(startWidth + (deltaXPercent * horizontalSign * multiplier))
  let nextHeight = clampSize(startHeight + (deltaYPercent * verticalSign * multiplier))

  if (shouldKeepAspectRatio(element, handle, keepAspectRatio)) {
    const widthDelta = Math.abs(nextWidth - startWidth)
    const heightDelta = Math.abs(nextHeight - startHeight)
    const dominant = Math.max(widthDelta, heightDelta)
    const growing = (horizontalSign * deltaXPercent) >= 0 || (verticalSign * deltaYPercent) >= 0
    const size = clampSize((growing ? Math.max(startWidth, startHeight) + dominant : Math.min(startWidth, startHeight) - dominant))
    nextWidth = size
    nextHeight = size
  }

  const widthDelta = nextWidth - startWidth
  const heightDelta = nextHeight - startHeight

  const nextX = fromCenter || horizontalSign === 0
    ? element.x
    : element.x + (widthDelta / 2) * horizontalSign
  const nextY = fromCenter || verticalSign === 0
    ? element.y
    : element.y + (heightDelta / 2) * verticalSign

  return {
    width: roundTenths(nextWidth),
    height: roundTenths(nextHeight),
    x: roundTenths(nextX),
    y: roundTenths(nextY),
  }
}

export function calculateFloatingElementRotation({ center, pointer }: RotationInput): number {
  const radians = Math.atan2(pointer.y - center.y, pointer.x - center.x)
  const degrees = radians * (180 / Math.PI) + 90
  return Math.round((degrees + 360) % 360)
}
