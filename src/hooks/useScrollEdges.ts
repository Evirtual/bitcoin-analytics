import { useCallback, useEffect, useState } from 'react'

/**
 * Reports whether a horizontally scrolling strip has content out of view on
 * either side.
 *
 * The scrollbar on these strips is deliberately hidden, which left a clipped
 * item at the edge reading as a broken layout rather than as something you can
 * scroll to. The flags drive a fade over whichever edge still has more behind
 * it.
 *
 * The ref belongs to the caller, as it does for useOutsideClick.
 */
export function useScrollEdges<T extends HTMLElement>(ref: { current: T | null }) {
  const [edges, setEdges] = useState({ start: false, end: false })

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return

    const max = el.scrollWidth - el.clientWidth
    // A pixel of slack: fractional widths otherwise leave the end fade lit on
    // a strip that is already scrolled fully to its end.
    const next = { start: el.scrollLeft > 1, end: max > 1 && el.scrollLeft < max - 1 }

    setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next))
  }, [ref])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    measure()
    el.addEventListener('scroll', measure, { passive: true })

    // The container resizes with the viewport, and its contents reflow when the
    // wallet's held assets reorder the pills.
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    for (const child of Array.from(el.children)) observer.observe(child)

    return () => {
      el.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [measure, ref])

  return edges
}
