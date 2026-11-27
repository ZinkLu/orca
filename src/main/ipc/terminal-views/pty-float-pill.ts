import { ipcMain } from 'electron'
import type { Store } from '../../persistence/loading-store/store'
import type {
  PtyFloatPillGroup,
  PtyFloatPillMessageReply,
  PtyFloatPillSendResult
} from '../../../shared/terminal/pty-float-pill-snapshot'
import { requestRendererReply } from '../../window/renderer-relays/renderer-reply-request'
import { createStoreNativeSettingsProjection } from '../../core-desktop/native-settings-projection'
import {
  closePtyFloatPillWindow,
  createPtyFloatPillWindow,
  getPtyFloatPillWindow,
  resetPtyFloatPillPosition,
  resizePtyFloatPill
} from '../../window/pty-float-pill-window'
import { safelyRevealWindow } from '../../window/activation/focus-existing-window'
import { getTrustedUIRendererWindow, sendToTrustedUIRenderer } from '../ui'
import {
  admittedPtyFloatPillTarget,
  admittedPtyFloatPillMessage,
  PtyFloatPillSizeSchema,
  PtyFloatPillSnapshotSchema
} from './pty-float-pill-payload'

export function registerPtyFloatPillHandlers(store: Store): void {
  const nativeSettings = createStoreNativeSettingsProjection(store)
  let groups: readonly PtyFloatPillGroup[] = []
  const enabled = (): boolean => store.getSettings().experimentalPtyFloatPill === true
  const isPill = (event: Electron.IpcMainInvokeEvent): boolean =>
    enabled() && getPtyFloatPillWindow()?.webContents === event.sender

  store.onSettingsChanged((updates) => {
    if (!('experimentalPtyFloatPill' in updates)) {
      return
    }
    if (enabled()) {
      sendToTrustedUIRenderer('ptyFloatPill:snapshotRequested', null)
    } else {
      groups = []
      closePtyFloatPillWindow()
    }
  })
  ipcMain.handle('ptyFloatPill:publishSnapshot', (event, value: unknown) => {
    const owner = getTrustedUIRendererWindow()
    if (!enabled() || owner?.webContents !== event.sender) {
      return
    }
    const result = PtyFloatPillSnapshotSchema.safeParse(value)
    if (!result.success) {
      return
    }
    groups = result.data
    createPtyFloatPillWindow(nativeSettings, event.sender).webContents.send(
      'ptyFloatPill:snapshot',
      groups
    )
  })
  ipcMain.handle('ptyFloatPill:requestSnapshot', (event) => {
    if (isPill(event)) {
      event.sender.send('ptyFloatPill:snapshot', groups)
      sendToTrustedUIRenderer('ptyFloatPill:snapshotRequested', null)
    }
  })
  ipcMain.handle('ptyFloatPill:resetPosition', async (event) => {
    if (getTrustedUIRendererWindow()?.webContents !== event.sender) {
      return
    }
    await resetPtyFloatPillPosition(nativeSettings)
    sendToTrustedUIRenderer('ptyFloatPill:snapshotRequested', null)
  })
  ipcMain.handle('ptyFloatPill:resize', (event, value: unknown) => {
    if (!isPill(event)) {
      return
    }
    const result = PtyFloatPillSizeSchema.safeParse(value)
    if (result.success) {
      resizePtyFloatPill(result.data)
    }
  })
  ipcMain.handle('ptyFloatPill:revealTerminal', (event, value: unknown) => {
    if (!isPill(event)) {
      return
    }
    const target = admittedPtyFloatPillTarget(groups, value)
    const owner = getTrustedUIRendererWindow()
    if (target && owner) {
      owner.webContents.send('ptyFloatPill:revealTerminal', target)
      safelyRevealWindow(owner)
    }
  })
  const sending = new Set<string>()
  ipcMain.handle(
    'ptyFloatPill:sendMessage',
    async (event, value: unknown): Promise<PtyFloatPillSendResult> => {
      const owner = getTrustedUIRendererWindow()
      const message = isPill(event) ? admittedPtyFloatPillMessage(groups, value) : null
      const targetKey =
        message &&
        JSON.stringify([
          message.kind,
          message.kind === 'structured-session' ? message.executionHostId : null,
          message.ptyId ?? message.sessionId
        ])
      if (!owner || !message || !targetKey || sending.has(targetKey)) {
        return { status: 'failed' }
      }
      sending.add(targetKey)
      try {
        return await requestRendererReply<PtyFloatPillMessageReply>(owner, {
          requestChannel: 'ptyFloatPill:sendMessageRequested',
          replyChannel: 'ptyFloatPill:messageReply',
          payload: message,
          timeoutMs: 90_000,
          timeoutError: 'pty_float_pill_send_timeout'
        })
      } catch {
        return { status: 'unconfirmed' }
      } finally {
        sending.delete(targetKey)
      }
    }
  )
}
