'use client'

import { useState, useEffect } from 'react'

const DDRAGON_VERSION_URL = 'https://ddragon.leagueoflegends.com/api/versions.json'
const DDRAGON_CHAMPIONS_URL = (v: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${v}/data/pt_BR/champion.json`
const CHAMPION_ICON = (v: string, name: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${v}/img/champion/${name}.png`

interface ChampionData {
  id: string
  name: string
  key: string
}

interface PickBanAction {
  type: 'BAN' | 'PICK'
  team: 'A' | 'B'
  champion: string | null
  order: number
}

interface ChampionPickerProps {
  value: PickBanAction[]
  onChange: (actions: PickBanAction[]) => void
  readonly?: boolean
}

export function ChampionPicker({ value, onChange, readonly = false }: ChampionPickerProps) {
  const [ddVersion, setDdVersion] = useState<string | null>(null)
  const [champions, setChampions] = useState<ChampionData[]>([])
  const [search, setSearch] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const versions = await fetch(DDRAGON_VERSION_URL).then(r => r.json())
        const version = versions[0]
        setDdVersion(version)
        const data = await fetch(DDRAGON_CHAMPIONS_URL(version)).then(r => r.json())
        const list: ChampionData[] = Object.values(data.data as Record<string, any>).map((c: any) => ({
          id: c.id,
          name: c.name,
          key: c.key,
        })).sort((a, b) => a.name.localeCompare(b.name))
        setChampions(list)
      } catch (e) {
        console.error('Failed to load champions:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredChampions = champions.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  function selectChampion(champion: string) {
    if (readonly || selectedSlot === null) return
    const newActions = value.map((a, i) =>
      i === selectedSlot ? { ...a, champion } : a
    )
    onChange(newActions)
    setSelectedSlot(null)
    setSearch('')
  }

  // Ensure we have the standard 5-ban 5-pick phases structure
  const actions = value.length > 0 ? value : [
    // Phase 1 Bans (3 each)
    { type: 'BAN' as const, team: 'A' as const, champion: null, order: 1 },
    { type: 'BAN' as const, team: 'B' as const, champion: null, order: 2 },
    { type: 'BAN' as const, team: 'A' as const, champion: null, order: 3 },
    { type: 'BAN' as const, team: 'B' as const, champion: null, order: 4 },
    { type: 'BAN' as const, team: 'A' as const, champion: null, order: 5 },
    { type: 'BAN' as const, team: 'B' as const, champion: null, order: 6 },
    // Phase 1 Picks
    { type: 'PICK' as const, team: 'A' as const, champion: null, order: 7 },
    { type: 'PICK' as const, team: 'B' as const, champion: null, order: 8 },
    { type: 'PICK' as const, team: 'B' as const, champion: null, order: 9 },
    { type: 'PICK' as const, team: 'A' as const, champion: null, order: 10 },
    { type: 'PICK' as const, team: 'A' as const, champion: null, order: 11 },
    { type: 'PICK' as const, team: 'B' as const, champion: null, order: 12 },
    // Phase 2 Bans
    { type: 'BAN' as const, team: 'B' as const, champion: null, order: 13 },
    { type: 'BAN' as const, team: 'A' as const, champion: null, order: 14 },
    { type: 'BAN' as const, team: 'B' as const, champion: null, order: 15 },
    { type: 'BAN' as const, team: 'A' as const, champion: null, order: 16 },
    // Phase 2 Picks
    { type: 'PICK' as const, team: 'B' as const, champion: null, order: 17 },
    { type: 'PICK' as const, team: 'A' as const, champion: null, order: 18 },
    { type: 'PICK' as const, team: 'A' as const, champion: null, order: 19 },
    { type: 'PICK' as const, team: 'B' as const, champion: null, order: 20 },
  ]

  const bans = actions.filter(a => a.type === 'BAN')
  const picks = actions.filter(a => a.type === 'PICK')
  const picksA = picks.filter(a => a.team === 'A')
  const picksB = picks.filter(a => a.team === 'B')
  const bansA = bans.filter(a => a.team === 'A')
  const bansB = bans.filter(a => a.team === 'B')

  function ChampIcon({ champion, index, isBan = false }: { champion: string | null, index: number, isBan?: boolean }) {
    const isSelected = selectedSlot === index
    return (
      <div
        onClick={() => !readonly && setSelectedSlot(index)}
        className={`relative cursor-pointer rounded overflow-hidden ${
          isBan ? 'w-10 h-10' : 'w-14 h-14'
        } ${
          isSelected ? 'ring-2 ring-[#C89B3C]' : ''
        } bg-[#0A1428] border border-[#1E3A5F] hover:border-[#C89B3C] transition-colors`}
      >
        {champion && ddVersion ? (
          <>
            <img
              src={CHAMPION_ICON(ddVersion, champion)}
              alt={champion}
              className={`w-full h-full object-cover ${
                isBan ? 'grayscale opacity-60' : ''
              }`}
            />
            {isBan && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-0.5 bg-red-500 rotate-45 absolute" />
                <div className="w-8 h-0.5 bg-red-500 -rotate-45 absolute" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
            ?
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bans */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-2 text-center">Bans Time A</p>
          <div className="flex gap-1 justify-center">
            {bansA.map((a, i) => (
              <ChampIcon key={i} champion={a.champion} index={actions.indexOf(a)} isBan />
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2 text-center">Bans Time B</p>
          <div className="flex gap-1 justify-center">
            {bansB.map((a, i) => (
              <ChampIcon key={i} champion={a.champion} index={actions.indexOf(a)} isBan />
            ))}
          </div>
        </div>
      </div>

      {/* Picks */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-[#C89B3C] mb-2 text-center font-bold">Time A</p>
          <div className="flex gap-2 justify-center">
            {picksA.map((a, i) => (
              <ChampIcon key={i} champion={a.champion} index={actions.indexOf(a)} />
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-[#C89B3C] mb-2 text-center font-bold">Time B</p>
          <div className="flex gap-2 justify-center">
            {picksB.map((a, i) => (
              <ChampIcon key={i} champion={a.champion} index={actions.indexOf(a)} />
            ))}
          </div>
        </div>
      </div>

      {/* Champion selector (only when a slot is selected) */}
      {!readonly && selectedSlot !== null && (
        <div className="mt-4 bg-[#0A1428] border border-[#1E3A5F] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              placeholder="Buscar campeão..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-[#16213e] text-white px-3 py-2 rounded-lg text-sm border border-[#1E3A5F] focus:outline-none focus:border-[#C89B3C]"
              autoFocus
            />
            <button
              onClick={() => { setSelectedSlot(null); setSearch('') }}
              className="text-gray-500 hover:text-white px-2"
            >
              ✕
            </button>
          </div>
          {loading ? (
            <p className="text-gray-500 text-sm text-center">Carregando campeões...</p>
          ) : (
            <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
              {filteredChampions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectChampion(c.id)}
                  className="group relative"
                  title={c.name}
                >
                  {ddVersion && (
                    <img
                      src={CHAMPION_ICON(ddVersion, c.id)}
                      alt={c.name}
                      className="w-10 h-10 rounded object-cover hover:ring-2 hover:ring-[#C89B3C] transition-all"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
