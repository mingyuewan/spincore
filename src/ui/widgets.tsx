import type { ComputedStats, PartType, Rarity } from '../types'
import { RARITY_TONE, TYPE_LABEL } from '../game/stats'

export function StatBars({ stats }: { stats: ComputedStats }) {
  const cap = Math.max(12, Math.ceil(Math.max(stats.impact, stats.stamina, stats.defense, stats.burst, 12)))
  const rows: { k: string; v: number; cap: number }[] = [
    { k: '冲击', v: stats.impact, cap },
    { k: '持久', v: stats.stamina, cap },
    { k: '防御', v: stats.defense, cap },
    { k: '抗爆', v: stats.burst, cap },
  ]
  const motion: { k: string; v: number; cap: number }[] = [
    { k: '乱走', v: stats.wander, cap: 10 },
    { k: '摩擦', v: stats.friction, cap: 10 },
    { k: '回稳', v: stats.recover, cap: 10 },
  ]
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full border border-amber-300/40 bg-amber-400/10 px-2 py-0.5 text-amber-200">
          {TYPE_LABEL[stats.type]}
        </span>
        <span className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-2 py-0.5 text-cyan-200">
          运动 {stats.movementTag}
        </span>
        <span className="text-slate-400">
          轴高 {stats.height} · 重量 {stats.weight}
        </span>
      </div>
      {rows.map((row) => (
        <Bar key={row.k} label={row.k} value={row.v} cap={row.cap} />
      ))}
      <p className="mt-1 text-xs tracking-wider text-slate-400">轴尖运动（不并入冲击）</p>
      {motion.map((row) => (
        <Bar key={row.k} label={row.k} value={row.v} cap={row.cap} tone="motion" />
      ))}
    </div>
  )
}

function Bar({
  label,
  value,
  cap,
  tone = 'stat',
}: {
  label: string
  value: number
  cap: number
  tone?: 'stat' | 'motion'
}) {
  const pct = Math.max(0, Math.min(100, (value / cap) * 100))
  return (
    <div className="grid grid-cols-[48px_1fr_40px] items-center gap-2 text-sm">
      <span className="text-slate-300">{label}</span>
      <div className="stat-track">
        <div
          className={`stat-fill ${tone === 'motion' ? 'charge-fill' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-right tabular-nums text-slate-200">{value.toFixed(1)}</span>
    </div>
  )
}

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  const color =
    rarity === 'SR' ? 'text-amber-300 border-amber-300/50' : rarity === 'R' ? 'text-sky-300 border-sky-300/50' : 'text-slate-300 border-slate-500'
  return (
    <span className={`rounded border px-1.5 text-[10px] ${color}`}>
      {rarity} {RARITY_TONE[rarity]}
    </span>
  )
}

export function TypeDot({ type }: { type: PartType }) {
  const bg =
    type === 'attack'
      ? 'bg-orange-400'
      : type === 'stamina'
        ? 'bg-cyan-400'
        : type === 'defense'
          ? 'bg-amber-400'
          : 'bg-violet-400'
  return <i className={`inline-block h-2.5 w-2.5 rounded-full ${bg}`} />
}

export function ChargeMeter({
  ratio,
  holding,
  label,
}: {
  ratio: number
  holding: boolean
  label: string
}) {
  return (
    <div className="grid gap-2">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{holding ? `${Math.round(ratio * 100)}%` : '0.3–1.2 秒'}</span>
      </div>
      <div className="stat-track h-3">
        <div className="stat-fill charge-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  )
}
