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
    if (groups.length === 0) {
      closePtyFloatPillWindow()
      return
    }
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
      if (!owner || !message || sending.has(message.ptyId)) {
        return { status: 'failed' }
      }
      sending.add(message.ptyId)
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
        sending.delete(message.ptyId)
      }
    }
  )
}
