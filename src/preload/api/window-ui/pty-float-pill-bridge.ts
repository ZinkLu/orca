import { ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  PtyFloatPillApi,
  PtyFloatPillGroup,
  PtyFloatPillMessageRequest,
  PtyFloatPillTarget
} from '../../../shared/terminal/pty-float-pill-snapshot'

export const ptyFloatPillApi: PtyFloatPillApi = {
  publishSnapshot: (groups) => ipcRenderer.invoke('ptyFloatPill:publishSnapshot', groups),
  requestSnapshot: () => ipcRenderer.invoke('ptyFloatPill:requestSnapshot'),
  resize: (size) => ipcRenderer.invoke('ptyFloatPill:resize', size),
  resetPosition: () => ipcRenderer.invoke('ptyFloatPill:resetPosition'),
  revealTerminal: (target) => ipcRenderer.invoke('ptyFloatPill:revealTerminal', target),
  sendMessage: (message) => ipcRenderer.invoke('ptyFloatPill:sendMessage', message),
  replyToMessage: (reply) => ipcRenderer.send('ptyFloatPill:messageReply', reply),
  onSendMessage: (callback) => {
    const listener = (_event: IpcRendererEvent, request: PtyFloatPillMessageRequest): void =>
      callback(request)
    ipcRenderer.on('ptyFloatPill:sendMessageRequested', listener)
    return () => ipcRenderer.removeListener('ptyFloatPill:sendMessageRequested', listener)
  },
  onSnapshot: (callback) => {
    const listener = (_event: IpcRendererEvent, groups: PtyFloatPillGroup[]): void =>
      callback(groups)
    ipcRenderer.on('ptyFloatPill:snapshot', listener)
    return () => ipcRenderer.removeListener('ptyFloatPill:snapshot', listener)
  },
  onSnapshotRequested: (callback) => {
    const listener = (): void => callback()
    ipcRenderer.on('ptyFloatPill:snapshotRequested', listener)
    return () => ipcRenderer.removeListener('ptyFloatPill:snapshotRequested', listener)
  },
  onRevealTerminal: (callback) => {
    const listener = (_event: IpcRendererEvent, target: PtyFloatPillTarget): void =>
      callback(target)
    ipcRenderer.on('ptyFloatPill:revealTerminal', listener)
    return () => ipcRenderer.removeListener('ptyFloatPill:revealTerminal', listener)
  }
}
