import { useCallback, useEffect, useRef, useState } from 'react'
import { CHARGE_MAX, CHARGE_MIN } from '../game/physics'

export function useCharge() {
  const [holding, setHolding] = useState(false)
  const [ratio, setRatio] = useState(0)
  const start = useRef(0)
  const holdMs = useRef(0)

  useEffect(() => {
    if (!holding) return
    start.current = performance.now()
    let raf = 0
    const tick = () => {
      const ms = performance.now() - start.current
      holdMs.current = ms
      setRatio(Math.min(1, Math.max(0, (ms - CHARGE_MIN) / (CHARGE_MAX - CHARGE_MIN))))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [holding])

  const begin = useCallback(() => {
    setHolding(true)
    setRatio(0)
  }, [])

  const end = useCallback(() => {
    setHolding(false)
    const ms = Math.min(CHARGE_MAX, Math.max(CHARGE_MIN, holdMs.current || CHARGE_MIN))
    setRatio(0)
    return ms
  }, [])

  return { holding, ratio, begin, end }
}
