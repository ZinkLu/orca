import type { WorktreeStatus } from '../worktree/row-display/worktree-status-rollup'

export type PtyFloatPillEntry = {
  tabId: string
  title: string
  status: WorktreeStatus
  conversation?: PtyFloatPillConversation | null
}

export type PtyFloatPillConversation = {
  kind: 'terminal' | 'structured-session'
  executionHostId?: string | null
  leafId: string
  ptyId: string | null
  sessionId: string | null
  lastMessage: string | null
  disabledReason: string | null
}

export type PtyFloatPillGroup = {
  worktreeId: string
  name: string | null
  entries: PtyFloatPillEntry[]
}

export type PtyFloatPillTarget = { worktreeId: string; tabId: string; leafId?: string }

export type PtyFloatPillMessage = PtyFloatPillTarget & {
  kind: PtyFloatPillConversation['kind']
  executionHostId?: string | null
  leafId: string
  ptyId: string | null
  sessionId: string | null
  prompt: string
}

export const PTY_FLOAT_PILL_MESSAGE_MAX_LENGTH = 16_000

export type PtyFloatPillSendResult = {
  status: 'sent' | 'failed' | 'unconfirmed'
  message?: string
}

export type PtyFloatPillMessageRequest = PtyFloatPillMessage & { requestId: string }
export type PtyFloatPillMessageReply = PtyFloatPillSendResult & { requestId: string }

export type PtyFloatPillSize = { width: number; height: number }

export type PtyFloatPillApi = {
  publishSnapshot: (groups: readonly PtyFloatPillGroup[]) => Promise<void>
  requestSnapshot: () => Promise<void>
  onSnapshot: (callback: (groups: readonly PtyFloatPillGroup[]) => void) => () => void
  onSnapshotRequested: (callback: () => void) => () => void
  resize: (size: PtyFloatPillSize) => Promise<void>
  resetPosition: () => Promise<void>
  revealTerminal: (target: PtyFloatPillTarget) => Promise<void>
  onRevealTerminal: (callback: (target: PtyFloatPillTarget) => void) => () => void
  sendMessage: (message: PtyFloatPillMessage) => Promise<PtyFloatPillSendResult>
  onSendMessage: (callback: (request: PtyFloatPillMessageRequest) => void) => () => void
  replyToMessage: (reply: PtyFloatPillMessageReply) => void
}
