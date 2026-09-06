import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info, X } from 'lucide-react'
import { useOutsideClick } from '../hooks/useOutsideClick'

// Hover or focus opens it on a pointer device; on a touch screen it is pinned by
// tapping and dismissed by the backdrop, Escape, or the close button. Extracted
// from the dashboard meta note so every explainer on the page behaves the same.
export function InfoTip({
  label,
  title,
  size = 17,
  className,
  children,
}: {
  label: string
  title?: string
  size?: number
  className?: string
  children: React.ReactNode
}) {
  const [pinned, setPinned] = useState(false)
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const tooltipId = useId()

  const open = pinned || (!isMobile && (hover || focus))

  const close = useCallback(() => {
    setPinned(false)
    setHover(false)
    setFocus(false)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 43.5rem)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useOutsideClick(wrapRef, close, open)

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [close, open])

  useEffect(() => {
    if (!isMobile || !open) return
    // Prevent background scroll when the mobile popup is open.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, isMobile])

  // The market tiles clip their overflow and sit under a grid with a perspective,
  // which would both reposition and cut off a fixed popup. The mobile branch is
  // portalled out to the body so it is centred on the screen wherever it is used.
  const mobilePopup =
    isMobile && open
      ? createPortal(
          <>
            <div className="infoBackdrop" onClick={close} aria-hidden="true" />
            <div className="infoTooltip infoTooltipMobile" id={tooltipId} role="tooltip">
              <button type="button" className="infoTooltipClose" onClick={close} aria-label="Close">
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
              {title ? <div className="infoTooltipTitle">{title}</div> : null}
              {children}
            </div>
          </>,
          document.body,
        )
      : null

  return (
    <>
      {mobilePopup}
      <span
        ref={wrapRef}
        className={className ? `infoWrap ${className}` : 'infoWrap'}
        onMouseEnter={() => (isMobile ? undefined : setHover(true))}
        onMouseLeave={() => (isMobile ? undefined : setHover(false))}
      >
        <button
          type="button"
          className="infoBtn"
          aria-label={label}
          aria-expanded={open}
          aria-describedby={open ? tooltipId : undefined}
          onFocus={() => (isMobile ? undefined : setFocus(true))}
          onBlur={() => (isMobile ? undefined : setFocus(false))}
          onClick={() => setPinned((v) => !v)}
        >
          <Info size={size} strokeWidth={1.9} aria-hidden="true" />
        </button>
        {open && !isMobile ? (
          <div className="infoTooltip" id={tooltipId} role="tooltip">
            {title ? <div className="infoTooltipTitle">{title}</div> : null}
            {children}
          </div>
        ) : null}
      </span>
    </>
  )
}
