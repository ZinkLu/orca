import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PtyFloatPillGroup } from '../../../../shared/terminal/pty-float-pill-snapshot'
import { PtyFloatPill } from './PtyFloatPill'

const EXPANDED_KEY = 'orca-pty-float-pill-expanded'

function readExpanded(): boolean {
  try {
    return window.localStorage.getItem(EXPANDED_KEY) !== 'false'
  } catch {
    return true
  }
}

export function PtyFloatPillWindow(): React.JSX.Element {
  const [groups, setGroups] = useState<readonly PtyFloatPillGroup[]>([])
  const [expanded, setExpanded] = useState(readExpanded)
  const frame = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsubscribe = window.api.ptyFloatPill.onSnapshot(setGroups)
    void window.api.ptyFloatPill.requestSnapshot()
    return unsubscribe
  }, [])

  useLayoutEffect(() => {
    const node = frame.current
    if (!node) {
      return
    }
    const observer = new ResizeObserver(() => {
      const { width, height } = node.getBoundingClientRect()
      if (width >= 32 && height >= 24) {
        void window.api.ptyFloatPill.resize({ width, height })
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const toggle = (): void => {
    const next = !expanded
    setExpanded(next)
    try {
      window.localStorage.setItem(EXPANDED_KEY, String(next))
    } catch {}
  }

  return (
    <div ref={frame} className="w-max p-2">
      <PtyFloatPill
        groups={groups}
        expanded={expanded}
        onToggle={toggle}
        onReveal={(target) => void window.api.ptyFloatPill.revealTerminal(target)}
      />
    </div>
  )
}
