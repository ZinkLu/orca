import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { revealTerminalPane } from '@/lib/workspace/activation/reveal-terminal-pane'
import { createPtyFloatPillGroupsSelector } from './pty-float-pill-groups'
import type { PtyFloatPillGroup } from '../../../../shared/terminal/pty-float-pill-snapshot'
import { sendPtyFloatPillMessage } from './pty-float-pill-send-message'
import { isStructuredTab } from '../../../../shared/agent-session/view/structured-agent-session-tab'
import { ptyFloatPillStructuredConversation } from './pty-float-pill-conversation'
import { activateAndRevealWorkspace } from '@/lib/workspace/activation/worktree-activation'
import { requestNativeChatComposerFocus } from '@/components/native-chat/composer/focus/native-chat-composer-focus-intent'

function subscribePtyFloatPillBridge(): () => void {
  const api = window.api.ptyFloatPill
  const selectGroups = createPtyFloatPillGroupsSelector()
  let published: readonly PtyFloatPillGroup[] | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  const publish = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    const groups = selectGroups(useAppStore.getState())
    if (groups !== published) {
      published = groups
      void api.publishSnapshot(groups).catch((error: unknown) => {
        published = null
        console.warn('[pty-float-pill] Failed to publish terminal status', error)
      })
    }
  }
  const unsubscribe = useAppStore.subscribe(() => {
    if (!timer && selectGroups(useAppStore.getState()) !== published) {
      timer = setTimeout(publish, 100)
    }
  })
  const offRequested = api.onSnapshotRequested(() => {
    published = null
    publish()
  })
  const offReveal = api.onRevealTerminal(({ worktreeId, tabId, leafId }) => {
    const state = useAppStore.getState()
    const chat = state.unifiedTabsByWorktree[worktreeId]?.find(
      (tab) => tab.id === tabId && isStructuredTab(tab)
    )
    if (chat) {
      if (leafId && ptyFloatPillStructuredConversation(state, chat)?.leafId !== leafId) {
        return
      }
      if (
        activateAndRevealWorkspace(worktreeId, { executionHostId: chat.executionHostId }) !== false
      ) {
        state.activateTab(tabId, { worktreeId })
        requestNativeChatComposerFocus(tabId)
      }
      return
    }
    if (!state.tabsByWorktree[worktreeId]?.some((tab) => tab.id === tabId)) {
      return
    }
    revealTerminalPane({
      worktreeId,
      tabId,
      leafId: leafId ?? state.terminalLayoutsByTabId[tabId]?.activeLeafId ?? null,
      executionHostId: null
    })
  })
  const offSend = api.onSendMessage((request) => {
    void sendPtyFloatPillMessage(request).then(
      (result) => api.replyToMessage({ ...result, requestId: request.requestId }),
      () => api.replyToMessage({ status: 'unconfirmed', requestId: request.requestId })
    )
  })
  publish()
  return () => {
    unsubscribe()
    offRequested()
    offReveal()
    offSend()
    if (timer) {
      clearTimeout(timer)
    }
  }
}

export default function PtyFloatPillBridge(): null {
  useEffect(subscribePtyFloatPillBridge, [])
  return null
}
