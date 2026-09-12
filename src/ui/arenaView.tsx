import { useEffect, useRef } from 'react'
import { drawArena } from '../game/render'
import type { TopRuntime } from '../game/physics'

export function ArenaView({ step }: { step: () => TopRuntime[] | null }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const stepRef = useRef(step)
  stepRef.current = step
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    const loop = () => {
      drawArena(ctx, stepRef.current())
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <canvas
      ref={ref}
      width={640}
      height={640}
      className="mx-auto block h-auto w-full max-w-[640px] rounded-2xl border border-slate-600 bg-black"
    />
  )
}

export function HoldButton({
  children,
  className,
  disabled,
  onHold,
  onRelease,
}: {
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onHold: () => void
  onRelease: () => void
}) {
  const held = useRef(false)
  const start = () => {
    if (disabled || held.current) return
    held.current = true
    onHold()
  }
  const stop = () => {
    if (!held.current) return
    held.current = false
    onRelease()
  }
  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    >
      {children}
    </button>
  )
}
