import { useEffect, useRef, useState } from 'react'

export function ChartFrame({
  style,
  fallback,
  children,
}: {
  style?: React.CSSProperties
  fallback: React.ReactNode
  children: (size: { width: number; height: number }) => React.ReactNode
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      const r = el.getBoundingClientRect()
      const width = Math.round(r.width)
      const height = Math.round(r.height)
      const next = { width: width > 0 ? width : 0, height: height > 0 ? height : 0 }
      setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next))
    }

    update()
    let raf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    })
    ro.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <div ref={ref} className="chartWrap" style={style}>
      {size.width > 0 && size.height > 0 ? children(size) : fallback}
    </div>
  )
}
