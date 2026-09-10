import { useEffect, useMemo, useRef, useState } from 'react'
import { loadGameData } from './data/load'
import { FightSession, makeLaunch, scoreLabel, type FightSnapshot } from './game/match'
import { ArenaWorld } from './game/physics'
import { drawArena } from './game/render'
import { SeededRng } from './game/rng'
import { computeStats, kitLabel, resolveKit, TYPE_LABEL } from './game/stats'
import type {
  GameData,
  KitIds,
  MatchSummary,
  NpcFighter,
  ReplayTape,
  ResolvedKit,
  Screen,
} from './types'
import { ChargeMeter, RarityBadge, StatBars, TypeDot } from './ui/widgets'
import { useCharge } from './ui/useCharge'

const STARTER: KitIds = { blade: 'BL01', axle: 'AX04', tip: 'TP03' }
const TRAIN_B: KitIds = { blade: 'BL05', axle: 'AX01', tip: 'TP01' }

export default function App() {
  const [data, setData] = useState<GameData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('lobby')
  const [kit, setKit] = useState<KitIds>(STARTER)
  const [trainB, setTrainB] = useState<KitIds>(TRAIN_B)
  const [slot, setSlot] = useState<'blade' | 'axle' | 'tip'>('blade')
  const [npc, setNpc] = useState<NpcFighter | null>(null)
  const [summary, setSummary] = useState<MatchSummary | null>(null)
  const [replay, setReplay] = useState<ReplayTape | null>(null)
  const [seed, setSeed] = useState(() => (Math.random() * 1e9) | 0)

  useEffect(() => {
    loadGameData()
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '配置读取失败'))
  }, [])

  if (error) {
    return (
      <Shell>
        <div className="metal-panel mx-auto max-w-lg rounded-3xl p-8 text-center">
          <h1 className="text-2xl text-rose-300">校准失败</h1>
          <p className="mt-3 text-slate-300">{error}</p>
        </div>
      </Shell>
    )
  }
  if (!data) {
    return (
      <Shell>
        <div className="metal-panel mx-auto max-w-lg rounded-3xl p-8 text-center">
          <p className="text-cyan-300">旋核校准中…</p>
        </div>
      </Shell>
    )
  }

  const resolved = resolveKit(data.parts, kit)
  const stats = computeStats(resolved, data.formulas)

  return (
    <Shell>
      {screen === 'lobby' && (
        <Lobby
          onWorkshop={() => setScreen('workshop')}
          onTrain={() => setScreen('training')}
          onFight={() => setScreen('npc-select')}
          kit={resolved}
          stats={stats}
        />
      )}
      {screen === 'workshop' && (
        <Workshop
          data={data}
          kit={kit}
          slot={slot}
          onSlot={setSlot}
          onKit={setKit}
          onBack={() => setScreen('lobby')}
        />
      )}
      {screen === 'training' && (
        <Training
          data={data}
          kitA={kit}
          kitB={trainB}
          onKitB={setTrainB}
          onWorkshop={() => setScreen('workshop')}
          onBack={() => setScreen('lobby')}
        />
      )}
      {screen === 'npc-select' && (
        <NpcSelect
          data={data}
          onBack={() => setScreen('lobby')}
          onPick={(fighter) => {
            setNpc(fighter)
            setReplay(null)
            setSeed((Math.random() * 1e9) | 0)
            setScreen('fight')
          }}
        />
      )}
      {screen === 'fight' && npc && (
        <Fight
          data={data}
          kit={kit}
          npc={npc}
          seed={seed}
          replay={replay}
          onExit={() => setScreen('npc-select')}
          onDone={(s) => {
            setSummary(s)
            setScreen('result')
          }}
        />
      )}
      {screen === 'result' && summary && npc && (
        <Result
          data={data}
          summary={summary}
          npc={npc}
          onLobby={() => setScreen('lobby')}
          onRematch={() => {
            setReplay(null)
            setSeed((Math.random() * 1e9) | 0)
            setScreen('fight')
          }}
          onReplay={() => {
            setReplay(summary.tape)
            setSeed(summary.seed)
            setScreen('fight')
          }}
        />
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.35em] text-amber-300/80">SPINCORE P0</p>
          <h1 className="text-3xl font-black tracking-wide text-white md:text-4xl">旋核对战 SpinCore</h1>
        </div>
        <p className="max-w-sm text-right text-xs text-slate-400">卡通金属竞技场 · 零件全部来自配置表</p>
      </header>
      {children}
    </div>
  )
}

function Lobby({
  onWorkshop,
  onTrain,
  onFight,
  kit,
  stats,
}: {
  onWorkshop: () => void
  onTrain: () => void
  onFight: () => void
  kit: ResolvedKit
  stats: ReturnType<typeof computeStats>
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
      <section className="metal-panel rounded-3xl p-6 md:p-8">
        <p className="text-sm text-cyan-300">训练场 + NPC 对战已开放</p>
        <h2 className="mt-2 text-2xl font-bold">把旋核扔进环形场</h2>
        <p className="mt-3 max-w-xl text-slate-300">
          蓄力 0.3–1.2 秒发射。轴尖决定轨迹：平冲乱走、岩圆回稳、寒针钉心、可调外攻内收。先到 4 分者胜，最多 3 局。
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
        <p className="text-xs text-slate-400">初始解锁套装 PS03</p>
        <h3 className="mt-1 text-xl font-bold">{kitLabel(kit)}</h3>
        <div className="mt-4">
          <StatBars stats={stats} />
        </div>
      </aside>
    </div>
  )
}

function Workshop({
  data,
  kit,
  slot,
  onSlot,
  onKit,
  onBack,
}: {
  data: GameData
  kit: KitIds
  slot: 'blade' | 'axle' | 'tip'
  onSlot: (s: 'blade' | 'axle' | 'tip') => void
  onKit: (k: KitIds) => void
  onBack: () => void
}) {
  const resolved = resolveKit(data.parts, kit)
  const stats = computeStats(resolved, data.formulas)
  const list =
    slot === 'blade' ? data.parts.blades : slot === 'axle' ? data.parts.axles : data.parts.tips
  const selected = kit[slot]

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <section className="metal-panel rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">工坊</h2>
          <button className="metal-btn rounded-lg px-3 py-1 text-sm" onClick={onBack}>
            返回
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">三槽：刃 / 轴 / 尖 · 数值实时来自 JSON</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(
            [
              ['blade', resolved.blade.name],
              ['axle', resolved.axle.name],
              ['tip', resolved.tip.name],
            ] as const
          ).map(([key, name]) => (
            <button
              key={key}
              className={`rounded-2xl border px-2 py-3 text-sm ${
                slot === key ? 'border-amber-300 bg-amber-300/10' : 'border-slate-600'
              }`}
              onClick={() => onSlot(key)}
            >
              <div className="text-[10px] text-slate-400">{key === 'blade' ? '刃' : key === 'axle' ? '轴' : '尖'}</div>
              <div className="font-bold">{name}</div>
            </button>
          ))}
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
          {list.map((part) => (
            <button
              key={part.id}
              className={`rounded-2xl border p-3 text-left ${
                selected === part.id ? 'border-cyan-300 bg-cyan-300/10' : 'border-slate-600'
              }`}
              onClick={() => onKit({ ...kit, [slot]: part.id })}
            >
              <div className="flex items-center gap-2">
                <TypeDot type={part.type === 'flat' || part.type === 'ball' || part.type === 'needle' || part.type === 'switch' ? 'balance' : part.type} />
                <span className="font-bold">{part.name}</span>
                <span className="text-xs text-slate-400">{part.id}</span>
                <RarityBadge rarity={part.rarity} />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                冲击 {part.impact} · 持久 {part.stamina} · 防御 {part.defense} · 抗爆 {part.burst}
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function Training({
  data,
  kitA,
  kitB,
  onKitB,
  onWorkshop,
  onBack,
}: {
  data: GameData
  kitA: KitIds
  kitB: KitIds
  onKitB: (k: KitIds) => void
  onWorkshop: () => void
  onBack: () => void
}) {
  const a = useMemo(() => resolveKit(data.parts, kitA), [data, kitA])
  const b = useMemo(() => resolveKit(data.parts, kitB), [data, kitB])
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
          左青右橙，换尖后重进即可对比轨迹。约 10 秒内：平尖乱走、圆尖回稳、针尖进坑。
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
          <p className="text-xs text-cyan-300">我方 · {a.blade.name}</p>
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

function NpcSelect({
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
      <p className="mt-2 text-sm text-slate-400">P0 可打 3 场；其余 7 套为脚本占位。</p>
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

function Fight({
  data,
  kit,
  npc,
  seed,
  replay,
  onExit,
  onDone,
}: {
  data: GameData
  kit: KitIds
  npc: NpcFighter
  seed: number
  replay: ReplayTape | null
  onExit: () => void
  onDone: (s: MatchSummary) => void
}) {
  const p1 = useMemo(() => resolveKit(data.parts, kit), [data, kit])
  const p2 = useMemo(() => resolveKit(data.parts, npc), [data, npc])
  const sessionRef = useRef<FightSession | null>(null)
  const rngRef = useRef(new SeededRng(seed))
  const [snap, setSnap] = useState<FightSnapshot>(() => placeholderSnap())
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
    if (replay) {
      session.autoLaunchFromTape(rngRef.current)
    }
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
        <p className="mt-2 text-sm">{kitLabel(p1)}</p>
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

function Result({
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
            第 {i + 1} 局 · {scoreLabel(ev.kind)} +{data.formulas.score[ev.kind]} ·{' '}
            {ev.winner === 1 ? '你' : npc.name}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-slate-500">回放种子 {summary.seed} · 同套装同发射同种子可复现</p>
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

function ArenaView({ step }: { step: () => import('./game/physics').TopRuntime[] | null }) {
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
      const tops = stepRef.current()
      drawArena(ctx, tops)
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

function HoldButton({
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

function placeholderSnap() {
  return {
    phase: 'ready' as const,
    round: 1,
    timeLeftMs: 40000,
    p1Points: 0,
    p2Points: 0,
    lastEvent: null,
    banner: '蓄力发射',
    winner: 0 as const,
  }
}
