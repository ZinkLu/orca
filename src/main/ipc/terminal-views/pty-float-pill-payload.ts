import { z } from 'zod'
import { lazyZodSchema } from '../../../shared/schema/lazy-zod-schema'
import type { PtyFloatPillGroup } from '../../../shared/terminal/pty-float-pill-snapshot'
import { PTY_FLOAT_PILL_MESSAGE_MAX_LENGTH } from '../../../shared/terminal/pty-float-pill-snapshot'
import { AGENT_STATUS_ASSISTANT_MESSAGE_MAX_LENGTH } from '../../../shared/agent-status/contracts/agent-status-types'
import { matchesPtyFloatPillMessageTarget } from '../../../shared/terminal/pty-float-pill-message-target'

const id = lazyZodSchema(() => z.string().min(1).max(4_096))
const status = lazyZodSchema(() =>
  z.enum([
    'active',
    'working',
    'monitoring',
    'permission',
    'failed',
    'interrupted',
    'unconfirmed',
    'done',
    'inactive'
  ])
)

export const PtyFloatPillTargetSchema = lazyZodSchema(() =>
  z.object({ worktreeId: id, tabId: id, leafId: z.uuid().optional() })
)
export const PtyFloatPillMessageSchema = lazyZodSchema(() =>
  PtyFloatPillTargetSchema.extend({
    leafId: z.uuid(),
    ptyId: id,
    sessionId: id.nullable(),
    prompt: z.string().trim().min(1).max(PTY_FLOAT_PILL_MESSAGE_MAX_LENGTH)
  })
)
const conversation = lazyZodSchema(() =>
  z.object({
    leafId: z.uuid(),
    ptyId: id.nullable(),
    sessionId: id.nullable(),
    lastMessage: z.string().max(AGENT_STATUS_ASSISTANT_MESSAGE_MAX_LENGTH).nullable(),
    disabledReason: z.string().max(4_096).nullable()
  })
)
export const PtyFloatPillSizeSchema = lazyZodSchema(() =>
  z.object({
    width: z.number().finite().min(32).max(1_024),
    height: z.number().finite().min(24).max(1_024)
  })
)
export const PtyFloatPillSnapshotSchema = lazyZodSchema(() =>
  z
    .array(
      z.object({
        worktreeId: id,
        name: z.string().max(4_096).nullable(),
        entries: z
          .array(
            z.object({
              tabId: id,
              title: z.string().max(4_096),
              status,
              conversation: conversation.nullable().optional()
            })
          )
          .min(1)
          .max(1_000)
      })
    )
    .max(1_000)
)

export function admittedPtyFloatPillTarget(groups: readonly PtyFloatPillGroup[], value: unknown) {
  const result = PtyFloatPillTargetSchema.safeParse(value)
  if (!result.success) {
    return null
  }
  const target = result.data
  return groups.some(
    (group) =>
      group.worktreeId === target.worktreeId &&
      group.entries.some(
        (entry) =>
          entry.tabId === target.tabId &&
          (target.leafId === undefined || entry.conversation?.leafId === target.leafId)
      )
  )
    ? target
    : null
}

export function admittedPtyFloatPillMessage(groups: readonly PtyFloatPillGroup[], value: unknown) {
  const result = PtyFloatPillMessageSchema.safeParse(value)
  if (!result.success) {
    return null
  }
  const message = result.data
  const entry = groups
    .find((group) => group.worktreeId === message.worktreeId)
    ?.entries.find((entry) => entry.tabId === message.tabId)
  return entry?.conversation &&
    !entry.conversation.disabledReason &&
    matchesPtyFloatPillMessageTarget(entry.conversation, message)
    ? message
    : null
}
