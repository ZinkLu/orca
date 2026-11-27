import { z } from 'zod'
import { lazyZodSchema } from '../../../shared/schema/lazy-zod-schema'
import type { PtyFloatPillGroup } from '../../../shared/terminal/pty-float-pill-snapshot'

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

export const PtyFloatPillTargetSchema = lazyZodSchema(() => z.object({ worktreeId: id, tabId: id }))
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
          .array(z.object({ tabId: id, title: z.string().max(4_096), status }))
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
      group.entries.some((entry) => entry.tabId === target.tabId)
  )
    ? target
    : null
}
