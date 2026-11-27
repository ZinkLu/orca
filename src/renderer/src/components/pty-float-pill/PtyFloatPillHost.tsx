import { memo, Suspense } from 'react'
import { lazyWithRetry as lazy } from '@/app-shell/startup/lazy-with-retry'
import { OverlayBoundary } from '@/app-shell/root-surfaces/app-root-surface-boundaries'
import { useAppStore } from '@/store/index'

const PtyFloatPill = lazy(() => import('./PtyFloatPill'))

/** Fetches and mounts the pill only while its experiment is on; memoized so App renders skip it. */
export const PtyFloatPillHost = memo(function PtyFloatPillHost(): React.JSX.Element | null {
  const enabled = useAppStore((s) => s.settings?.experimentalPtyFloatPill === true)
  if (!enabled) {
    return null
  }
  return (
    <Suspense fallback={null}>
      <OverlayBoundary boundaryId="overlay.pty-float-pill">
        <PtyFloatPill />
      </OverlayBoundary>
    </Suspense>
  )
})
