import type { FormulasDb, GameData, NpcFighter, PartsDb, PresetsDb } from '../types'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`无法读取 ${url}（${res.status}）`)
  }
  return (await res.json()) as T
}

export async function loadGameData(): Promise<GameData> {
  const [parts, presets, formulas, npcFile] = await Promise.all([
    fetchJson<PartsDb>('/data/parts.json'),
    fetchJson<PresetsDb>('/data/presets.json'),
    fetchJson<FormulasDb>('/data/formulas.json'),
    fetchJson<{ fighters: NpcFighter[] }>('/data/npcs.json'),
  ])
  return { parts, presets, formulas, npcs: npcFile.fighters }
}
