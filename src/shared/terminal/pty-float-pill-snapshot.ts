import type { WorktreeStatus } from '../worktree/row-display/worktree-status-rollup'

export type PtyFloatPillEntry = {
  tabId: string
  title: string
  status: WorktreeStatus
}

export type PtyFloatPillGroup = {
  worktreeId: string
  name: string | null
  entries: PtyFloatPillEntry[]
}

export type PtyFloatPillTarget = { worktreeId: string; tabId: string }

export type PtyFloatPillSize = { width: number; height: number }

export type PtyFloatPillApi = {
  publishSnapshot: (groups: readonly PtyFloatPillGroup[]) => Promise<void>
  requestSnapshot: () => Promise<void>
  onSnapshot: (callback: (groups: readonly PtyFloatPillGroup[]) => void) => () => void
  onSnapshotRequested: (callback: () => void) => () => void
  resize: (size: PtyFloatPillSize) => Promise<void>
  revealTerminal: (target: PtyFloatPillTarget) => Promise<void>
  onRevealTerminal: (callback: (target: PtyFloatPillTarget) => void) => () => void
}
