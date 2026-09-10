export type PartType = 'attack' | 'stamina' | 'defense' | 'balance'
export type TipMotion = 'flat' | 'ball' | 'needle' | 'switch'
export type Rarity = 'N' | 'R' | 'SR'
export type ScoreKind = 'xtreme' | 'over' | 'burst' | 'spin'
export type Screen = 'lobby' | 'workshop' | 'training' | 'npc-select' | 'fight' | 'result'

export interface CoreStats {
  impact: number
  stamina: number
  defense: number
  burst: number
}

export interface Blade extends CoreStats {
  id: string
  name: string
  type: PartType
  rarity: Rarity
}

export interface Axle extends CoreStats {
  id: string
  name: string
  type: PartType
  rarity: Rarity
  height: number
  weight: number
  impact_mod: number
  stamina_mod: number
  defense_mod: number
  burst_mod: number
}

export interface Tip extends CoreStats {
  id: string
  name: string
  type: TipMotion
  rarity: Rarity
  friction: number
  wander: number
  recover: number
  stamina_mod: number
  impact_mod: number
}

export interface PartsDb {
  disclaimer: string
  cover_default: number
  guard_default: number
  blades: Blade[]
  axles: Axle[]
  tips: Tip[]
}

export interface StarterPreset {
  id: string
  name: string
  blade: string
  axle: string
  tip: string
  goal: string
}

export interface BaseSet {
  ref: string
  game: string
  impact: number
  stamina: number
  defense: number
  burst: number
}

export interface PresetsDb {
  starters: StarterPreset[]
  base_sets: BaseSet[]
}

export interface FormulasDb {
  stats: {
    impact: string
    stamina: string
    defense: string
    burst: string
  }
  type_triangle: string[]
  type_modifier: number
  score: Record<ScoreKind, number>
  win_points: number
  enhance_max: number
  enhance_per_level: number
}

export interface NpcFighter {
  id: string
  name: string
  playable: boolean
  blade: string
  axle: string
  tip: string
  charge_ms: number
  note: string
}

export interface KitIds {
  blade: string
  axle: string
  tip: string
}

export interface ResolvedKit {
  blade: Blade
  axle: Axle
  tip: Tip
  cover: number
  guard: number
}

export interface ComputedStats extends CoreStats {
  wander: number
  friction: number
  recover: number
  height: number
  weight: number
  motion: TipMotion
  type: PartType
  movementTag: string
}

export interface LaunchParams {
  chargeMs: number
  overshoot: boolean
}

export interface ReplayTape {
  seed: number
  p1: KitIds
  p2: KitIds
  launch1: LaunchParams
  launch2: LaunchParams
}

export interface RoundEvent {
  kind: ScoreKind
  winner: 1 | 2
  points: number
}

export interface MatchSummary {
  p1Points: number
  p2Points: number
  rounds: RoundEvent[]
  winner: 0 | 1 | 2
  seed: number
  tape: ReplayTape
}

export interface GameData {
  parts: PartsDb
  presets: PresetsDb
  formulas: FormulasDb
  npcs: NpcFighter[]
}
