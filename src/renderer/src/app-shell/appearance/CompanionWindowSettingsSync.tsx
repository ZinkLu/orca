import { useEffect } from 'react'
import type { GlobalSettings } from '../../../../shared/settings/global-settings-types'
import { useAppStore } from '@/store'
import { applyStartupAppTheme, useAppThemePaint } from './use-app-theme-paint'
import { buildAppFontFamily } from './app-font-family'
import { applyCodeFontSmoothing } from '@/lib/editor/appearance/code-font-smoothing'
import { useReduceVisualEffects } from '@/hooks/theme/use-reduce-visual-effects'

function applyCompanionFonts(settings: GlobalSettings | null): void {
  document.documentElement.style.setProperty(
    '--app-font-family',
    buildAppFontFamily(settings?.appFontFamily)
  )
  applyCodeFontSmoothing(settings?.codeFontSmoothing)
}

export function initializeCompanionWindowAppearance(): void {
  let settings: GlobalSettings | null = null
  try {
    settings = window.api.settings.getSync()
  } catch {
    // Async hydration remains available if the startup read fails.
  }
  if (settings) {
    useAppStore.setState({ settings })
  }
  applyStartupAppTheme(settings)
  applyCompanionFonts(settings)
}

export function CompanionWindowSettingsSync(): null {
  const settings = useAppStore((state) => state.settings)
  useReduceVisualEffects(settings?.reduceVisualEffects)
  useAppThemePaint()

  useEffect(() => {
    let disposed = false
    const offKeybindingsChanged = window.api.keybindings?.onChanged((snapshot) =>
      useAppStore.getState().setKeybindingSnapshot(snapshot)
    )
    void useAppStore.getState().fetchKeybindings()
    const setSettings = (next: GlobalSettings): void => {
      if (!disposed) {
        useAppStore.setState({ settings: next })
      }
    }
    const offChanged = window.api.settings.onChanged((updates) => {
      const current = useAppStore.getState().settings
      if (current) {
        setSettings({ ...current, ...updates })
      }
    })
    void window.api.settings
      .get()
      .then(setSettings)
      .catch(() => undefined)
    return () => {
      disposed = true
      offChanged()
      offKeybindingsChanged?.()
    }
  }, [])

  useEffect(() => {
    applyCompanionFonts(settings)
  }, [settings])
  return null
}
