import { ChevronDown, ChevronRight, SquareTerminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import StatusIndicator from '@/components/sidebar/workspace-card/surface/StatusIndicator'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { getWorktreeStatusLabel } from '@/lib/workspace/activity/worktree-status'
import { summarizePtyFloatPillGroups } from './pty-float-pill-groups'
import type {
  PtyFloatPillGroup,
  PtyFloatPillEntry,
  PtyFloatPillTarget
} from '../../../../shared/terminal/pty-float-pill-snapshot'

export function PtyFloatPill({
  groups,
  expanded,
  onToggle,
  onSelect,
  detail
}: {
  groups: readonly PtyFloatPillGroup[]
  expanded: boolean
  onToggle: () => void
  onSelect: (target: PtyFloatPillTarget, entry: PtyFloatPillEntry, workspaceName: string) => void
  detail?: React.ReactNode
}): React.JSX.Element | null {
  const t = useTranslate()
  if (groups.length === 0) {
    return null
  }
  const { total, counts } = summarizePtyFloatPillGroups(groups)

  return (
    <div
      data-pty-float-pill=""
      className={cn(
        'overflow-hidden border border-border bg-popover text-popover-foreground shadow-floating',
        expanded ? 'w-96 rounded-lg' : 'w-max rounded-full'
      )}
    >
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost-inset"
          size="pill"
          aria-expanded={expanded}
          aria-label={t('auto.components.ptyFloatPill.toggle', 'Terminal status')}
          onClick={onToggle}
          className="shrink-0"
        >
          {expanded ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />}
        </Button>
        <div className="pty-float-pill-drag flex h-8 flex-1 items-center gap-2.5 pr-3 text-xs font-normal">
          <span className="flex items-center gap-1">
            <SquareTerminal className="size-4 text-muted-foreground" aria-hidden />
            <span className="tabular-nums">{total}</span>
          </span>
          {counts.map(([status, count]) => (
            <span key={status} className="flex items-center gap-1">
              <StatusIndicator status={status} showTooltip={false} />
              <span className="tabular-nums">{count}</span>
            </span>
          ))}
        </div>
      </div>
      <div hidden={!expanded}>
        {detail ?? (
          <div className="scrollbar-sleek max-h-80 overflow-y-auto border-t border-border py-1">
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
                          onClick={() =>
                            onSelect(
                              { worktreeId: group.worktreeId, tabId: entry.tabId },
                              entry,
                              name
                            )
                          }
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-2 font-normal">
                            <StatusIndicator
                              status={entry.status}
                              showTooltip={false}
                              aria-hidden
                            />
                            <span className="w-24 shrink-0 truncate text-left">{entry.title}</span>
                            <span className="shrink-0 text-muted-foreground">
                              {getWorktreeStatusLabel(entry.status)}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">
                              {entry.conversation?.lastMessage}
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
        )}
      </div>
    </div>
  )
}

export default PtyFloatPill
