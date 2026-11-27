import type { SettingsSearchEntry } from '../settings/search/settings-search'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from '../settings/search/settings-search-keywords'

export function getPtyFloatPillSearchEntry(): SettingsSearchEntry {
  return {
    title: translate(
      'auto.components.settings.experimental.search.ptyFloatPill.title',
      'Session status pill'
    ),
    description: translate(
      'auto.components.settings.experimental.search.ptyFloatPill.description',
      'Desktop pill with terminal and chat status, latest messages, and replies.'
    ),
    keywords: [
      ...translateSearchKeyword(
        'auto.components.ptyFloatPill.resetPosition',
        'Reset floating window position'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.experimental.search.0d24759f14',
        'experimental'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.experimental.search.9bb3bd5098',
        'terminal'
      ),
      ...translateSearchKeyword('auto.components.settings.experimental.search.5f067ba0f9', 'agent'),
      ...translateSearchKeyword(
        'auto.components.settings.experimental.search.9f5609bfb8',
        'overlay'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.experimental.search.ptyFloatPill.status',
        'status'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.experimental.search.ptyFloatPill.floating',
        'floating'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.experimental.search.ptyFloatPill.pill',
        'pill'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.experimental.search.ptyFloatPill.pty',
        'pty',
        { englishOnly: true }
      )
    ]
  }
}
