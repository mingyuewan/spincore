import Matter from 'matter-js'
import type { ComputedStats, FormulasDb, LaunchParams, ResolvedKit, ScoreKind } from '../types'
import { SeededRng } from './rng'
import { burstChance, clampChargeMs, computeStats, typeModifier } from './stats'

export const ARENA = {
  size: 640,
  radius: 248,
  pitRadius: 62,
  railInner: 198,
  railOuter: 242,
  pocketAngles: [0.55, 2.12, 3.67, 5.22],
  pocketHalf: 0.22,
  topRadius: 20,
} as const

export const CHARGE_MIN = 300
export const CHARGE_MAX = 1200
export const ROUND_MS = 40_000
export const XTREM_SPEED = 7.6

export interface TopRuntime {
  id: 1 | 2
  body: Matter.Body
  kit: ResolvedKit
  stats: ComputedStats
  alive: boolean
  armed: boolean
  bursted: boolean
  spinAngle: number
  trail: { x: number; y: number }[]
  lastHitAt: number
}

export interface PhysicsHooks {
  onScore: (kind: ScoreKind, winner: 1 | 2) => void
}

export class ArenaWorld {
  readonly engine: Matter.Engine
  readonly world: Matter.World
  readonly cx: number
  readonly cy: number
  tops: [TopRuntime, TopRuntime] | null = null
  tick = 0
  private rng: SeededRng
  private formulas: FormulasDb
  private hooks: PhysicsHooks
  private running = false
  scoring = true
  private lastBurstTick = -999

  constructor(seed: number, formulas: FormulasDb, hooks: PhysicsHooks) {
    this.rng = new SeededRng(seed)
    this.formulas = formulas
    this.hooks = hooks
    this.cx = ARENA.size / 2
    this.cy = ARENA.size / 2
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 0, scale: 0 },
      enableSleeping: false,
    })
    this.engine.timing.timeScale = 1
    this.world = this.engine.world
    this.buildStadium()
    Matter.Events.on(this.engine, 'collisionStart', (ev) => this.onCollide(ev))
  }

  destroy() {
    Matter.Events.off(this.engine, 'collisionStart')
    Matter.World.clear(this.world, false)
    Matter.Engine.clear(this.engine)
  }

  spawnTops(kit1: ResolvedKit, kit2: ResolvedKit) {
    if (this.tops) {
      Matter.World.remove(this.world, this.tops[0].body)
      Matter.World.remove(this.world, this.tops[1].body)
    }
    this.tops = [this.makeTop(1, kit1, this.cx - 168, this.cy), this.makeTop(2, kit2, this.cx + 168, this.cy)]
  }

  launch(id: 1 | 2, params: LaunchParams) {
    const top = this.tops?.[id - 1]
    if (!top) return
    const charge = clampChargeMs(params.chargeMs)
    const t = (charge - CHARGE_MIN) / (CHARGE_MAX - CHARGE_MIN)
    const inward = id === 1 ? 0 : Math.PI
    // High charge hugs the rail; low charge dives toward the pit.
    const railBias = (t - 0.35) * 0.62
    let angle = inward + railBias * (id === 1 ? 1 : -1)
    if (params.overshoot) {
      angle += this.rng.signed() * 0.42
    }
    const speed = 5.2 + t * 7.4 + (params.overshoot ? 1.8 : 0)
    const spin = (14 + t * 22 + top.stats.stamina * 0.35) * (id === 1 ? 1 : -1)
    Matter.Body.setVelocity(top.body, {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed * 0.22 + this.rng.signed() * 0.35,
    })
    Matter.Body.setAngularVelocity(top.body, spin * 0.085)
    top.alive = true
    top.armed = true
    top.bursted = false
    top.trail = []
    this.running = true
  }

  resetPositions() {
    if (!this.tops) return
    this.place(this.tops[0], this.cx - 168, this.cy)
    this.place(this.tops[1], this.cx + 168, this.cy)
    this.running = false
  }

  step(dt = 1000 / 60) {
    if (this.tops && this.running) {
      for (const top of this.tops) {
        if (top.alive) this.applyTipMotion(top)
      }
    }
    Matter.Engine.update(this.engine, dt)
    this.tick += 1
    if (!this.tops) return
    for (const top of this.tops) {
      top.spinAngle += top.body.angularVelocity
      if (top.alive) {
        top.trail.push({ x: top.body.position.x, y: top.body.position.y })
        if (top.trail.length > 90) top.trail.shift()
      }
    }
    if (this.running) this.checkExits()
  }

  remainingSpin(id: 1 | 2): number {
    const top = this.tops?.[id - 1]
    if (!top || !top.alive) return 0
    return Math.abs(top.body.angularVelocity)
  }

  private place(top: TopRuntime, x: number, y: number) {
    Matter.Body.setPosition(top.body, { x, y })
    Matter.Body.setVelocity(top.body, { x: 0, y: 0 })
    Matter.Body.setAngularVelocity(top.body, 0)
    top.alive = true
    top.armed = false
    top.bursted = false
    top.trail = []
    top.spinAngle = 0
  }

  private makeTop(id: 1 | 2, kit: ResolvedKit, x: number, y: number): TopRuntime {
    const stats = computeStats(kit, this.formulas)
    const body = Matter.Bodies.circle(x, y, ARENA.topRadius, {
      label: `top-${id}`,
      restitution: 0.88,
      friction: 0.01,
      frictionAir: 0.002 + stats.friction * 0.00035,
      density: 0.0018 + stats.weight * 0.00012,
      slop: 0.04,
    })
    Matter.Body.setInertia(body, body.inertia * (0.85 + stats.weight / 40))
    Matter.World.add(this.world, body)
    return {
      id,
      body,
      kit,
      stats,
      alive: true,
      armed: false,
      bursted: false,
      spinAngle: 0,
      trail: [],
      lastHitAt: -999,
    }
  }

  private buildStadium() {
    const { radius: R, pocketAngles, pocketHalf } = ARENA
    const segs = 80
    for (let i = 0; i < segs; i++) {
      const mid = ((i + 0.5) / segs) * Math.PI * 2
      if (pocketAngles.some((a) => angleDelta(mid, a) < pocketHalf)) continue
      const x = this.cx + Math.cos(mid) * R
      const y = this.cy + Math.sin(mid) * R
      const brick = Matter.Bodies.rectangle(x, y, 20, 26, {
        isStatic: true,
        angle: mid,
        restitution: 0.94,
        friction: 0.04,
        label: 'wall',
      })
      Matter.World.add(this.world, brick)
    }
  }

  private applyTipMotion(top: TopRuntime) {
    const { body, stats } = top
    const dx = body.position.x - this.cx
    const dy = body.position.y - this.cy
    const dist = Math.hypot(dx, dy) || 0.001
    const nx = dx / dist
    const ny = dy / dist
    const radial = dist / ARENA.radius

    let wander = stats.wander
    let recover = stats.recover
    let friction = stats.friction

    if (stats.motion === 'switch') {
      if (radial > 0.62) {
        wander *= 1.55
        recover *= 0.55
      } else if (radial < 0.42) {
        wander *= 0.45
        recover *= 1.65
      }
    }

    const vx = body.velocity.x
    const vy = body.velocity.y
    const speed = Math.hypot(vx, vy)

    // Wander: seeded lateral shove — flat tips scribble across the floor.
    const wAmp = wander * 0.00115
    const phase = this.tick * 0.11 + top.id * 2.7 + stats.wander
    const wobble = Math.sin(phase) * wAmp + Math.cos(phase * 0.37) * wAmp * 0.55
    Matter.Body.applyForce(body, body.position, {
      x: -ny * wobble * stats.weight * 0.08,
      y: nx * wobble * stats.weight * 0.08,
    })

    // Recover: kill radial velocity / pull toward a preferred band.
    let prefer = ARENA.radius * 0.48
    if (stats.motion === 'needle') prefer = ARENA.pitRadius * 0.35
    if (stats.motion === 'flat') prefer = ARENA.radius * 0.72
    if (stats.motion === 'ball') prefer = ARENA.radius * 0.44
    const recoverK = recover * 0.000018
    Matter.Body.applyForce(body, body.position, {
      x: nx * (prefer - dist) * recoverK,
      y: ny * (prefer - dist) * recoverK,
    })
    const radialVel = vx * nx + vy * ny
    Matter.Body.applyForce(body, body.position, {
      x: -nx * radialVel * recover * 0.00022,
      y: -ny * radialVel * recover * 0.00022,
    })

    // Needle + pit: visibly sink into the shallow center.
    if (dist < ARENA.pitRadius + 18) {
      const pitPull = (stats.motion === 'needle' ? 0.00034 : 0.00012) * (1 - dist / (ARENA.pitRadius + 18))
      Matter.Body.applyForce(body, body.position, { x: -nx * pitPull, y: -ny * pitPull })
    }

    // Outer boost rail: spin-fed tangential kick.
    if (dist > ARENA.railInner && dist < ARENA.railOuter) {
      const dir = body.angularVelocity >= 0 ? 1 : -1
      const boost = 0.0002 + Math.abs(body.angularVelocity) * 0.00008
      Matter.Body.applyForce(body, body.position, {
        x: -ny * dir * boost,
        y: nx * dir * boost,
      })
    }

    // Angular decay from friction / weight / stamina (not collapsed into impact).
    const fr = friction / 10
    const stamina = Math.max(0.8, stats.stamina)
    const weight = stats.weight / 14
    const decay = 0.00105 * fr * (1.15 / (0.55 + stamina * 0.12)) * (0.92 + 0.12 / weight)
    const av = body.angularVelocity
    const next = av * (1 - decay)
    Matter.Body.setAngularVelocity(body, Math.abs(next) < 0.035 ? 0 : next)

    if (speed > 13) {
      Matter.Body.setVelocity(body, { x: vx * 0.96, y: vy * 0.96 })
    }
  }

  private checkExits() {
    if (!this.tops) return
    for (const top of this.tops) {
      if (!top.alive) continue
      const dx = top.body.position.x - this.cx
      const dy = top.body.position.y - this.cy
      const dist = Math.hypot(dx, dy)
      const ang = Math.atan2(dy, dx)
      const inPocket = ARENA.pocketAngles.some((a) => angleDelta(ang, a) < ARENA.pocketHalf + 0.04)
      if (dist > ARENA.radius + 8 && inPocket) {
        this.knockOut(top, Math.hypot(top.body.velocity.x, top.body.velocity.y) >= XTREM_SPEED ? 'xtreme' : 'over')
      } else if (dist > ARENA.radius + 36) {
        this.knockOut(top, 'over')
      }
    }
    this.checkSpinDeath()
  }

  private checkSpinDeath() {
    if (!this.tops || !this.running || !this.scoring) return
    const [a, b] = this.tops
    if (!a.armed || !b.armed) return
    const sa = a.alive ? Math.abs(a.body.angularVelocity) : 0
    const sb = b.alive ? Math.abs(b.body.angularVelocity) : 0
    if (a.alive && sa <= 0.04 && this.tick > 40) this.knockOut(a, 'spin')
    if (b.alive && sb <= 0.04 && this.tick > 40) this.knockOut(b, 'spin')
  }

  finishByTimeout() {
    if (!this.tops) return
    const sa = this.remainingSpin(1)
    const sb = this.remainingSpin(2)
    if (sa === sb) return
    const loser = sa < sb ? this.tops[0] : this.tops[1]
    this.knockOut(loser, 'spin')
  }

  private knockOut(loser: TopRuntime, kind: ScoreKind) {
    if (!loser.alive || !this.tops) return
    if (!this.scoring) {
      loser.alive = false
      return
    }
    loser.alive = false
    if (kind === 'burst') loser.bursted = true
    Matter.Body.setVelocity(loser.body, { x: 0, y: 0 })
    Matter.Body.setAngularVelocity(loser.body, 0)
    const winner: 1 | 2 = loser.id === 1 ? 2 : 1
    this.running = this.tops[0].alive && this.tops[1].alive
    this.hooks.onScore(kind, winner)
  }

  private onCollide(ev: Matter.IEventCollision<Matter.Engine>) {
    if (!this.tops || !this.running) return
    for (const pair of ev.pairs) {
      const labels = [pair.bodyA.label, pair.bodyB.label]
      if (!labels.includes('top-1') || !labels.includes('top-2')) continue
      if (this.tick - this.lastBurstTick < 18) continue
      const a = this.tops[0]
      const b = this.tops[1]
      if (!a.alive || !b.alive) continue

      const rel = Math.hypot(a.body.velocity.x - b.body.velocity.x, a.body.velocity.y - b.body.velocity.y)
      const spinA = Math.abs(a.body.angularVelocity)
      const spinB = Math.abs(b.body.angularVelocity)
      const heightKnock = (h: number) => 1 + (180 - h) / 420

      const incomingOnB =
        a.stats.impact *
        typeModifier(a.stats.type, b.stats.type, this.formulas) *
        (0.55 + rel * 0.12) *
        (0.55 + spinA * 0.35) *
        heightKnock(a.stats.height) *
        (1 - b.stats.defense * 0.03)
      const incomingOnA =
        b.stats.impact *
        typeModifier(b.stats.type, a.stats.type, this.formulas) *
        (0.55 + rel * 0.12) *
        (0.55 + spinB * 0.35) *
        heightKnock(b.stats.height) *
        (1 - a.stats.defense * 0.03)

      const rollA = burstChance(incomingOnA, a.stats.burst)
      const rollB = burstChance(incomingOnB, b.stats.burst)
      this.lastBurstTick = this.tick
      a.lastHitAt = this.tick
      b.lastHitAt = this.tick

      if (incomingOnB >= incomingOnA && this.rng.chance(rollB)) {
        this.knockOut(b, 'burst')
        return
      }
      if (incomingOnA > incomingOnB && this.rng.chance(rollA)) {
        this.knockOut(a, 'burst')
        return
      }

      // Taller axles wobble more after a hit; short axles transfer linear punch.
      Matter.Body.setAngularVelocity(a.body, a.body.angularVelocity * (0.96 - (a.stats.height - 155) / 4000))
      Matter.Body.setAngularVelocity(b.body, b.body.angularVelocity * (0.96 - (b.stats.height - 155) / 4000))
    }
  }
}

function angleDelta(a: number, b: number): number {
  let d = Math.abs(a - b) % (Math.PI * 2)
  if (d > Math.PI) d = Math.PI * 2 - d
  return d
}

export function rollOvershoot(chargeMs: number, rng: SeededRng): boolean {
  return chargeMs >= CHARGE_MAX - 8 && rng.chance(0.08)
}
