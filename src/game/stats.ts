import type {
  ComputedStats,
  CoreStats,
  EnhanceLevels,
  FormulasDb,
  KitIds,
  PartsDb,
  PartType,
  ResolvedKit,
  TipMotion,
} from '../types'
import { enhanceCore } from './enhance'

export const COVER_DEFAULT = 5
export const GUARD_DEFAULT = 5

export const TYPE_LABEL: Record<PartType, string> = {
  attack: '攻击',
  stamina: '持久',
  defense: '防御',
  balance: '平衡',
}

export const MOTION_TAG: Record<TipMotion, string> = {
  flat: '乱走',
  ball: '回稳',
  needle: '钉心',
  switch: '切换',
}

export const RARITY_TONE: Record<string, string> = {
  N: '普通',
  R: '稀有',
  SR: '超稀有',
}

const BEATS: Record<string, PartType> = {
  attack: 'stamina',
  stamina: 'defense',
  defense: 'attack',
}

const ZERO_ENHANCE: EnhanceLevels = { blade: 0, axle: 0, tip: 0 }

export function resolveKit(parts: PartsDb, ids: KitIds, enhance: EnhanceLevels = ZERO_ENHANCE, formulas?: FormulasDb): ResolvedKit {
  const blade = parts.blades.find((p) => p.id === ids.blade)
  const axle = parts.axles.find((p) => p.id === ids.axle)
  const tip = parts.tips.find((p) => p.id === ids.tip)
  if (!blade || !axle || !tip) {
    throw new Error(`零件缺失：${ids.blade}/${ids.axle}/${ids.tip}`)
  }
  return {
    blade: formulas ? enhanceCore(blade, enhance.blade, formulas) : blade,
    axle: formulas ? enhanceCore(axle, enhance.axle, formulas) : axle,
    tip: formulas ? enhanceCore(tip, enhance.tip, formulas) : tip,
    cover: parts.cover_default ?? COVER_DEFAULT,
    guard: parts.guard_default ?? GUARD_DEFAULT,
    enhance,
  }
}

export function computeStats(kit: ResolvedKit, formulas?: FormulasDb): ComputedStats {
  const { blade, axle, tip, cover, guard } = kit
  const core = formulas
    ? computeStatsFromFormulas(kit, formulas)
    : {
        impact:
          blade.impact * 0.55 +
          axle.impact * 0.15 +
          tip.impact * 0.3 +
          axle.impact_mod +
          tip.impact_mod,
        stamina:
          blade.stamina * 0.2 +
          axle.stamina * 0.25 +
          tip.stamina * 0.55 +
          axle.stamina_mod +
          tip.stamina_mod,
        defense: blade.defense * 0.25 + guard * 0.4 + tip.defense * 0.35 + axle.defense_mod,
        burst: cover * 0.2 + guard * 0.5 + axle.burst * 0.3 + axle.burst_mod,
      }
  return {
    ...core,
    wander: tip.wander,
    friction: tip.friction,
    recover: tip.recover,
    height: axle.height,
    weight: axle.weight,
    motion: tip.type,
    type: blade.type,
    movementTag: MOTION_TAG[tip.type],
  }
}

/** Evaluate the published formula strings so adding stats stays JSON-driven. */
export function computeStatsFromFormulas(kit: ResolvedKit, formulas: FormulasDb): CoreStats {
  const ctx: Record<string, number> = {
    blade: 0,
    axle: 0,
    tip: 0,
    cover: kit.cover,
    guard: kit.guard,
    'axle.impact_mod': kit.axle.impact_mod,
    'axle.stamina_mod': kit.axle.stamina_mod,
    'axle.defense_mod': kit.axle.defense_mod,
    'axle.burst_mod': kit.axle.burst_mod,
    'tip.impact_mod': kit.tip.impact_mod,
    'tip.stamina_mod': kit.tip.stamina_mod,
  }
  const out: CoreStats = { impact: 0, stamina: 0, defense: 0, burst: 0 }
  ;(Object.keys(formulas.stats) as (keyof CoreStats)[]).forEach((key) => {
    ctx.blade = kit.blade[key]
    ctx.axle = kit.axle[key]
    ctx.tip = kit.tip[key]
    out[key] = evalLinear(formulas.stats[key], ctx)
  })
  return out
}

function evalLinear(expr: string, ctx: Record<string, number>): number {
  const tokens = expr.split('+').map((s) => s.trim())
  let sum = 0
  for (const token of tokens) {
    if (token.includes('*')) {
      const [name, coeff] = token.split('*').map((s) => s.trim())
      sum += (ctx[name] ?? 0) * Number(coeff)
    } else {
      sum += ctx[token] ?? 0
    }
  }
  return sum
}

export function typeModifier(attacker: PartType, defender: PartType, formulas: FormulasDb): number {
  if (attacker === 'balance' || defender === 'balance') return 1
  const m = formulas.type_modifier
  if (BEATS[attacker] === defender) return 1 + m
  if (BEATS[defender] === attacker) return 1 - m
  return 1
}

export function burstChance(impactIncoming: number, burstStat: number, k = 0.22): number {
  if (burstStat <= 0) return 0.45
  return Math.min(0.45, Math.max(0, (impactIncoming / burstStat) * k))
}

export function clampChargeMs(ms: number): number {
  return Math.min(1200, Math.max(300, ms))
}

export function kitLabel(kit: ResolvedKit): string {
  return `${kit.blade.name} · ${kit.axle.name} · ${kit.tip.name}`
}
