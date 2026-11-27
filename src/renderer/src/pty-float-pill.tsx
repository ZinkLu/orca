import './diagnostics/react-commits/react-devtools-commit-hook-shim'
import './diagnostics/react-commits/react-commit-cascade-observer'
import './assets/main.css'

import { StrictMode } from 'react'
import {
  CompanionWindowSettingsSync,
  initializeCompanionWindowAppearance
} from './app-shell/appearance/CompanionWindowSettingsSync'
import { getOrCreateRendererRoot } from './app-shell/startup/react-renderer-root'
import { OverlayBoundary } from './app-shell/root-surfaces/app-root-surface-boundaries'
import { PtyFloatPillWindow } from './components/pty-float-pill/PtyFloatPillWindow'
import { TooltipProvider } from './components/ui/tooltip'
import { I18nProvider } from './i18n/I18nProvider'
import { installRendererCrashDiagnostics } from './diagnostics/crash-reporting/crash-diagnostics'
import { setReactCommitCascadeRendererSurface } from './diagnostics/react-commits/react-commit-cascade-telemetry'

initializeCompanionWindowAppearance()
installRendererCrashDiagnostics('pty-float-pill')
setReactCommitCascadeRendererSurface('pty-float-pill')

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Terminal status pill root element not found.')
}
getOrCreateRendererRoot(rootElement, import.meta.hot?.data).render(
  <StrictMode>
    <I18nProvider>
      <CompanionWindowSettingsSync />
      <TooltipProvider>
        <OverlayBoundary boundaryId="pty-float-pill.root">
          <PtyFloatPillWindow />
        </OverlayBoundary>
      </TooltipProvider>
    </I18nProvider>
  </StrictMode>
)
