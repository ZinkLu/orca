import { useState } from 'react'
import { acceptedAgentStatuses } from '@/store/slices/agent-status/status-ownership/accepted-agent-statuses'
import { makeFolderWorkspace } from '@/store/folder-workspaces/folder-workspace.test-fixture'
import { makeWorktree } from '@/store/slices/worktrees/worktree.test-fixture'
import { makeTab } from '@/store/terminals/testing/terminal-tab.test-fixture'
import { useAppStore } from '@/store'
import { defineFixture } from '../../component-fixtures/component-fixture'
import type { AgentStatusEntry } from '../../../../shared/agent-status/contracts/agent-status-types'
import { FLOATING_TERMINAL_WORKTREE_ID } from '../../../../shared/workspace/identity/floating-workspace-id'
import { PtyFloatPill } from './PtyFloatPill'
import { PtyFloatPillDetail } from './PtyFloatPillDetail'
import { createPtyFloatPillGroupsSelector } from './pty-float-pill-groups'
import type { Tab } from '../../../../shared/workspace-layout/tab-groups/tab-types'
import { structuredAgentSessionPaneKey } from '../../../../shared/agent-session/view/structured-agent-session-projection'

const checkout = makeWorktree({ id: 'pill-repo::/preview/orca', repoId: 'pill-repo' })
checkout.displayName = 'orca'
const review = makeWorktree({ id: 'pill-repo::/preview/review', repoId: 'pill-repo' })
review.displayName = 'release-notes'
const folder = makeFolderWorkspace({ id: 'pill-notes', name: 'notes' })

// [tabId, workspace, title, live PTY, agent state]
const terminals: [string, string, string, boolean, AgentStatusEntry['state'] | null][] = [
  ['claude', checkout.id, 'Claude Code', true, 'working'],
  ['codex', checkout.id, 'Codex', true, 'blocked'],
  ['shell', checkout.id, 'zsh', true, null],
  ['reviewer', review.id, 'Review the changelog draft', true, 'done'],
  ['dev', review.id, 'pnpm dev', false, null],
  ['notes', `folder:${folder.id}`, 'Claude Code', true, 'working'],
  ['scratch', FLOATING_TERMINAL_WORKTREE_ID, 'htop', true, null]
]

function leafId(index: number): string {
  return `0000000${index}-0000-4000-8000-000000000000`
}

// Stamped per render: rows older than the freshness window stop counting as live.
function agentStatuses() {
  const now = Date.now()
  const rows = terminals.flatMap(([tabId, worktreeId, , , state], index) => {
    const paneKey = `${tabId}:${leafId(index)}`
    return state
      ? [
          [
            paneKey,
            {
              paneKey,
              worktreeId,
              agentType: 'claude',
              state,
              prompt: '',
              updatedAt: now,
              stateStartedAt: now,
              stateHistory: [],
              lastAssistantMessage:
                index === 0
                  ? '已完成桌面悬浮窗的消息预览。\n\n状态后会显示最新回复，点击可以展开详情，并直接向这个会话发送后续指令。\n\n接下来会验证远程终端的消息发送和权限提示。'
                  : index === 1
                    ? '需要你确认是否执行 pnpm install。'
                    : 'Changelog draft is ready for review.'
            } satisfies AgentStatusEntry
          ] as const
        ]
      : []
  })
  return acceptedAgentStatuses(rows)
}

function store() {
  const tabsByWorktree: Record<string, ReturnType<typeof makeTab>[]> = {}
  terminals.forEach(([id, worktreeId, title], index) => {
    ;(tabsByWorktree[worktreeId] ??= []).push(makeTab({ id, worktreeId, title, sortOrder: index }))
  })
  return {
    worktreesByRepo: { 'pill-repo': [checkout, review] },
    folderWorkspaces: [folder],
    tabsByWorktree,
    terminalLayoutsByTabId: Object.fromEntries(
      terminals.map(([tabId, , , live], index) => [
        tabId,
        {
          root: null,
          activeLeafId: leafId(index),
          expandedLeafId: null,
          ptyIdsByLeafId: live ? { [leafId(index)]: `pty-${tabId}` } : {}
        }
      ])
    ),
    ptyIdsByTabId: Object.fromEntries(
      terminals.flatMap(([tabId, , , live]) => (live ? [[tabId, [`pty-${tabId}`]]] : []))
    )
  }
}

function pill(expanded: boolean) {
  return defineFixture({
    width: 400,
    store: store(),
    setup: () => {
      useAppStore.setState({ agentStatusByPaneKey: agentStatuses() })
    },
    render: () => (
      <div className="w-max p-2">
        <PtyFloatPill
          groups={createPtyFloatPillGroupsSelector()(useAppStore.getState())}
          expanded={expanded}
          onToggle={() => {}}
          onSelect={() => {}}
        />
      </div>
    )
  })
}

export const expanded = pill(true)
export const collapsed = pill(false)

export const empty = defineFixture({
  width: 400,
  render: () => (
    <div className="w-max p-2">
      <PtyFloatPill groups={[]} expanded onToggle={() => {}} onSelect={() => {}} />
    </div>
  )
})

const chat: Tab = {
  id: 'structured-agent-session-pill-chat',
  entityId: 'pill-chat',
  groupId: 'pill-chats',
  worktreeId: `folder:${folder.id}`,
  executionHostId: 'local',
  contentType: 'agent-session',
  agentSessionAgent: 'pi',
  label: 'Pi',
  customLabel: null,
  color: null,
  sortOrder: 0,
  createdAt: 1
}

export const nativeChatOnly = defineFixture({
  width: 400,
  store: {
    folderWorkspaces: [folder],
    tabsByWorktree: {},
    unifiedTabsByWorktree: { [chat.worktreeId]: [chat] }
  },
  setup: () => {
    const paneKey = structuredAgentSessionPaneKey(chat.id, chat.entityId)
    useAppStore.setState({
      agentStatusByPaneKey: acceptedAgentStatuses([
        [
          paneKey,
          {
            paneKey,
            worktreeId: chat.worktreeId,
            agentType: 'pi',
            state: 'done',
            prompt: '',
            updatedAt: Date.now(),
            stateStartedAt: Date.now(),
            stateHistory: [],
            lastAssistantMessage: '已完成检查，可以继续。',
            structuredHostOwned: true
          }
        ]
      ])
    })
  },
  render: () => (
    <div className="w-max p-2">
      <PtyFloatPill
        groups={createPtyFloatPillGroupsSelector()(useAppStore.getState())}
        expanded
        onToggle={() => {}}
        onSelect={() => {}}
      />
    </div>
  )
})

function DetailFixture(): React.JSX.Element {
  const [draft, setDraft] = useState('继续验证远程终端，完成后告诉我结果。')
  const groups = createPtyFloatPillGroupsSelector()(useAppStore.getState())
  const group = groups.find((group) => group.worktreeId === checkout.id)!
  const entry = group.entries[0]
  return (
    <div className="w-max p-2">
      <PtyFloatPill
        groups={groups}
        expanded
        onToggle={() => {}}
        onSelect={() => {}}
        detail={
          <PtyFloatPillDetail
            entry={entry}
            workspaceName="orca"
            available
            draft={draft}
            onDraftChange={setDraft}
            onBack={() => {}}
            onReveal={() => {}}
            onSend={async () => ({ status: 'sent' })}
          />
        }
      />
    </div>
  )
}

export const detail = defineFixture({
  width: 400,
  store: store(),
  setup: () => useAppStore.setState({ agentStatusByPaneKey: agentStatuses() }),
  render: () => <DetailFixture />
})
