import { useEffect } from 'react'

export function useOutsideClick<T extends HTMLElement>(
  ref: { current: T | null },
  onOutside: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return

    function onPointerDown(e: MouseEvent | TouchEvent) {
      const el = ref.current
      if (!el) return
      const target = e.target as Node | null
      if (target && el.contains(target)) return
      onOutside()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [enabled, onOutside, ref])
}
