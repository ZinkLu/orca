import { useRef, useState } from 'react'
import { ArrowLeft, ExternalLink, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import StatusIndicator from '@/components/sidebar/workspace-card/surface/StatusIndicator'
import { useTranslate } from '@/i18n/use-translate'
import { getWorktreeStatusLabel } from '@/lib/workspace/activity/worktree-status'
import { agentSendDisabledReasonLabel } from '@/lib/agent-session/messaging/agent-send-disabled-reason-label'
import {
  PTY_FLOAT_PILL_MESSAGE_MAX_LENGTH,
  type PtyFloatPillEntry,
  type PtyFloatPillSendResult
} from '../../../../shared/terminal/pty-float-pill-snapshot'

export function PtyFloatPillDetail({
  entry,
  workspaceName,
  available,
  draft,
  onDraftChange,
  onBack,
  onReveal,
  onSend
}: {
  entry: PtyFloatPillEntry
  workspaceName: string
  available: boolean
  draft: string
  onDraftChange: (value: string) => void
  onBack: () => void
  onReveal: () => void
  onSend: (prompt: string) => Promise<PtyFloatPillSendResult>
}): React.JSX.Element {
  const t = useTranslate()
  const sendingRef = useRef(false)
  const [sending, setSending] = useState(false)
  const [slow, setSlow] = useState(false)
  const [result, setResult] = useState<PtyFloatPillSendResult | null>(null)
  const conversation = entry.conversation
  const disabledReason = !available
    ? t(
        'auto.components.ptyFloatPill.sessionChanged',
        'This session changed. Reopen it from the list.'
      )
    : conversation?.disabledReason
      ? agentSendDisabledReasonLabel(conversation.disabledReason, t)
      : !conversation || (conversation.kind === 'terminal' && !conversation.ptyId)
        ? t('auto.components.ptyFloatPill.noAgent', 'Open the session to continue.')
        : null

  const send = async (): Promise<void> => {
    if (sendingRef.current || disabledReason || !draft.trim() || result?.status === 'unconfirmed') {
      return
    }
    sendingRef.current = true
    setSending(true)
    setResult(null)
    const timer = setTimeout(() => setSlow(true), 200)
    const next = await Promise.resolve()
      .then(() => onSend(draft.trim()))
      .catch((): PtyFloatPillSendResult => ({ status: 'unconfirmed' }))
    clearTimeout(timer)
    sendingRef.current = false
    setSending(false)
    setSlow(false)
    setResult(next)
    if (next.status === 'sent') {
      onDraftChange('')
    }
  }

  const feedback =
    result?.status === 'sent'
      ? t('auto.components.ptyFloatPill.sent', 'Message sent')
      : (result?.message ??
        (result?.status === 'unconfirmed'
          ? t(
              'auto.components.ptyFloatPill.unconfirmed',
              'Delivery could not be confirmed. Check the session before sending again.'
            )
          : result?.status === 'failed'
            ? t(
                'auto.components.ptyFloatPill.sendFailed',
                'Message not sent. Check the session and try again.'
              )
            : null))

  return (
    <section
      data-pty-float-pill-detail=""
      className="border-t border-border"
      aria-label={entry.title}
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Button
          variant="ghost-inset"
          size="icon-xs"
          onClick={onBack}
          aria-label={t('auto.components.ptyFloatPill.back', 'Back to sessions')}
        >
          <ArrowLeft aria-hidden />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium">{entry.title}</div>
          <div className="truncate text-2xs text-muted-foreground">{workspaceName}</div>
        </div>
        <Button variant="ghost-inset" size="xs" onClick={onReveal}>
          <ExternalLink aria-hidden />
          {t('auto.components.ptyFloatPill.openTerminal', 'Open session')}
        </Button>
      </div>
      <div className="flex items-center gap-1.5 px-3 pb-2 text-xs text-muted-foreground">
        <StatusIndicator status={entry.status} showTooltip={false} />
        {getWorktreeStatusLabel(entry.status)}
      </div>
      <div
        className="scrollbar-sleek max-h-64 overflow-y-auto border-y border-border px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words"
        data-pty-float-pill-message=""
      >
        {conversation?.lastMessage ?? (
          <span className="text-muted-foreground">
            {t('auto.components.ptyFloatPill.noMessage', 'No assistant message received yet.')}
          </span>
        )}
      </div>
      <form
        className="space-y-2 p-3"
        onSubmit={(event) => {
          event.preventDefault()
          void send()
        }}
      >
        <Textarea
          autoFocus
          value={draft}
          onChange={(event) => {
            onDraftChange(event.target.value)
            if (result?.status !== 'unconfirmed') {
              setResult(null)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void send()
            }
            if (event.key === 'Escape') {
              event.stopPropagation()
              onBack()
            }
          }}
          aria-label={t('auto.components.ptyFloatPill.reply', 'Reply to agent')}
          placeholder={t('auto.components.ptyFloatPill.reply', 'Reply to agent')}
          maxLength={PTY_FLOAT_PILL_MESSAGE_MAX_LENGTH}
          disabled={sending || !!disabledReason}
          className="h-20 resize-none"
        />
        {disabledReason ? <p className="text-xs text-muted-foreground">{disabledReason}</p> : null}
        {feedback ? (
          <p role="status" className="text-xs text-muted-foreground">
            {feedback}
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            className="w-24"
            disabled={
              sending || !!disabledReason || !draft.trim() || result?.status === 'unconfirmed'
            }
          >
            {slow ? (
              <LoadingSpinner className="size-3.5" />
            ) : (
              <Send className="size-3.5" aria-hidden />
            )}
            {slow
              ? t('auto.components.ptyFloatPill.sending', 'Sending…')
              : t('auto.components.ptyFloatPill.send', 'Send')}
          </Button>
        </div>
      </form>
    </section>
  )
}
