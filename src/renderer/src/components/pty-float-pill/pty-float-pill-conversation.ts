import type { AppState } from '@/store/types'
import {
  deriveTerminalAgentSendTarget,
  deriveStructuredAgentSendTarget
} from '@/lib/agent-session/messaging/running-agent-targets'
import type { AgentStatusEntry } from '../../../../shared/agent-status/contracts/agent-status-types'
import { AGENT_STATUS_ASSISTANT_MESSAGE_MAX_LENGTH } from '../../../../shared/agent-status/contracts/agent-status-types'
import { parsePaneKey } from '../../../../shared/workspace-layout/stable-pane-id'
import type { TerminalTab } from '../../../../shared/workspace-layout/terminal-tab-types'
import type { PtyFloatPillConversation } from '../../../../shared/terminal/pty-float-pill-snapshot'
import type { Tab } from '../../../../shared/workspace-layout/tab-groups/tab-types'
import { structuredAgentSessionPaneKey } from '../../../../shared/agent-session/view/structured-agent-session-projection'
import { structuredAgentSessionOwnerForTab } from '@/runtime/native-chat/session-ownership/structured-agent-session-owner'

type Pane = { leafId: string; entry: AgentStatusEntry }

function lastAssistantMessage(entry: AgentStatusEntry | null): string | null {
  const message =
    (!entry?.lastAssistantMessageIsToolOutput && entry?.lastAssistantMessage?.trim()) ||
    entry?.lastCompletedAssistantMessage?.trim() ||
    null
  return message?.slice(0, AGENT_STATUS_ASSISTANT_MESSAGE_MAX_LENGTH) ?? null
}

export function ptyFloatPillStructuredConversation(
  state: AppState,
  tab: Tab
): PtyFloatPillConversation | null {
  const paneKey = structuredAgentSessionPaneKey(tab.id, tab.entityId)
  const entry = state.agentStatusByPaneKey.get(paneKey) ?? null
  const target = deriveStructuredAgentSendTarget(tab, entry)
  const pane = parsePaneKey(paneKey)
  if (!target || !pane || (entry?.worktreeId && entry.worktreeId !== tab.worktreeId)) {
    return null
  }
  return {
    kind: 'structured-session',
    executionHostId: structuredAgentSessionOwnerForTab(state, tab),
    leafId: pane.leafId,
    ptyId: null,
    sessionId: target.sessionId,
    lastMessage: lastAssistantMessage(entry),
    disabledReason: target.disabledReason ?? null
  }
}

export function ptyFloatPillConversation(
  state: AppState,
  tab: TerminalTab,
  pane: Pane
): PtyFloatPillConversation {
  const { entry, leafId } = pane
  const target = deriveTerminalAgentSendTarget(state, tab, leafId, entry)
  return {
    kind: 'terminal',
    leafId,
    ptyId: target.ptyId,
    sessionId: entry.orcaSessionId ?? entry.providerSession?.id ?? null,
    lastMessage: lastAssistantMessage(entry),
    disabledReason: target.disabledReason ?? null
  }
}

export function createPtyFloatPillConversationSelector() {
  let statuses: AppState['agentStatusByPaneKey'] | null = null
  let byTab = new Map<string, Pane[]>()
  return (state: AppState, tab: TerminalTab): PtyFloatPillConversation | null => {
    if (statuses !== state.agentStatusByPaneKey) {
      statuses = state.agentStatusByPaneKey
      byTab = new Map()
      for (const [paneKey, entry] of statuses) {
        const parsed = parsePaneKey(paneKey)
        if (parsed) {
          const panes = byTab.get(parsed.tabId) ?? []
          panes.push({ leafId: parsed.leafId, entry })
          byTab.set(parsed.tabId, panes)
        }
      }
    }
    const panes = byTab
      .get(tab.id)
      ?.filter(({ entry }) => !entry.worktreeId || entry.worktreeId === tab.worktreeId)
    const activeLeafId = state.terminalLayoutsByTabId[tab.id]?.activeLeafId
    const selected =
      panes?.find((pane) => pane.leafId === activeLeafId) ??
      panes?.reduce<Pane | undefined>(
        (latest, pane) =>
          !latest || pane.entry.updatedAt > latest.entry.updatedAt ? pane : latest,
        undefined
      )
    return selected ? ptyFloatPillConversation(state, tab, selected) : null
  }
}
