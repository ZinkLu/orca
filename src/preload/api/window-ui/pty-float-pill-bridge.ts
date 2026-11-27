import { ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  PtyFloatPillApi,
  PtyFloatPillGroup,
  PtyFloatPillTarget
} from '../../../shared/terminal/pty-float-pill-snapshot'

export const ptyFloatPillApi: PtyFloatPillApi = {
  publishSnapshot: (groups) => ipcRenderer.invoke('ptyFloatPill:publishSnapshot', groups),
  requestSnapshot: () => ipcRenderer.invoke('ptyFloatPill:requestSnapshot'),
  resize: (size) => ipcRenderer.invoke('ptyFloatPill:resize', size),
  revealTerminal: (target) => ipcRenderer.invoke('ptyFloatPill:revealTerminal', target),
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
