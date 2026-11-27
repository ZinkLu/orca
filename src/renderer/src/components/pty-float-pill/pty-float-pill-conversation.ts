import type { AppState } from '@/store/types'
import { deriveTerminalAgentSendTarget } from '@/lib/agent-session/messaging/running-agent-targets'
import type { AgentStatusEntry } from '../../../../shared/agent-status/contracts/agent-status-types'
import { AGENT_STATUS_ASSISTANT_MESSAGE_MAX_LENGTH } from '../../../../shared/agent-status/contracts/agent-status-types'
import { parsePaneKey } from '../../../../shared/workspace-layout/stable-pane-id'
import type { TerminalTab } from '../../../../shared/workspace-layout/terminal-tab-types'
import type { PtyFloatPillConversation } from '../../../../shared/terminal/pty-float-pill-snapshot'

type Pane = { leafId: string; entry: AgentStatusEntry }

export function ptyFloatPillConversation(
  state: AppState,
  tab: TerminalTab,
  pane: Pane
): PtyFloatPillConversation {
  const { entry, leafId } = pane
  const target = deriveTerminalAgentSendTarget(state, tab, leafId, entry)
  const message =
    (!entry.lastAssistantMessageIsToolOutput && entry.lastAssistantMessage?.trim()) ||
    entry.lastCompletedAssistantMessage?.trim() ||
    null
  return {
    leafId,
    ptyId: target.ptyId,
    sessionId: entry.orcaSessionId ?? entry.providerSession?.id ?? null,
    lastMessage: message?.slice(0, AGENT_STATUS_ASSISTANT_MESSAGE_MAX_LENGTH) ?? null,
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
