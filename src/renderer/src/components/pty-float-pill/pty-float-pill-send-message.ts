import { useAppStore } from '@/store'
import { sendMessageToAgent } from '@/lib/agent-session/messaging/agent-message-send'
import { activeAgentNotesSendFailureMessage } from '@/lib/agent-session/messaging/terminal/active-agent-note-send-result'
import { agentSendDisabledReasonLabel } from '@/lib/agent-session/messaging/agent-send-disabled-reason-label'
import { makePaneKey } from '../../../../shared/workspace-layout/stable-pane-id'
import { matchesPtyFloatPillMessageTarget } from '../../../../shared/terminal/pty-float-pill-message-target'
import type {
  PtyFloatPillMessage,
  PtyFloatPillSendResult
} from '../../../../shared/terminal/pty-float-pill-snapshot'
import { ptyFloatPillConversation } from './pty-float-pill-conversation'

export async function sendPtyFloatPillMessage(
  message: PtyFloatPillMessage
): Promise<PtyFloatPillSendResult> {
  const state = useAppStore.getState()
  const tab = state.tabsByWorktree[message.worktreeId]?.find((tab) => tab.id === message.tabId)
  const entry = state.agentStatusByPaneKey.get(makePaneKey(message.tabId, message.leafId))
  if (!tab || !entry || (entry.worktreeId && entry.worktreeId !== message.worktreeId)) {
    return { status: 'failed' }
  }
  const current = ptyFloatPillConversation(state, tab, { leafId: message.leafId, entry })
  if (!matchesPtyFloatPillMessageTarget(current, message)) {
    return { status: 'failed' }
  }
  if (current.disabledReason) {
    return { status: 'failed', message: agentSendDisabledReasonLabel(current.disabledReason) }
  }
  const result = await sendMessageToAgent({
    worktreeId: message.worktreeId,
    target: { kind: 'terminal', tabId: message.tabId, leafId: message.leafId },
    prompt: message.prompt
  })
  return result.status === 'sent'
    ? { status: 'sent' }
    : {
        status:
          result.status === 'unconfirmed' || result.status === 'partial-submit-failed'
            ? 'unconfirmed'
            : 'failed',
        message: activeAgentNotesSendFailureMessage(result.status, {
          explicitTarget: true,
          subject: 'message'
        })
      }
}
