import type { PtyFloatPillConversation } from './pty-float-pill-snapshot'

export function matchesPtyFloatPillMessageTarget(
  current: Pick<PtyFloatPillConversation, 'leafId' | 'ptyId' | 'sessionId'>,
  selected: Pick<PtyFloatPillConversation, 'leafId' | 'ptyId' | 'sessionId'>
): boolean {
  return (
    current.leafId === selected.leafId &&
    current.ptyId === selected.ptyId &&
    current.sessionId === selected.sessionId
  )
}
