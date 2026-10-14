import { resolveKit, kitLabel, TYPE_LABEL } from '../game/stats'
import type { GameData, NpcFighter } from '../types'

export function NpcSelect({
  data,
  onBack,
  onPick,
}: {
  data: GameData
  onBack: () => void
  onPick: (n: NpcFighter) => void
}) {
  return (
    <section className="metal-panel rounded-3xl p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">选择对手</h2>
        <button className="metal-btn rounded-lg px-3 py-1 text-sm" onClick={onBack}>
          返回
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-400">P0 可打 3 场；其余 7 套为脚本占位。NPC 强化暂为 0 级。</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {data.npcs.map((n) => {
          const kit = resolveKit(data.parts, n)
          return (
            <button
              key={n.id}
              disabled={!n.playable}
              className="metal-btn rounded-2xl p-4 text-left disabled:opacity-40"
              onClick={() => onPick(n)}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{n.name}</span>
                <span className="text-xs text-slate-400">{n.playable ? '可挑战' : '即将开放'}</span>
              </div>
              <p className="mt-1 text-sm text-slate-300">{kitLabel(kit)}</p>
              <p className="mt-1 text-xs text-slate-400">
                {TYPE_LABEL[kit.blade.type]} · {n.note}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
