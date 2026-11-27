import type { GlobalSettings } from '../../../../shared/settings/global-settings-types'
import { useTranslate } from '@/i18n/use-translate'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SearchableSetting } from '../settings/section-layout/SearchableSetting'
import { getExperimentalSearchEntry } from '../settings/advanced/experimental-search'

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
    'Terminal status pill'
  )
  return (
    <SearchableSetting
      title={title}
      description={t(
        'auto.components.settings.ExperimentalPane.ptyFloatPill.description',
        'Desktop pill that stays above other apps and shows terminal status.'
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
              'Shows terminal status in a separate window that stays visible when Orca is minimized. Click a terminal to return to it in Orca, use the arrow to collapse the list, and drag the status bar to move the pill.'
            )}
          </p>
        </div>
        <Switch
          checked={enabled}
          aria-label={t(
            'auto.components.settings.ExperimentalPane.ptyFloatPill.toggleLabel',
            'Toggle terminal status pill'
          )}
          onCheckedChange={() => void updateSettings({ experimentalPtyFloatPill: !enabled })}
        />
      </div>
    </SearchableSetting>
  )
}
