import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { revealTerminalPane } from '@/lib/workspace/activation/reveal-terminal-pane'
import { createPtyFloatPillGroupsSelector } from './pty-float-pill-groups'
import type { PtyFloatPillGroup } from '../../../../shared/terminal/pty-float-pill-snapshot'
import { sendPtyFloatPillMessage } from './pty-float-pill-send-message'

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
