import { useEffect, useId, useRef } from 'react'
import { ArrowLeft, X } from 'lucide-react'

type ModalProps = {
  open: boolean
  title: string
  onClose: () => void
  /** Given for a step that has somewhere to go back to, which shows an arrow. */
  onBack?: (() => void) | undefined
  /** 'compact' narrows the window for a single-column flow. */
  size?: 'default' | 'compact' | undefined
  children: React.ReactNode
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function Modal({ open, title, onClose, onBack, size, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Callers do not all memoise `onClose`, and this effect focuses the dialog and
  // locks body scroll — re-running it on every parent render would fight the
  // user for the caret. Read the latest handler through a ref instead, so the
  // effect below depends only on `open`.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return

    const dialog = dialogRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null

    // Focus the dialog itself rather than its first control, so the title is
    // announced before the user starts tabbing through the contents.
    dialog?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialog) return

      // `aria-modal` states the intent; it does not enforce it. Without this the
      // page behind stays in the tab order and Tab walks straight out.
      const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.getClientRects().length > 0,
      )
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      // Leaving the dialog forwards from the last control wraps to the first,
      // and backwards from the first (or from the dialog itself) to the last.
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    // Stop the page behind from taking over once the modal's own scroll ends.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      // Hand focus back to whatever opened the modal; that is where the user's
      // attention already was.
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="modalOverlay">
      <div className="modalBackdrop" onClick={onClose} />
      <div
        className={size === 'compact' ? 'modal modalCompact' : 'modal'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="modalHeader">
          {onBack ? (
            <button className="iconBtn modalBack" onClick={onBack} aria-label="Back" type="button">
              <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
          ) : null}
          <div className="modalTitle" id={titleId}>
            {title}
          </div>
          <button className="iconBtn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="modalBody">{children}</div>
      </div>
    </div>
  )
}
