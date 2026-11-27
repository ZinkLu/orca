import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'

type Point = { x: number; y: number }
type Size = { width: number; height: number }
type StoredPlacement = { position: Point | null; expanded: boolean }
type Drag = {
  pointerId: number
  startX: number
  startY: number
  origin: Point
  last: Point
  moved: boolean
}

const STORAGE_KEY = 'orca-pty-float-pill-placement'
const EDGE_GAP = 8
// The titlebar is a window-drag region that would swallow presses on the pill.
const TITLEBAR_SAFE_TOP = 36
// Just under the app header and the workspace tab row.
const DEFAULT_TOP = 76
const DRAG_THRESHOLD = 4

function isPoint(value: unknown): value is Point {
  return (
    typeof value === 'object' &&
    value !== null &&
    'x' in value &&
    'y' in value &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y)
  )
}

function parseStoredPlacement(): unknown {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return null
  }
}

function readStoredPlacement(): StoredPlacement {
  const stored = parseStoredPlacement()
  if (typeof stored !== 'object' || stored === null) {
    return { position: null, expanded: true }
  }
  const position = 'position' in stored ? stored.position : null
  return {
    position: isPoint(position) ? { x: position.x, y: position.y } : null,
    expanded: !('expanded' in stored) || stored.expanded !== false
  }
}

function writeStoredPlacement(placement: StoredPlacement): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(placement))
  } catch {}
}

function readViewport(): Size {
  return { width: window.innerWidth, height: window.innerHeight }
}

function clampToViewport(position: Point, size: Size, viewport: Size): Point {
  const maxX = Math.max(EDGE_GAP, viewport.width - size.width - EDGE_GAP)
  const maxY = Math.max(TITLEBAR_SAFE_TOP, viewport.height - size.height - EDGE_GAP)
  return {
    x: Math.min(Math.max(EDGE_GAP, position.x), maxX),
    y: Math.min(Math.max(TITLEBAR_SAFE_TOP, position.y), maxY)
  }
}

type HeaderHandler = (event: PointerEvent<HTMLButtonElement>) => void

export type PtyFloatPillPlacement = {
  ref: (node: HTMLDivElement | null) => void
  position: Point
  expanded: boolean
  headerProps: {
    onPointerDown: HeaderHandler
    onPointerMove: HeaderHandler
    onPointerUp: HeaderHandler
    onPointerCancel: HeaderHandler
    onLostPointerCapture: HeaderHandler
    onClick: () => void
  }
}

/** Where the pill sits and whether its list is open, kept across restarts; its header drags the pill and toggles the list. */
export function usePtyFloatPillPlacement(): PtyFloatPillPlacement {
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const [stored, setStored] = useState(readStoredPlacement)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  const [viewport, setViewport] = useState(readViewport)
  const [dragPosition, setDragPosition] = useState<Point | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    const onResize = (): void => setViewport(readViewport())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Measure before paint and on every content change, so clamping always uses the real footprint.
  useLayoutEffect(() => {
    if (!node) {
      return undefined
    }
    const measure = (): void => {
      const { width, height } = node.getBoundingClientRect()
      setSize((current) =>
        current.width === width && current.height === height ? current : { width, height }
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])

  // Until the user drags it, the pill stays centred under the tab row.
  const preferred = dragPosition ??
    stored.position ?? { x: (viewport.width - size.width) / 2, y: DEFAULT_TOP }
  const position = clampToViewport(preferred, size, viewport)

  const save = (next: StoredPlacement): void => {
    setStored(next)
    writeStoredPlacement(next)
  }

  const endDrag: HeaderHandler = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!drag.moved) {
      return
    }
    // A drag's release still clicks the header; that click must not also toggle the list.
    suppressClickRef.current = event.type === 'pointerup'
    setDragPosition(null)
    save({ ...stored, position: drag.last })
  }

  return {
    ref: setNode,
    position,
    expanded: stored.expanded,
    headerProps: {
      onPointerDown: (event) => {
        suppressClickRef.current = false
        if (event.button !== 0 || dragRef.current) {
          return
        }
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          origin: position,
          last: position,
          moved: false
        }
        event.currentTarget.setPointerCapture(event.pointerId)
      },
      onPointerMove: (event) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) {
          return
        }
        const dx = event.clientX - drag.startX
        const dy = event.clientY - drag.startY
        if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
          return
        }
        drag.moved = true
        drag.last = clampToViewport(
          { x: drag.origin.x + dx, y: drag.origin.y + dy },
          size,
          viewport
        )
        setDragPosition(drag.last)
      },
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      // Capture can be revoked without a pointerup; end the drag then too.
      onLostPointerCapture: endDrag,
      onClick: () => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false
          return
        }
        save({ ...stored, expanded: !stored.expanded })
      }
    }
  }
}
