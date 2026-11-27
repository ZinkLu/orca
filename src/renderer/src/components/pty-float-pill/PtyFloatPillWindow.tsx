import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type {
  PtyFloatPillEntry,
  PtyFloatPillGroup,
  PtyFloatPillTarget
} from '../../../../shared/terminal/pty-float-pill-snapshot'
import { matchesPtyFloatPillMessageTarget } from '../../../../shared/terminal/pty-float-pill-message-target'
import { PtyFloatPill } from './PtyFloatPill'
import { PtyFloatPillDetail } from './PtyFloatPillDetail'

const EXPANDED_KEY = 'orca-pty-float-pill-expanded'

function readExpanded(): boolean {
  try {
    return window.localStorage.getItem(EXPANDED_KEY) !== 'false'
  } catch {
    return true
  }
}

export function PtyFloatPillWindow(): React.JSX.Element {
  const [groups, setGroups] = useState<readonly PtyFloatPillGroup[]>([])
  const [expanded, setExpanded] = useState(readExpanded)
  const [selected, setSelected] = useState<{
    target: PtyFloatPillTarget
    entry: PtyFloatPillEntry
    workspaceName: string
  } | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const frame = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsubscribe = window.api.ptyFloatPill.onSnapshot(setGroups)
    void window.api.ptyFloatPill.requestSnapshot()
    return unsubscribe
  }, [])

  useLayoutEffect(() => {
    const node = frame.current
    if (!node) {
      return
    }
    const observer = new ResizeObserver(() => {
      const { width, height } = node.getBoundingClientRect()
      if (width >= 32 && height >= 24) {
        void window.api.ptyFloatPill.resize({ width, height })
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const toggle = (): void => {
    const next = !expanded
    setExpanded(next)
    try {
      window.localStorage.setItem(EXPANDED_KEY, String(next))
    } catch {}
  }

  const current =
    selected &&
    groups
      .find((group) => group.worktreeId === selected.target.worktreeId)
      ?.entries.find((entry) => entry.tabId === selected.target.tabId)
  const available =
    !!current &&
    (current.conversation === selected?.entry.conversation ||
      (!!current.conversation &&
        !!selected?.entry.conversation &&
        matchesPtyFloatPillMessageTarget(current.conversation, selected.entry.conversation)))
  const entry = available ? current : selected?.entry
  const draftKey = JSON.stringify([
    selected?.target,
    selected?.entry.conversation?.leafId,
    selected?.entry.conversation?.ptyId,
    selected?.entry.conversation?.sessionId
  ])

  return (
    <div ref={frame} className="w-max p-2">
      <PtyFloatPill
        groups={groups}
        expanded={expanded}
        onToggle={toggle}
        onSelect={(target, entry, workspaceName) => setSelected({ target, entry, workspaceName })}
        detail={
          selected && entry ? (
            <PtyFloatPillDetail
              key={draftKey}
              entry={entry}
              workspaceName={selected.workspaceName}
              available={available}
              draft={drafts[draftKey] ?? ''}
              onDraftChange={(value) => setDrafts((drafts) => ({ ...drafts, [draftKey]: value }))}
              onBack={() => setSelected(null)}
              onReveal={() =>
                void window.api.ptyFloatPill.revealTerminal({
                  ...selected.target,
                  ...(entry.conversation ? { leafId: entry.conversation.leafId } : {})
                })
              }
              onSend={(prompt) =>
                entry.conversation?.ptyId && available
                  ? window.api.ptyFloatPill.sendMessage({
                      ...selected.target,
                      leafId: entry.conversation.leafId,
                      ptyId: entry.conversation.ptyId,
                      sessionId: entry.conversation.sessionId,
                      prompt
                    })
                  : Promise.resolve({ status: 'failed' })
              }
            />
          ) : null
        }
      />
    </div>
  )
}
