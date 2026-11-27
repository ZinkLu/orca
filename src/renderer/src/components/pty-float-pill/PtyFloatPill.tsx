import { useState } from 'react'
import { ChevronDown, ChevronRight, SquareTerminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import StatusIndicator from '@/components/sidebar/workspace-card/surface/StatusIndicator'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { keepPaneFocusPressProps } from '@/lib/overlay-interaction/focus-keeping-press'
import { revealTerminalPane } from '@/lib/workspace/activation/reveal-terminal-pane'
import { getWorktreeStatusLabel } from '@/lib/workspace/activity/worktree-status'
import { useAppStore } from '@/store/index'
import {
  createPtyFloatPillGroupsSelector,
  summarizePtyFloatPillGroups
} from './pty-float-pill-groups'
import { usePtyFloatPillPlacement } from './use-pty-float-pill-placement'

function revealTerminalTab(worktreeId: string, tabId: string): void {
  const leafId = useAppStore.getState().terminalLayoutsByTabId?.[tabId]?.activeLeafId ?? null
  revealTerminalPane({ worktreeId, tabId, leafId, executionHostId: null })
}

/** Floating list of every terminal tab and its live status; a row opens its terminal. */
export function PtyFloatPill(): React.JSX.Element | null {
  const t = useTranslate()
  const [selectGroups] = useState(createPtyFloatPillGroupsSelector)
  const groups = useAppStore(selectGroups)
  // Destructured: React Compiler bails on render reads of an object whose member goes to `ref`.
  const { ref, position, expanded, headerProps } = usePtyFloatPillPlacement()
  if (groups.length === 0) {
    return null
  }
  const { total, counts } = summarizePtyFloatPillGroups(groups)

  return (
    <div
      ref={ref}
      data-pty-float-pill=""
      className={cn(
        'fixed z-40 overflow-hidden border border-border bg-popover/95 text-popover-foreground shadow-floating backdrop-blur',
        expanded ? 'w-72 rounded-lg' : 'w-max rounded-full'
      )}
      style={{ left: position.x, top: position.y }}
    >
      <Button
        type="button"
        variant="ghost-inset"
        size="pill"
        aria-expanded={expanded}
        aria-label={t('auto.components.ptyFloatPill.toggle', 'Terminal status')}
        className="w-full cursor-grab touch-none justify-start select-none active:cursor-grabbing"
        {...keepPaneFocusPressProps}
        {...headerProps}
      >
        <span className="flex items-center gap-2.5 font-normal">
          {expanded ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />}
          <span className="flex items-center gap-1">
            <SquareTerminal className="text-muted-foreground" aria-hidden />
            <span className="tabular-nums">{total}</span>
          </span>
          {counts.map(([status, count]) => (
            <span key={status} className="flex items-center gap-1">
              <StatusIndicator status={status} />
              <span className="tabular-nums">{count}</span>
            </span>
          ))}
        </span>
      </Button>
      {expanded ? (
        <div className="scrollbar-sleek max-h-[min(20rem,60vh)] overflow-y-auto border-t border-border py-1">
          {groups.map((group) => {
            const name =
              group.name ??
              t('auto.components.ptyFloatPill.floatingWorkspace', 'Floating workspace')
            return (
              <div key={group.worktreeId} role="group" aria-label={name}>
                <div
                  className="truncate px-3 pt-1.5 pb-0.5 text-2xs font-medium text-muted-foreground"
                  aria-hidden
                >
                  {name}
                </div>
                <ul className="px-1">
                  {group.entries.map((entry) => (
                    <li key={entry.tabId}>
                      <Button
                        type="button"
                        variant="ghost-inset"
                        size="xs"
                        className="w-full justify-start"
                        onClick={() => revealTerminalTab(group.worktreeId, entry.tabId)}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2 font-normal">
                          <StatusIndicator status={entry.status} showTooltip={false} aria-hidden />
                          <span className="min-w-0 flex-1 truncate text-left">{entry.title}</span>
                          <span className="max-w-[45%] shrink-0 truncate text-muted-foreground">
                            {getWorktreeStatusLabel(entry.status)}
                          </span>
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default PtyFloatPill
