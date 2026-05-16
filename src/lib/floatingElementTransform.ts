import {
  FLOATING_PAGE_ASPECT_RATIO,
  getFloatingElementHeight,
  getFloatingAspectLockedHeight,
  isFloatingElementAspectLocked,
  type FloatingElement,
} from './floatingElements'

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

interface RotationDragInput {
  center: { x: number; y: number }
  startPointer: { x: number; y: number }
  currentPointer: { x: number; y: number }
  startRotation: number
}

const MIN_FLOATING_ELEMENT_SIZE = 2
const MAX_FLOATING_ELEMENT_SIZE = 100

function roundTenths(value: number) {
  return Math.round(value * 10) / 10
}

function clampSize(value: number) {
  return Math.max(MIN_FLOATING_ELEMENT_SIZE, Math.min(MAX_FLOATING_ELEMENT_SIZE, value))
}

function screenDeltaToElementDelta(deltaX: number, deltaY: number, rotation: number) {
  const radians = rotation * (Math.PI / 180)
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  return {
    x: deltaX * cos + deltaY * sin,
    y: -deltaX * sin + deltaY * cos,
  }
}

function elementDeltaToScreenDelta(deltaX: number, deltaY: number, rotation: number) {
  const radians = rotation * (Math.PI / 180)
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  return {
    x: deltaX * cos - deltaY * sin,
    y: deltaX * sin + deltaY * cos,
  }
}

function shouldKeepAspectRatio(element: FloatingElement, handle: FloatingResizeHandle, explicit?: boolean) {
  if (explicit) return true
  if (!['nw', 'ne', 'se', 'sw'].includes(handle)) return false
  return isFloatingElementAspectLocked(element)
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
  const isAspectLocked = isFloatingElementAspectLocked(element)
  const startHeight = isAspectLocked
    ? getFloatingAspectLockedHeight(element.width)
    : getFloatingElementHeight(element) ?? element.width
  const horizontalSign = handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0
  const verticalSign = handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0
  const multiplier = fromCenter ? 2 : 1
  const localDelta = screenDeltaToElementDelta(deltaXPercent, deltaYPercent, element.rotation)

  let nextWidth = clampSize(startWidth + (localDelta.x * horizontalSign * multiplier))
  let nextHeight = clampSize(startHeight + (localDelta.y * verticalSign * multiplier))

  if (isAspectLocked || shouldKeepAspectRatio(element, handle, keepAspectRatio)) {
    const widthCandidateDelta = horizontalSign === 0
      ? 0
      : localDelta.x * horizontalSign * multiplier
    const heightCandidateDelta = verticalSign === 0
      ? 0
      : isAspectLocked
        ? (localDelta.y * verticalSign * multiplier) / FLOATING_PAGE_ASPECT_RATIO
        : localDelta.y * verticalSign * multiplier
    const dominant = Math.max(Math.abs(widthCandidateDelta), Math.abs(heightCandidateDelta))
    const activeDelta = Math.abs(widthCandidateDelta) >= Math.abs(heightCandidateDelta)
      ? widthCandidateDelta
      : heightCandidateDelta
    const growing = activeDelta >= 0
    const nextSize = clampSize(startWidth + (growing ? dominant : -dominant))
    nextWidth = nextSize
    nextHeight = isAspectLocked ? getFloatingAspectLockedHeight(nextSize) : nextSize
  }

  const widthDelta = nextWidth - startWidth
  const heightDelta = nextHeight - startHeight

  const localCenterDelta = {
    x: fromCenter ? 0 : (widthDelta / 2) * horizontalSign,
    y: fromCenter ? 0 : (heightDelta / 2) * verticalSign,
  }
  const screenCenterDelta = elementDeltaToScreenDelta(localCenterDelta.x, localCenterDelta.y, element.rotation)

  return {
    width: roundTenths(nextWidth),
    height: roundTenths(nextHeight),
    x: roundTenths(element.x + screenCenterDelta.x),
    y: roundTenths(element.y + screenCenterDelta.y),
  }
}

export function calculateFloatingElementRotation({ center, pointer }: RotationInput): number {
  const radians = Math.atan2(pointer.y - center.y, pointer.x - center.x)
  const degrees = radians * (180 / Math.PI) + 90
  return Math.round((degrees + 360) % 360)
}

function shortestAngleDelta(from: number, to: number) {
  return ((to - from + 540) % 360) - 180
}

export function calculateFloatingElementRotationFromDrag({
  center,
  startPointer,
  currentPointer,
  startRotation,
}: RotationDragInput): number {
  const startAngle = calculateFloatingElementRotation({ center, pointer: startPointer })
  const currentAngle = calculateFloatingElementRotation({ center, pointer: currentPointer })
  const delta = shortestAngleDelta(startAngle, currentAngle)
  return Math.round((startRotation + delta + 360) % 360)
}

export function formatFloatingRotationForDisplay(rotation: number): number {
  const normalized = Math.round(((rotation % 360) + 360) % 360)
  return normalized > 180 ? normalized - 360 : normalized
}

export function shouldShowFloatingSelectionFrame({ isRotating }: { isRotating: boolean }): boolean {
  return !isRotating
}
