import type {
  FormulasDb,
  KitIds,
  LaunchParams,
  MatchSummary,
  ReplayTape,
  ResolvedKit,
  RoundEvent,
  ScoreKind,
} from '../types'
import { ArenaWorld, CHARGE_MAX, rollOvershoot, ROUND_MS } from './physics'
import { SeededRng } from './rng'
import { clampChargeMs } from './stats'

export type FightPhase = 'ready' | 'charging' | 'live' | 'roundend' | 'matchend'

export interface FightSnapshot {
  phase: FightPhase
  round: number
  timeLeftMs: number
  p1Points: number
  p2Points: number
  lastEvent: RoundEvent | null
  banner: string
  winner: 0 | 1 | 2
}

export class FightSession {
  world: ArenaWorld
  phase: FightPhase = 'ready'
  round = 1
  p1Points = 0
  p2Points = 0
  events: RoundEvent[] = []
  lastEvent: RoundEvent | null = null
  timeLeftMs = ROUND_MS
  banner = '蓄力发射'
  winner: 0 | 1 | 2 = 0
  readonly seed: number
  readonly tape: ReplayTape
  private roundClock = 0
  private endHold = 0
  private formulas: FormulasDb
  private consumed = false

  constructor(
    seed: number,
    formulas: FormulasDb,
    kit1: ResolvedKit,
    kit2: ResolvedKit,
    ids1: KitIds,
    ids2: KitIds,
    replay?: ReplayTape,
  ) {
    this.seed = seed
    this.formulas = formulas
    this.world = new ArenaWorld(seed, formulas, {
      onScore: (kind, winner) => this.acceptScore(kind, winner),
    })
    this.world.spawnTops(kit1, kit2)
    this.tape = replay ?? {
      seed,
      p1: ids1,
      p2: ids2,
      launch1: { chargeMs: 800, overshoot: false },
      launch2: { chargeMs: 800, overshoot: false },
    }
  }

  destroy() {
    this.world.destroy()
  }

  beginLaunch(p1: LaunchParams, p2: LaunchParams) {
    if (this.phase !== 'ready' && this.phase !== 'charging') return
    this.tape.launch1 = { ...p1, chargeMs: clampChargeMs(p1.chargeMs) }
    this.tape.launch2 = { ...p2, chargeMs: clampChargeMs(p2.chargeMs) }
    this.world.launch(1, this.tape.launch1)
    this.world.launch(2, this.tape.launch2)
    this.phase = 'live'
    this.timeLeftMs = ROUND_MS
    this.roundClock = 0
    this.consumed = false
    this.banner = `第 ${this.round} 局`
  }

  autoLaunchFromTape(rng: SeededRng) {
    const l1 = this.tape.launch1
    const l2 = this.tape.launch2
    this.beginLaunch(
      { chargeMs: l1.chargeMs, overshoot: l1.overshoot || rollOvershoot(l1.chargeMs, rng) },
      { chargeMs: l2.chargeMs, overshoot: l2.overshoot || rollOvershoot(l2.chargeMs, rng) },
    )
  }

  step(dt: number) {
    this.world.step(dt)
    if (this.phase === 'live') {
      this.roundClock += dt
      this.timeLeftMs = Math.max(0, ROUND_MS - this.roundClock)
      if (this.timeLeftMs <= 0 && !this.consumed) {
        this.world.finishByTimeout()
        if (!this.consumed) {
          this.banner = '双方转速相当'
          this.enterRoundEnd()
        }
      }
    } else if (this.phase === 'roundend') {
      this.endHold += dt
      if (this.endHold > 1600) this.nextRoundOrFinish()
    }
  }

  snapshot(): FightSnapshot {
    return {
      phase: this.phase,
      round: this.round,
      timeLeftMs: this.timeLeftMs,
      p1Points: this.p1Points,
      p2Points: this.p2Points,
      lastEvent: this.lastEvent,
      banner: this.banner,
      winner: this.winner,
    }
  }

  summary(): MatchSummary {
    return {
      p1Points: this.p1Points,
      p2Points: this.p2Points,
      rounds: this.events,
      winner: this.winner,
      seed: this.seed,
      tape: this.tape,
    }
  }

  private acceptScore(kind: ScoreKind, winner: 1 | 2) {
    if (this.consumed || this.phase !== 'live') return
    this.consumed = true
    const points = this.formulas.score[kind]
    const ev: RoundEvent = { kind, winner, points }
    this.events.push(ev)
    this.lastEvent = ev
    if (winner === 1) this.p1Points += points
    else this.p2Points += points
    this.banner = `${scoreLabel(kind)} +${points}`
    this.enterRoundEnd()
  }

  private matchOver(): boolean {
    const need = this.formulas.win_points
    return this.p1Points >= need || this.p2Points >= need || this.round >= 3
  }

  private enterRoundEnd() {
    this.phase = 'roundend'
    this.endHold = 0
    if (this.matchOver()) this.decideWinner()
  }

  private nextRoundOrFinish() {
    if (this.matchOver()) {
      this.decideWinner()
      return
    }
    this.round += 1
    this.consumed = false
    this.lastEvent = null
    this.world.resetPositions()
    this.phase = 'ready'
    this.timeLeftMs = ROUND_MS
    this.banner = `第 ${this.round} 局 · 再次蓄力`
  }

  private decideWinner() {
    if (this.p1Points > this.p2Points) this.winner = 1
    else if (this.p2Points > this.p1Points) this.winner = 2
    else this.winner = 0
    this.phase = 'matchend'
    this.banner = this.winner === 0 ? '平局' : this.winner === 1 ? '你赢了' : '对手获胜'
  }
}

export function scoreLabel(kind: ScoreKind): string {
  if (kind === 'xtreme') return '极限击飞'
  if (kind === 'over') return '出局'
  if (kind === 'burst') return '爆裂'
  return '停转'
}

export function makeLaunch(chargeMs: number, rng: SeededRng): LaunchParams {
  const ms = clampChargeMs(chargeMs)
  return { chargeMs: ms, overshoot: rollOvershoot(ms, rng) }
}

export function isFullCharge(ms: number): boolean {
  return ms >= CHARGE_MAX - 8
}
