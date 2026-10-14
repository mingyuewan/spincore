import { useEffect, useMemo, useRef, useState } from 'react'
import { kitEnhance, type EnhanceMap } from '../game/enhance'
import { makeLaunch } from '../game/match'
import { ArenaWorld } from '../game/physics'
import { SeededRng } from '../game/rng'
import { resolveKit } from '../game/stats'
import type { EnhanceLevels, GameData, KitIds } from '../types'
import { ArenaView, HoldButton } from '../ui/arenaView'
import { useCharge } from '../ui/useCharge'
import { ChargeMeter } from '../ui/widgets'

export function Training({
  data,
  kitA,
  kitB,
  enhanceA,
  enhanceMap,
  onKitB,
  onWorkshop,
  onBack,
}: {
  data: GameData
  kitA: KitIds
  kitB: KitIds
  enhanceA: EnhanceLevels
  enhanceMap: EnhanceMap
  onKitB: (k: KitIds) => void
  onWorkshop: () => void
  onBack: () => void
}) {
  const enhanceB = useMemo(() => kitEnhance(kitB, enhanceMap), [kitB, enhanceMap])
  const a = useMemo(() => resolveKit(data.parts, kitA, enhanceA, data.formulas), [data, kitA, enhanceA])
  const b = useMemo(() => resolveKit(data.parts, kitB, enhanceB, data.formulas), [data, kitB, enhanceB])
  const worldRef = useRef<ArenaWorld | null>(null)
  const [ready, setReady] = useState(0)
  const chargeA = useCharge()
  const chargeB = useCharge()
  const rng = useRef(new SeededRng(20260321))

  useEffect(() => {
    const world = new ArenaWorld(20260321, data.formulas, { onScore: () => undefined })
    world.scoring = false
    world.spawnTops(a, b)
    worldRef.current = world
    setReady((n) => n + 1)
    return () => {
      world.destroy()
      worldRef.current = null
    }
  }, [data, a, b])

  const launch = (id: 1 | 2, ms: number) => {
    worldRef.current?.launch(id, makeLaunch(ms, rng.current))
  }
  const chargeARef = useRef(chargeA)
  chargeARef.current = chargeA

  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      if (ev.code !== 'Space' || ev.repeat) return
      ev.preventDefault()
      chargeARef.current.begin()
    }
    const up = (ev: KeyboardEvent) => {
      if (ev.code !== 'Space') return
      ev.preventDefault()
      if (chargeARef.current.holding) {
        worldRef.current?.launch(1, makeLaunch(chargeARef.current.end(), rng.current))
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <section className="metal-panel rounded-3xl p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">训练场</h2>
          <div className="flex gap-2">
            <button className="metal-btn rounded-lg px-3 py-1 text-sm" onClick={onWorkshop}>
              改我的刃
            </button>
            <button className="metal-btn rounded-lg px-3 py-1 text-sm" onClick={onBack}>
              返回
            </button>
          </div>
        </div>
        <p className="mb-3 text-sm text-slate-400">
          左青右橙，换尖后重进即可对比轨迹。强化后的冲击/持久会进发射转速。
        </p>
        <ArenaView
          key={ready}
          step={() => {
            worldRef.current?.step()
            return worldRef.current?.tops ?? null
          }}
        />
      </section>
      <aside className="grid gap-4">
        <div className="metal-panel rounded-3xl p-4">
          <p className="text-xs text-cyan-300">
            我方 · {a.blade.name} · +{enhanceA.blade}/{enhanceA.axle}/{enhanceA.tip}
          </p>
          <ChargeMeter ratio={chargeA.ratio} holding={chargeA.holding} label="蓄力发射" />
          <HoldButton
            className="cyan-btn mt-3 w-full rounded-xl py-3 font-bold"
            onHold={chargeA.begin}
            onRelease={() => launch(1, chargeA.end())}
          >
            按住发射青核（空格）
          </HoldButton>
        </div>
        <div className="metal-panel rounded-3xl p-4">
          <p className="text-xs text-orange-300">对照 · {b.tip.name}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {data.parts.tips.map((tip) => (
              <button
                key={tip.id}
                className={`rounded-lg border px-2 py-1 text-xs ${
                  kitB.tip === tip.id ? 'border-orange-300 bg-orange-300/15' : 'border-slate-600'
                }`}
                onClick={() => onKitB({ ...kitB, tip: tip.id })}
              >
                {tip.name}
              </button>
            ))}
          </div>
          <ChargeMeter ratio={chargeB.ratio} holding={chargeB.holding} label="对照蓄力" />
          <HoldButton
            className="gold-btn mt-3 w-full rounded-xl py-3 font-bold"
            onHold={chargeB.begin}
            onRelease={() => launch(2, chargeB.end())}
          >
            按住发射橙核
          </HoldButton>
        </div>
      </aside>
    </div>
  )
}
