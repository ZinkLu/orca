import type { PtyFloatPillConversation } from './pty-float-pill-snapshot'

export function matchesPtyFloatPillMessageTarget(
  current: Pick<
    PtyFloatPillConversation,
    'kind' | 'executionHostId' | 'leafId' | 'ptyId' | 'sessionId'
  >,
  selected: Pick<
    PtyFloatPillConversation,
    'kind' | 'executionHostId' | 'leafId' | 'ptyId' | 'sessionId'
  >
): boolean {
  return (
    current.kind === selected.kind &&
    current.executionHostId === selected.executionHostId &&
    current.leafId === selected.leafId &&
    current.ptyId === selected.ptyId &&
    current.sessionId === selected.sessionId
  )
}
