import type { CoreStats, FormulasDb, KitIds } from '../types'

export const ENHANCE_STORAGE_KEY = 'spincore.enhance.v1'
export const KIT_STORAGE_KEY = 'spincore.kit.v1'

export type EnhanceMap = Record<string, number>

export function clampEnhance(level: number, max: number): number {
  if (!Number.isFinite(level)) return 0
  return Math.max(0, Math.min(max, Math.round(level)))
}

export function enhanceBonus(level: number, formulas: FormulasDb): number {
  return clampEnhance(level, formulas.enhance_max) * formulas.enhance_per_level
}

/** Additive: +enhance_per_level per level on the four core stats (Lv15 = +2.25 at 0.15). */
export function enhanceCore<T extends CoreStats>(part: T, level: number, formulas: FormulasDb): T {
  const add = enhanceBonus(level, formulas)
  if (add === 0) return part
  return {
    ...part,
    impact: part.impact + add,
    stamina: part.stamina + add,
    defense: part.defense + add,
    burst: part.burst + add,
  }
}

export function readEnhanceMap(): EnhanceMap {
  try {
    const raw = localStorage.getItem(ENHANCE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as EnhanceMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function writeEnhanceMap(map: EnhanceMap) {
  localStorage.setItem(ENHANCE_STORAGE_KEY, JSON.stringify(map))
}

export function readStoredKit(fallback: KitIds): KitIds {
  try {
    const raw = localStorage.getItem(KIT_STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<KitIds>
    if (parsed.blade && parsed.axle && parsed.tip) {
      return { blade: parsed.blade, axle: parsed.axle, tip: parsed.tip }
    }
  } catch {
    /* keep fallback */
  }
  return fallback
}

export function writeStoredKit(kit: KitIds) {
  localStorage.setItem(KIT_STORAGE_KEY, JSON.stringify(kit))
}

export function kitEnhance(kit: KitIds, map: EnhanceMap): { blade: number; axle: number; tip: number } {
  return {
    blade: map[kit.blade] ?? 0,
    axle: map[kit.axle] ?? 0,
    tip: map[kit.tip] ?? 0,
  }
}
