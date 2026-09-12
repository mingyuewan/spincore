import { useEffect, useMemo, useRef, useState } from 'react'
import { FightSession, makeLaunch, scoreLabel, type FightSnapshot } from '../game/match'
import { SeededRng } from '../game/rng'
import { kitLabel, resolveKit } from '../game/stats'
import type { EnhanceLevels, GameData, KitIds, MatchSummary, NpcFighter, ReplayTape } from '../types'
import { ArenaView, HoldButton } from '../ui/arenaView'
import { useCharge } from '../ui/useCharge'
import { ChargeMeter } from '../ui/widgets'

export function Fight({
  data,
  kit,
  enhance,
  npc,
  seed,
  replay,
  onExit,
  onDone,
}: {
  data: GameData
  kit: KitIds
  enhance: EnhanceLevels
  npc: NpcFighter
  seed: number
  replay: ReplayTape | null
  onExit: () => void
  onDone: (s: MatchSummary) => void
}) {
  const p1Enhance = replay?.p1Enhance ?? enhance
  const p2Enhance = replay?.p2Enhance ?? { blade: 0, axle: 0, tip: 0 }
  const p1 = useMemo(() => resolveKit(data.parts, kit, p1Enhance, data.formulas), [data, kit, p1Enhance])
  const p2 = useMemo(() => resolveKit(data.parts, npc, p2Enhance, data.formulas), [data, npc, p2Enhance])
  const sessionRef = useRef<FightSession | null>(null)
  const rngRef = useRef(new SeededRng(seed))
  const [snap, setSnap] = useState<FightSnapshot>(placeholderSnap)
  const [readyTick, setReadyTick] = useState(0)
  const charge = useCharge()
  const finished = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    finished.current = false
    rngRef.current = new SeededRng(seed)
    const session = new FightSession(seed, data.formulas, p1, p2, kit, npc, replay ?? undefined)
    sessionRef.current = session
    setSnap(session.snapshot())
    setReadyTick((n) => n + 1)
    if (replay) session.autoLaunchFromTape(rngRef.current)
    const hud = setInterval(() => {
      const s = session.snapshot()
      setSnap({ ...s })
      if (s.phase === 'matchend' && !finished.current) {
        finished.current = true
        onDoneRef.current(session.summary())
      }
    }, 80)
    return () => {
      clearInterval(hud)
      session.destroy()
      sessionRef.current = null
    }
  }, [data, p1, p2, kit, npc, seed, replay])

  const release = () => {
    const session = sessionRef.current
    if (!session || (session.phase !== 'ready' && session.phase !== 'charging')) return
    const pLaunch = makeLaunch(charge.end(), rngRef.current)
    const nLaunch = replay ? replay.launch2 : makeLaunch(npc.charge_ms, rngRef.current)
    session.beginLaunch(pLaunch, nLaunch)
    setSnap(session.snapshot())
  }
  const chargeRef = useRef(charge)
  chargeRef.current = charge
  const releaseRef = useRef(release)
  releaseRef.current = release

  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      if (ev.code !== 'Space' || ev.repeat || replay) return
      ev.preventDefault()
      chargeRef.current.begin()
    }
    const up = (ev: KeyboardEvent) => {
      if (ev.code !== 'Space' || replay) return
      ev.preventDefault()
      if (chargeRef.current.holding) releaseRef.current()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [replay])

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <section className="metal-panel rounded-3xl p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs text-slate-400">
              第 {snap.round}/3 局 · 先到 {data.formulas.win_points} 分
            </p>
            <h2 className="text-xl font-bold">{snap.banner}</h2>
          </div>
          <button className="metal-btn rounded-lg px-3 py-1 text-sm" onClick={onExit}>
            放弃
          </button>
        </div>
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-cyan-300">你 {snap.p1Points}</span>
          <span className="tabular-nums text-amber-200">{(snap.timeLeftMs / 1000).toFixed(1)}s</span>
          <span className="text-orange-300">
            {npc.name} {snap.p2Points}
          </span>
        </div>
        <ArenaView
          key={readyTick}
          step={() => {
            sessionRef.current?.step(1000 / 60)
            return sessionRef.current?.world.tops ?? null
          }}
        />
      </section>
      <aside className="metal-panel rounded-3xl p-4">
        <p className="text-xs text-slate-400">种子 {seed}</p>
        <p className="mt-2 text-sm">
          {kitLabel(p1)} · +{p1.enhance.blade}/{p1.enhance.axle}/{p1.enhance.tip}
        </p>
        <p className="mt-1 text-sm text-slate-400">vs {kitLabel(p2)}</p>
        <div className="mt-4">
          <ChargeMeter ratio={charge.ratio} holding={charge.holding} label="发射蓄力" />
        </div>
        <HoldButton
          className="gold-btn mt-4 w-full rounded-xl py-3 font-bold"
          disabled={snap.phase !== 'ready' && snap.phase !== 'charging'}
          onHold={() => {
            if (replay) return
            charge.begin()
          }}
          onRelease={() => {
            if (replay) return
            release()
          }}
        >
          {replay ? '回放中' : snap.phase === 'live' ? '对撞中' : '按住发射（空格）'}
        </HoldButton>
        {snap.lastEvent && (
          <p className="mt-3 text-amber-200">
            {scoreLabel(snap.lastEvent.kind)} · {snap.lastEvent.winner === 1 ? '你得分' : '对手得分'}
          </p>
        )}
        <p className="mt-4 text-xs text-slate-500">满蓄有 8% 过冲。超时比剩余转速。</p>
      </aside>
    </div>
  )
}

export function Result({
  data,
  summary,
  npc,
  onLobby,
  onRematch,
  onReplay,
}: {
  data: GameData
  summary: MatchSummary
  npc: NpcFighter
  onLobby: () => void
  onRematch: () => void
  onReplay: () => void
}) {
  const title = summary.winner === 1 ? '胜利' : summary.winner === 2 ? '惜败' : '平局'
  return (
    <section className="metal-panel mx-auto max-w-xl rounded-3xl p-6 text-center">
      <p className="text-xs tracking-[0.3em] text-amber-300">RESULT</p>
      <h2 className="mt-2 text-4xl font-black">{title}</h2>
      <p className="mt-2 text-lg">
        你 {summary.p1Points} — {summary.p2Points} {npc.name}
      </p>
      <ul className="mt-5 space-y-2 text-left text-sm">
        {summary.rounds.length === 0 && <li className="text-slate-400">没有形成有效得分。</li>}
        {summary.rounds.map((ev, i) => (
          <li key={`${ev.kind}-${i}`} className="rounded-xl border border-slate-600 px-3 py-2">
            第 {i + 1} 局 · {scoreLabel(ev.kind)} +{data.formulas.score[ev.kind]} · {ev.winner === 1 ? '你' : npc.name}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-slate-500">回放种子 {summary.seed} · 同套装同发射同强化同种子可复现</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button className="gold-btn rounded-xl px-5 py-3 font-bold" onClick={onRematch}>
          再来一局
        </button>
        <button className="cyan-btn rounded-xl px-5 py-3 font-bold" onClick={onReplay}>
          回放本局
        </button>
        <button className="metal-btn rounded-xl px-5 py-3 font-bold" onClick={onLobby}>
          大厅
        </button>
      </div>
    </section>
  )
}

function placeholderSnap(): FightSnapshot {
  return {
    phase: 'ready',
    round: 1,
    timeLeftMs: 40000,
    p1Points: 0,
    p2Points: 0,
    lastEvent: null,
    banner: '蓄力发射',
    winner: 0,
  }
}
