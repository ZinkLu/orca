import { expect, test } from 'vitest'
import {
  admittedPtyFloatPillTarget,
  admittedPtyFloatPillMessage,
  PtyFloatPillSnapshotSchema
} from './pty-float-pill-payload'

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

test('sending is admitted only for the published writable pane and its current session', () => {
  const groups = PtyFloatPillSnapshotSchema.parse([
    {
      worktreeId: 'folder:notes',
      name: 'Notes',
      entries: [
        {
          tabId: 'codex',
          title: 'Codex',
          status: 'done',
          conversation: {
            kind: 'terminal',
            leafId: '00000000-0000-4000-8000-000000000000',
            ptyId: 'pty-codex',
            sessionId: 'session-one',
            lastMessage: 'Ready',
            disabledReason: null
          }
        }
      ]
    }
  ])
  const message = {
    kind: 'terminal',
    worktreeId: 'folder:notes',
    tabId: 'codex',
    leafId: '00000000-0000-4000-8000-000000000000',
    ptyId: 'pty-codex',
    sessionId: 'session-one',
    prompt: 'Continue'
  }
  expect(admittedPtyFloatPillMessage(groups, message)).toEqual(message)
  expect(
    admittedPtyFloatPillTarget(groups, {
      worktreeId: 'folder:notes',
      tabId: 'codex',
      leafId: '00000000-0000-4000-8000-000000000000'
    })
  ).toEqual({
    worktreeId: 'folder:notes',
    tabId: 'codex',
    leafId: '00000000-0000-4000-8000-000000000000'
  })
  expect(
    admittedPtyFloatPillTarget(groups, {
      worktreeId: 'folder:notes',
      tabId: 'codex',
      leafId: '00000001-0000-4000-8000-000000000000'
    })
  ).toBeNull()
  expect(admittedPtyFloatPillMessage(groups, { ...message, worktreeId: 'remote:repo' })).toBeNull()
  expect(
    admittedPtyFloatPillMessage(groups, {
      ...message,
      leafId: '00000001-0000-4000-8000-000000000000'
    })
  ).toBeNull()
  expect(admittedPtyFloatPillMessage(groups, { ...message, ptyId: 'replacement-pty' })).toBeNull()
  expect(
    admittedPtyFloatPillMessage(groups, { ...message, sessionId: 'replacement-session' })
  ).toBeNull()
  expect(admittedPtyFloatPillMessage(groups, { ...message, prompt: '   ' })).toBeNull()
  expect(admittedPtyFloatPillMessage(groups, { ...message, prompt: 'x'.repeat(16_001) })).toBeNull()
  groups[0].entries[0].conversation!.disabledReason = 'Agent needs permission'
  expect(admittedPtyFloatPillMessage(groups, message)).toBeNull()
})

test('a chat reply is bound to its published session, workspace and transport', () => {
  const groups = PtyFloatPillSnapshotSchema.parse([
    {
      worktreeId: 'folder:notes',
      name: 'Notes',
      entries: [
        {
          tabId: 'chat-slot',
          title: 'Pi',
          status: 'done',
          conversation: {
            kind: 'structured-session',
            executionHostId: 'local',
            leafId: '00000000-0000-4000-8000-000000000000',
            ptyId: null,
            sessionId: 'chat-one',
            lastMessage: 'Ready',
            disabledReason: null
          }
        }
      ]
    }
  ])
  const message = {
    kind: 'structured-session',
    executionHostId: 'local',
    worktreeId: 'folder:notes',
    tabId: 'chat-slot',
    leafId: '00000000-0000-4000-8000-000000000000',
    ptyId: null,
    sessionId: 'chat-one',
    prompt: 'Continue'
  }
  expect(admittedPtyFloatPillMessage(groups, message)).toEqual(message)
  expect(admittedPtyFloatPillMessage(groups, { ...message, sessionId: 'chat-two' })).toBeNull()
  expect(
    admittedPtyFloatPillMessage(groups, { ...message, executionHostId: 'host:other' })
  ).toBeNull()
  expect(admittedPtyFloatPillMessage(groups, { ...message, worktreeId: 'remote:notes' })).toBeNull()
  expect(admittedPtyFloatPillMessage(groups, { ...message, kind: 'terminal' })).toBeNull()
  expect(admittedPtyFloatPillMessage(groups, { ...message, ptyId: 'terminal-one' })).toBeNull()
  expect(admittedPtyFloatPillMessage(groups, { ...message, sessionId: null })).toBeNull()
  groups[0].entries[0].conversation!.disabledReason = 'Agent needs permission'
  expect(admittedPtyFloatPillMessage(groups, message)).toBeNull()
})
