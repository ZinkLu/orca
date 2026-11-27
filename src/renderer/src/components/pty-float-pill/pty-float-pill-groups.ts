import type { AppState } from '@/store/types'
import { selectOrchestrationWorkerWorkspaceLabel } from '@/lib/orchestration-worker-workspace-label'
import { createTerminalTabActivityStatusSelector } from '@/components/tab-bar/terminal-tabs/use-terminal-tab-activity'
import type { TerminalTabActivityStatus } from '@/components/tab-bar/terminal-tabs/terminal-tab-activity-status'
import { FLOATING_TERMINAL_WORKTREE_ID } from '../../../../shared/workspace/identity/floating-workspace-id'
import { resolveTerminalTabTitle } from '../../../../shared/workspace-layout/tab-groups/tab-title-resolution'
import { compareDisplayName } from '../../../../shared/worktree/display-name-order'
import type { PtyFloatPillGroup } from '../../../../shared/terminal/pty-float-pill-snapshot'
import { matchesPtyFloatPillMessageTarget } from '../../../../shared/terminal/pty-float-pill-message-target'
import {
  createPtyFloatPillConversationSelector,
  ptyFloatPillStructuredConversation
} from './pty-float-pill-conversation'
import { getStructuredAgentSessionTabs } from '@/components/native-chat/session/status/structured-agent-session-tabs'
import { structuredAgentSessionAddressTabId } from '../../../../shared/agent-session/view/structured-agent-session-projection'
import { readStructuredChatTabName } from '@/runtime/native-chat/naming/structured-chat-tab-name'
import { isTuiAgent } from '../../../../shared/agent-launch/catalog/tui-agent-config'

type TabStatusSelector = ReturnType<typeof createTerminalTabActivityStatusSelector>

// Quiet states (live but idle, or not attached) only count toward the total.
const SUMMARY_STATUSES: readonly TerminalTabActivityStatus[] = [
  'permission',
  'failed',
  'unconfirmed',
  'working',
  'monitoring',
  'interrupted',
  'done'
]

function sameGroups(a: readonly PtyFloatPillGroup[], b: readonly PtyFloatPillGroup[]): boolean {
  return (
    a.length === b.length &&
    a.every((group, index) => {
      const other = b[index]
      return (
        group.worktreeId === other.worktreeId &&
        group.name === other.name &&
        group.entries.length === other.entries.length &&
        group.entries.every((entry, entryIndex) => {
          const otherEntry = other.entries[entryIndex]
          return (
            entry.tabId === otherEntry.tabId &&
            entry.title === otherEntry.title &&
            entry.status === otherEntry.status &&
            (entry.conversation === otherEntry.conversation ||
              (!!entry.conversation &&
                !!otherEntry.conversation &&
                matchesPtyFloatPillMessageTarget(entry.conversation, otherEntry.conversation) &&
                entry.conversation.lastMessage === otherEntry.conversation.lastMessage &&
                entry.conversation.disabledReason === otherEntry.conversation.disabledReason))
          )
        })
      )
    })
  )
}

/** Open terminal and chat tabs share the tab strip's status, grouped by workspace. */
export function createPtyFloatPillGroupsSelector(): (
  state: AppState
) => readonly PtyFloatPillGroup[] {
  const statusSelectors = new Map<string, TabStatusSelector>()
  const selectConversation = createPtyFloatPillConversationSelector()
  let previous: readonly PtyFloatPillGroup[] = []
  return (state) => {
    const generatedTitlesEnabled = state.settings?.tabAutoGenerateTitle === true
    const seenTabIds = new Set<string>()
    const groups: PtyFloatPillGroup[] = []
    for (const [worktreeId, tabs] of Object.entries(state.tabsByWorktree)) {
      const floating = worktreeId === FLOATING_TERMINAL_WORKTREE_ID
      const name = floating ? null : selectOrchestrationWorkerWorkspaceLabel(state, worktreeId)
      // A workspace this window cannot name cannot be revealed either.
      if (tabs.length === 0 || (!floating && name === null)) {
        continue
      }
      const entries = [...tabs]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((tab) => {
          seenTabIds.add(tab.id)
          let selectStatus = statusSelectors.get(tab.id)
          if (!selectStatus) {
            selectStatus = createTerminalTabActivityStatusSelector()
            statusSelectors.set(tab.id, selectStatus)
          }
          return {
            tabId: tab.id,
            title: resolveTerminalTabTitle(tab, generatedTitlesEnabled, tab.title),
            status: selectStatus(state, tab),
            conversation: selectConversation(state, tab)
          }
        })
      groups.push({ worktreeId, name, entries })
    }
    const byWorkspace = new Map(groups.map((group) => [group.worktreeId, group]))
    for (const tab of getStructuredAgentSessionTabs(state.unifiedTabsByWorktree)) {
      const name =
        tab.worktreeId === FLOATING_TERMINAL_WORKTREE_ID
          ? null
          : selectOrchestrationWorkerWorkspaceLabel(state, tab.worktreeId)
      if (name === null && tab.worktreeId !== FLOATING_TERMINAL_WORKTREE_ID) {
        continue
      }
      seenTabIds.add(tab.id)
      let selectStatus = statusSelectors.get(tab.id)
      if (!selectStatus) {
        selectStatus = createTerminalTabActivityStatusSelector()
        statusSelectors.set(tab.id, selectStatus)
      }
      let group = byWorkspace.get(tab.worktreeId)
      if (!group) {
        group = { worktreeId: tab.worktreeId, name, entries: [] }
        groups.push(group)
        byWorkspace.set(tab.worktreeId, group)
      }
      const title = readStructuredChatTabName(tab, state)
      group.entries.push({
        tabId: tab.id,
        title,
        status: selectStatus(state, {
          id: structuredAgentSessionAddressTabId(tab.id, tab.entityId),
          title,
          launchAgent: isTuiAgent(tab.agentSessionAgent) ? tab.agentSessionAgent : undefined
        }),
        conversation: ptyFloatPillStructuredConversation(state, tab)
      })
    }
    for (const tabId of statusSelectors.keys()) {
      if (!seenTabIds.has(tabId)) {
        statusSelectors.delete(tabId)
      }
    }
    // Floating terminals belong to no workspace, so they sit after the named ones.
    groups.sort(
      (a, b) =>
        Number(a.name === null) - Number(b.name === null) || compareDisplayName(a.name, b.name)
    )
    if (!sameGroups(previous, groups)) {
      previous = groups
    }
    return previous
  }
}

export function summarizePtyFloatPillGroups(groups: readonly PtyFloatPillGroup[]): {
  total: number
  counts: [TerminalTabActivityStatus, number][]
} {
  const countByStatus = new Map<TerminalTabActivityStatus, number>()
  let total = 0
  for (const group of groups) {
    for (const entry of group.entries) {
      total += 1
      countByStatus.set(entry.status, (countByStatus.get(entry.status) ?? 0) + 1)
    }
  }
  return {
    total,
    counts: SUMMARY_STATUSES.flatMap((status): [TerminalTabActivityStatus, number][] => {
      const count = countByStatus.get(status) ?? 0
      return count > 0 ? [[status, count]] : []
    })
  }
}
