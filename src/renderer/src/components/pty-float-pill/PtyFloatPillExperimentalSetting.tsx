import type { GlobalSettings } from '../../../../shared/settings/global-settings-types'
import { useTranslate } from '@/i18n/use-translate'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { SearchableSetting } from '../settings/section-layout/SearchableSetting'
import { getExperimentalSearchEntry } from '../settings/advanced/experimental-search'
import { resetPtyFloatPillPosition } from './reset-pty-float-pill-position'

export function PtyFloatPillExperimentalSetting({
  settings,
  updateSettings
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
}): React.JSX.Element {
  const t = useTranslate()
  const enabled = settings.experimentalPtyFloatPill === true
  const title = t(
    'auto.components.settings.ExperimentalPane.ptyFloatPill.title',
    'Session status pill'
  )
  return (
    <SearchableSetting
      title={title}
      description={t(
        'auto.components.settings.ExperimentalPane.ptyFloatPill.description',
        'Desktop pill with terminal and chat status, latest messages, and replies.'
      )}
      keywords={getExperimentalSearchEntry().ptyFloatPill.keywords}
      className="space-y-3 py-3"
      id="experimental-pty-float-pill"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 shrink space-y-0.5">
          <Label>{title}</Label>
          <p className="text-xs text-muted-foreground">
            {t(
              'auto.components.settings.ExperimentalPane.ptyFloatPill.copy',
              'Shows terminal and chat status above other apps, even when Orca is minimized. Click a row to read the latest message, reply, or open the session. Drag the status bar to move the pill.'
            )}
          </p>
        </div>
        <Switch
          checked={enabled}
          aria-label={t(
            'auto.components.settings.ExperimentalPane.ptyFloatPill.toggleLabel',
            'Toggle session status pill'
          )}
          onCheckedChange={() => void updateSettings({ experimentalPtyFloatPill: !enabled })}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          void resetPtyFloatPillPosition().catch((error: unknown) => {
            toast.error(error instanceof Error ? error.message : String(error))
          })
        }
      >
        {t('auto.components.ptyFloatPill.resetPosition', 'Reset floating window position')}
      </Button>
    </SearchableSetting>
  )
}
