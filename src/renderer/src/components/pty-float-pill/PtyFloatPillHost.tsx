import { memo, Suspense } from 'react'
import { lazyWithRetry as lazy } from '@/app-shell/startup/lazy-with-retry'
import { OverlayBoundary } from '@/app-shell/root-surfaces/app-root-surface-boundaries'
import { useAppStore } from '@/store/index'
import { isWebClientLocation } from '@/app-shell/platform/web-client-location'

const PtyFloatPillBridge = lazy(() => import('./PtyFloatPillBridge'))

export const PtyFloatPillHost = memo(function PtyFloatPillHost(): React.JSX.Element | null {
  const enabled = useAppStore((s) => s.settings?.experimentalPtyFloatPill === true)
  if (!enabled || isWebClientLocation()) {
    return null
  }
  return (
    <Suspense fallback={null}>
      <OverlayBoundary boundaryId="overlay.pty-float-pill">
        <PtyFloatPillBridge />
      </OverlayBoundary>
    </Suspense>
  )
})
