import { computeStats, kitLabel } from '../game/stats'
import type { EnhanceLevels, ResolvedKit } from '../types'
import { StatBars } from '../ui/widgets'

export function Lobby({
  onWorkshop,
  onTrain,
  onFight,
  kit,
  stats,
  enhance,
}: {
  onWorkshop: () => void
  onTrain: () => void
  onFight: () => void
  kit: ResolvedKit
  stats: ReturnType<typeof computeStats>
  enhance: EnhanceLevels
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
      <section className="metal-panel rounded-3xl p-6 md:p-8">
        <p className="text-sm text-cyan-300">训练场 + NPC 对战已开放</p>
        <h2 className="mt-2 text-2xl font-bold">把旋核扔进环形场</h2>
        <p className="mt-3 max-w-xl text-slate-300">
          蓄力 0.3–1.2 秒发射。轴尖决定轨迹：平冲乱走、岩圆回稳、寒针钉心、可调外攻内收。先到 4 分者胜，最多 3 局。工坊可把零件强化到 15 级。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="gold-btn rounded-xl px-5 py-3 font-bold" onClick={onFight}>
            对战 NPC
          </button>
          <button className="cyan-btn rounded-xl px-5 py-3 font-bold" onClick={onTrain}>
            训练场
          </button>
          <button className="metal-btn rounded-xl px-5 py-3 font-bold" onClick={onWorkshop}>
            工坊
          </button>
        </div>
      </section>
      <aside className="metal-panel rounded-3xl p-6">
        <p className="text-xs text-slate-400">
          初始解锁套装 PS03 · 强化 {enhance.blade}/{enhance.axle}/{enhance.tip}
        </p>
        <h3 className="mt-1 text-xl font-bold">{kitLabel(kit)}</h3>
        <div className="mt-4">
          <StatBars stats={stats} />
        </div>
      </aside>
    </div>
  )
}
