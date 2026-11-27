import { useAppStore } from '@/store'

export async function resetPtyFloatPillPosition(): Promise<void> {
  const state = useAppStore.getState()
  if (state.settings?.experimentalPtyFloatPill !== true) {
    await state.updateSettingsOrThrow({ experimentalPtyFloatPill: true })
  }
  await window.api.ptyFloatPill.resetPosition()
}
