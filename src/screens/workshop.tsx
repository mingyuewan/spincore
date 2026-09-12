import { kitEnhance, type EnhanceMap } from '../game/enhance'
import { computeStats, resolveKit } from '../game/stats'
import type { GameData, KitIds } from '../types'
import { RarityBadge, StatBars, TypeDot } from '../ui/widgets'

export function Workshop({
  data,
  kit,
  slot,
  enhanceMap,
  onSlot,
  onKit,
  onEnhance,
  onBack,
}: {
  data: GameData
  kit: KitIds
  slot: 'blade' | 'axle' | 'tip'
  enhanceMap: EnhanceMap
  onSlot: (s: 'blade' | 'axle' | 'tip') => void
  onKit: (k: KitIds) => void
  onEnhance: (partId: string, delta: number, max: number) => void
  onBack: () => void
}) {
  const levels = kitEnhance(kit, enhanceMap)
  const resolved = resolveKit(data.parts, kit, levels, data.formulas)
  const stats = computeStats(resolved, data.formulas)
  const list =
    slot === 'blade' ? data.parts.blades : slot === 'axle' ? data.parts.axles : data.parts.tips
  const selected = kit[slot]
  const maxLv = data.formulas.enhance_max
  const selectedLv = enhanceMap[selected] ?? 0

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <section className="metal-panel rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">工坊</h2>
          <button className="metal-btn rounded-lg px-3 py-1 text-sm" onClick={onBack}>
            返回
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">三槽：刃 / 轴 / 尖 · 强化按零件 ID 保存，最高 {maxLv} 级</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(
            [
              ['blade', resolved.blade.name, levels.blade],
              ['axle', resolved.axle.name, levels.axle],
              ['tip', resolved.tip.name, levels.tip],
            ] as const
          ).map(([key, name, lv]) => (
            <button
              key={key}
              className={`rounded-2xl border px-2 py-3 text-sm ${
                slot === key ? 'border-amber-300 bg-amber-300/10' : 'border-slate-600'
              }`}
              onClick={() => onSlot(key)}
            >
              <div className="text-[10px] text-slate-400">{key === 'blade' ? '刃' : key === 'axle' ? '轴' : '尖'}</div>
              <div className="font-bold">{name}</div>
              <div className="mt-1 text-[10px] text-amber-200">+{lv}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-300/30 bg-amber-300/5 px-3 py-2">
          <div>
            <p className="text-xs text-slate-400">当前零件强化</p>
            <p className="font-bold">
              +{selectedLv} / {maxLv}
              <span className="ml-2 text-xs font-normal text-slate-400">
                四维 +{(selectedLv * data.formulas.enhance_per_level).toFixed(2)}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="metal-btn rounded-lg px-3 py-1 text-sm disabled:opacity-40"
              disabled={selectedLv <= 0}
              onClick={() => onEnhance(selected, -1, maxLv)}
            >
              −
            </button>
            <button
              className="gold-btn rounded-lg px-3 py-1 text-sm font-bold disabled:opacity-40"
              disabled={selectedLv >= maxLv}
              onClick={() => onEnhance(selected, 1, maxLv)}
            >
              +
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.presets.starters.map((p) => (
            <button
              key={p.id}
              className="gold-btn rounded-lg px-3 py-2 text-sm font-bold"
              onClick={() => onKit({ blade: p.blade, axle: p.axle, tip: p.tip })}
            >
              {p.id} {p.name}
            </button>
          ))}
        </div>
        <div className="mt-5">
          <StatBars stats={stats} />
        </div>
      </section>
      <section className="metal-panel rounded-3xl p-5">
        <h3 className="font-bold">选择零件</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {list.map((part) => {
            const lv = enhanceMap[part.id] ?? 0
            return (
              <button
                key={part.id}
                className={`rounded-2xl border p-3 text-left ${
                  selected === part.id ? 'border-cyan-300 bg-cyan-300/10' : 'border-slate-600'
                }`}
                onClick={() => onKit({ ...kit, [slot]: part.id })}
              >
                <div className="flex items-center gap-2">
                  <TypeDot
                    type={
                      part.type === 'flat' || part.type === 'ball' || part.type === 'needle' || part.type === 'switch'
                        ? 'balance'
                        : part.type
                    }
                  />
                  <span className="font-bold">{part.name}</span>
                  <span className="text-xs text-slate-400">{part.id}</span>
                  <RarityBadge rarity={part.rarity} />
                  {lv > 0 && <span className="ml-auto text-xs text-amber-200">+{lv}</span>}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  冲击 {part.impact} · 持久 {part.stamina} · 防御 {part.defense} · 抗爆 {part.burst}
                </p>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
