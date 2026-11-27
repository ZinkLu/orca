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
        'Floating pill that lists every terminal and what it is doing.'
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
              'Shows a pill over the app that lists every terminal tab by workspace with its live status. Click a terminal to open it, click the header to collapse the list, and drag the header to move the pill.'
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
