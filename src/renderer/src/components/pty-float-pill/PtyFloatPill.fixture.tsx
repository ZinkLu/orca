import { acceptedAgentStatuses } from '@/store/slices/agent-status/status-ownership/accepted-agent-statuses'
import { makeFolderWorkspace } from '@/store/folder-workspaces/folder-workspace.test-fixture'
import { makeWorktree } from '@/store/slices/worktrees/worktree.test-fixture'
import { makeTab } from '@/store/terminals/testing/terminal-tab.test-fixture'
import { useAppStore } from '@/store'
import { defineFixture } from '../../component-fixtures/component-fixture'
import type { AgentStatusEntry } from '../../../../shared/agent-status/contracts/agent-status-types'
import { FLOATING_TERMINAL_WORKTREE_ID } from '../../../../shared/workspace/identity/floating-workspace-id'
import { PtyFloatPill } from './PtyFloatPill'

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
              stateHistory: []
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
    ptyIdsByTabId: Object.fromEntries(
      terminals.flatMap(([tabId, , , live]) => (live ? [[tabId, [`pty-${tabId}`]]] : []))
    )
  }
}

function pill(expanded: boolean) {
  return defineFixture({
    width: 320,
    store: store(),
    setup: () => {
      useAppStore.setState({ agentStatusByPaneKey: agentStatuses() })
      window.localStorage.setItem(
        'orca-pty-float-pill-placement',
        JSON.stringify({ position: { x: 8, y: 36 }, expanded })
      )
    },
    // A transform makes the wrapper contain the fixed-position pill, so the frame measures it.
    render: () => (
      <div style={{ height: expanded ? 330 : 80, transform: 'translateZ(0)' }}>
        <PtyFloatPill />
      </div>
    )
  })
}

export const expanded = pill(true)
export const collapsed = pill(false)
