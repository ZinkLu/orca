import { expect, test } from 'vitest'
import { admittedPtyFloatPillTarget, PtyFloatPillSnapshotSchema } from './pty-float-pill-payload'

test('a pill can only reveal a tab within its published workspace', () => {
  const groups = PtyFloatPillSnapshotSchema.parse([
    {
      worktreeId: 'folder:notes',
      name: 'Notes',
      entries: [{ tabId: 'codex', title: 'Codex', status: 'working' }]
    },
    {
      worktreeId: 'remote:repo',
      name: 'Remote',
      entries: [{ tabId: 'claude', title: 'Claude', status: 'permission' }]
    }
  ])
  expect(
    admittedPtyFloatPillTarget(groups, { worktreeId: 'folder:notes', tabId: 'codex' })
  ).toEqual({ worktreeId: 'folder:notes', tabId: 'codex' })
  expect(
    admittedPtyFloatPillTarget(groups, { worktreeId: 'folder:notes', tabId: 'claude' })
  ).toBeNull()
  expect(admittedPtyFloatPillTarget([], { worktreeId: 'folder:notes', tabId: 'codex' })).toBeNull()
  expect(
    admittedPtyFloatPillTarget(groups, { worktreeId: ['folder:notes'], tabId: 'codex' })
  ).toBeNull()
})
