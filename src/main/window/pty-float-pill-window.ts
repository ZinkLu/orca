import { app, BrowserWindow, screen, type WebContents } from 'electron'
import { join } from 'node:path'
import type { NativeSettingsProjection } from '../core-desktop/native-settings-projection'
import type { PtyFloatPillSize } from '../../shared/terminal/pty-float-pill-snapshot'
import { isBackgroundLaunch } from './activation/foreground-activation-policy'
import { installPrivilegedWindowNavigationPolicy } from './security/privileged-window-navigation'
import { rendererPublicationThrottle } from './visibility/renderer-publication-throttle'
import { rectHasVisibleAreaOnAnyDisplay } from './presentation/window-bounds-validation'

const EDGE_GAP = 8
let pillWindow: BrowserWindow | null = null
let presentPill = (): void => {}

export function getPtyFloatPillWindow(): BrowserWindow | null {
  return pillWindow && !pillWindow.isDestroyed() && !pillWindow.webContents.isDestroyed()
    ? pillWindow
    : null
}

function fitToDisplay(window: BrowserWindow, size: PtyFloatPillSize): void {
  const bounds = window.getBounds()
  const area = screen.getDisplayMatching(bounds).workArea
  const width = Math.min(Math.ceil(size.width), area.width)
  const height = Math.min(Math.ceil(size.height), area.height)
  const next = {
    x: Math.round(Math.min(Math.max(bounds.x, area.x), area.x + area.width - width)),
    y: Math.round(Math.min(Math.max(bounds.y, area.y), area.y + area.height - height)),
    width,
    height
  }
  if (
    next.x !== bounds.x ||
    next.y !== bounds.y ||
    width !== bounds.width ||
    height !== bounds.height
  ) {
    window.setBounds(next)
  }
}

export function resizePtyFloatPill(size: PtyFloatPillSize): void {
  const window = getPtyFloatPillWindow()
  if (window) {
    fitToDisplay(window, size)
    presentPill()
  }
}

export function createPtyFloatPillWindow(
  nativeSettings: NativeSettingsProjection,
  owner: WebContents
): BrowserWindow {
  const existing = getPtyFloatPillWindow()
  if (existing) {
    if (existing.webContents.isCrashed()) {
      existing.webContents.reload()
    }
    return existing
  }
  const area = screen.getPrimaryDisplay().workArea
  const rawPosition = nativeSettings.getUI().ptyFloatPillPosition
  const saved =
    rawPosition &&
    Number.isFinite(rawPosition.x) &&
    Number.isFinite(rawPosition.y) &&
    rectHasVisibleAreaOnAnyDisplay({ ...rawPosition, width: 304, height: 48 }, 32, 24)
      ? rawPosition
      : null
  const window = new BrowserWindow({
    x: Math.round(saved?.x ?? area.x + (area.width - 304) / 2),
    y: Math.round(saved?.y ?? area.y + EDGE_GAP),
    width: 304,
    height: 48,
    title: 'Orca — Terminal status',
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    acceptFirstMouse: true,
    ...(process.platform === 'darwin' ? { type: 'panel' as const } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      partition: 'persist:orca-pty-float-pill',
      backgroundThrottling: false,
      webviewTag: false
    }
  })
  pillWindow = window
  window.setAlwaysOnTop(true, 'floating')
  if (process.platform === 'darwin') {
    window.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true
    })
  }
  fitToDisplay(window, { width: 304, height: 48 })
  installPrivilegedWindowNavigationPolicy(window.webContents)
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false)
  )
  window.webContents.session.setPermissionCheckHandler(() => false)

  // The main renderer owns status selectors, even while its window is minimized.
  const releasePublication = rendererPublicationThrottle.acquire(owner)
  let ready = false
  let measured = false
  presentPill = (): void => {
    measured = true
    if (ready && !isBackgroundLaunch() && !window.isDestroyed() && !window.isVisible()) {
      window.showInactive()
    }
  }
  window.once('ready-to-show', () => {
    ready = true
    if (measured) {
      presentPill()
    }
  })

  let positionTimer: ReturnType<typeof setTimeout> | null = null
  const savePosition = (): void => {
    if (positionTimer) {
      clearTimeout(positionTimer)
      positionTimer = null
    }
    if (!window.isDestroyed()) {
      const { x, y } = window.getBounds()
      void nativeSettings.requestCoreWrite({
        kind: 'ui',
        updates: { ptyFloatPillPosition: { x, y } }
      })
    }
  }
  window.on('move', () => {
    if (positionTimer) {
      clearTimeout(positionTimer)
    }
    positionTimer = setTimeout(savePosition, 250)
  })
  const refit = (): void => {
    if (!window.isDestroyed()) {
      fitToDisplay(window, window.getBounds())
    }
  }
  screen.on('display-removed', refit)
  screen.on('display-metrics-changed', refit)
  owner.once('destroyed', closePtyFloatPillWindow)
  window.on('close', savePosition)
  window.on('closed', () => {
    if (positionTimer) {
      clearTimeout(positionTimer)
    }
    screen.off('display-removed', refit)
    screen.off('display-metrics-changed', refit)
    owner.off('destroyed', closePtyFloatPillWindow)
    releasePublication()
    if (pillWindow === window) {
      pillWindow = null
      presentPill = () => {}
    }
  })
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(`${process.env.ELECTRON_RENDERER_URL}/pty-float-pill.html`)
  } else {
    void window.loadFile(join(__dirname, '../renderer/pty-float-pill.html'))
  }
  return window
}

export function closePtyFloatPillWindow(): void {
  getPtyFloatPillWindow()?.close()
}
