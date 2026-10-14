import { useEffect, useMemo, useState } from 'react'
import { loadGameData } from './data/load'
import {
  kitEnhance,
  readEnhanceMap,
  readStoredKit,
  writeEnhanceMap,
  writeStoredKit,
  type EnhanceMap,
} from './game/enhance'
import { computeStats, resolveKit } from './game/stats'
import { Fight, Result } from './screens/fight'
import { Lobby } from './screens/lobby'
import { NpcSelect } from './screens/npcSelect'
import { Training } from './screens/training'
import { Workshop } from './screens/workshop'
import type { KitIds, MatchSummary, NpcFighter, ReplayTape, Screen } from './types'
import { Shell } from './ui/shell'

const STARTER: KitIds = { blade: 'BL01', axle: 'AX04', tip: 'TP03' }
const TRAIN_B: KitIds = { blade: 'BL05', axle: 'AX01', tip: 'TP01' }

export default function App() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadGameData>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('lobby')
  const [kit, setKit] = useState<KitIds>(() => readStoredKit(STARTER))
  const [trainB, setTrainB] = useState<KitIds>(TRAIN_B)
  const [slot, setSlot] = useState<'blade' | 'axle' | 'tip'>('blade')
  const [npc, setNpc] = useState<NpcFighter | null>(null)
  const [summary, setSummary] = useState<MatchSummary | null>(null)
  const [replay, setReplay] = useState<ReplayTape | null>(null)
  const [seed, setSeed] = useState(() => (Math.random() * 1e9) | 0)
  const [enhanceMap, setEnhanceMap] = useState<EnhanceMap>(() => readEnhanceMap())

  useEffect(() => {
    loadGameData()
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '配置读取失败'))
  }, [])

  const setKitPersist = (next: KitIds) => {
    setKit(next)
    writeStoredKit(next)
  }

  const bumpEnhance = (partId: string, delta: number, max: number) => {
    setEnhanceMap((prev) => {
      const cur = prev[partId] ?? 0
      const nextLevel = Math.max(0, Math.min(max, cur + delta))
      const next = { ...prev, [partId]: nextLevel }
      writeEnhanceMap(next)
      return next
    })
  }

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

  const playerEnhance = useMemo(() => kitEnhance(kit, enhanceMap), [kit, enhanceMap])
  const resolved = resolveKit(data.parts, kit, playerEnhance, data.formulas)
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
          enhance={playerEnhance}
        />
      )}
      {screen === 'workshop' && (
        <Workshop
          data={data}
          kit={kit}
          slot={slot}
          enhanceMap={enhanceMap}
          onSlot={setSlot}
          onKit={setKitPersist}
          onEnhance={bumpEnhance}
          onBack={() => setScreen('lobby')}
        />
      )}
      {screen === 'training' && (
        <Training
          data={data}
          kitA={kit}
          kitB={trainB}
          enhanceA={playerEnhance}
          enhanceMap={enhanceMap}
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
          enhance={replay?.p1Enhance ?? playerEnhance}
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
