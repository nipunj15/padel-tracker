import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PlayerInput from '../components/PlayerInput'

const EMPTY_PLAYER = { id: null, name: '' }

export default function NewMatch() {
  const navigate = useNavigate()
  const [format, setFormat] = useState('1v1')
  const [team1, setTeam1] = useState([{ ...EMPTY_PLAYER }, { ...EMPTY_PLAYER }])
  const [team2, setTeam2] = useState([{ ...EMPTY_PLAYER }, { ...EMPTY_PLAYER }])
  const [allPlayers, setAllPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('players')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) setAllPlayers(data)
      })
  }, [])

  const is2v2 = format === '2v2'

  // Collect all currently selected player IDs (to exclude from other dropdowns)
  function getSelectedIds() {
    const ids = []
    if (team1[0].id) ids.push(team1[0].id)
    if (is2v2 && team1[1].id) ids.push(team1[1].id)
    if (team2[0].id) ids.push(team2[0].id)
    if (is2v2 && team2[1].id) ids.push(team2[1].id)
    return ids
  }

  function selectedIdsExcept(currentId) {
    return getSelectedIds().filter((id) => id !== currentId)
  }

  function validate() {
    const players = [team1[0]]
    if (is2v2) players.push(team1[1])
    players.push(team2[0])
    if (is2v2) players.push(team2[1])

    if (players.some((p) => !p.name.trim())) return 'All players must be selected'

    const names = players.map((p) => p.name.trim().toLowerCase())
    if (new Set(names).size !== names.length) return 'Each player must be unique'

    return null
  }

  async function getOrCreatePlayer(player) {
    if (player.id) return player.id

    const trimmed = player.name.trim()
    const { data, error } = await supabase
      .from('players')
      .insert({ name: trimmed })
      .select()
      .single()

    if (error) throw new Error(`Failed to create player: ${error.message}`)
    return data.id
  }

  async function handleStart() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')

    try {
      const players = [team1[0]]
      if (is2v2) players.push(team1[1])
      players.push(team2[0])
      if (is2v2) players.push(team2[1])

      const playerIds = await Promise.all(players.map(getOrCreatePlayer))

      const team1Ids = is2v2 ? [playerIds[0], playerIds[1]] : [playerIds[0]]
      const team2Ids = is2v2 ? [playerIds[2], playerIds[3]] : [playerIds[1]]

      const t1Name = is2v2
        ? `${team1[0].name.trim()} / ${team1[1].name.trim()}`
        : team1[0].name.trim()
      const t2Name = is2v2
        ? `${team2[0].name.trim()} / ${team2[1].name.trim()}`
        : team2[0].name.trim()

      const { data, error: insertError } = await supabase
        .from('matches')
        .insert({
          format,
          team1_player_ids: team1Ids,
          team2_player_ids: team2Ids,
          team1_name: t1Name,
          team2_name: t2Name,
          status: 'in_progress',
          sets: [],
          current_set: 1,
          current_point_team1: 0,
          current_point_team2: 0,
          is_tiebreak: false,
          tiebreak_point_team1: 0,
          tiebreak_point_team2: 0,
          point_history: [],
        })
        .select()
        .single()

      if (insertError) throw new Error(insertError.message)
      navigate(`/match/${data.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto">
        <Link to="/" className="text-teal-600 text-sm font-medium mb-6 inline-block">
          &larr; Back
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-6">New Match</h1>

        {/* Format Toggle */}
        <div className="flex bg-gray-200 rounded-lg p-1 mb-8">
          {['1v1', '2v2'].map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-colors ${
                format === f
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Team 1 */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Team 1
          </h2>
          <div className="space-y-3">
            <PlayerInput
              value={team1[0]}
              onChange={(v) => setTeam1([v, team1[1]])}
              placeholder="Select player"
              allPlayers={allPlayers}
              selectedIds={selectedIdsExcept(team1[0].id)}
            />
            {is2v2 && (
              <PlayerInput
                value={team1[1]}
                onChange={(v) => setTeam1([team1[0], v])}
                placeholder="Select partner"
                allPlayers={allPlayers}
                selectedIds={selectedIdsExcept(team1[1].id)}
              />
            )}
          </div>
        </div>

        {/* VS divider */}
        <div className="flex items-center mb-6">
          <div className="flex-1 border-t border-gray-300" />
          <span className="px-4 text-sm font-bold text-gray-400">VS</span>
          <div className="flex-1 border-t border-gray-300" />
        </div>

        {/* Team 2 */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Team 2
          </h2>
          <div className="space-y-3">
            <PlayerInput
              value={team2[0]}
              onChange={(v) => setTeam2([v, team2[1]])}
              placeholder="Select player"
              allPlayers={allPlayers}
              selectedIds={selectedIdsExcept(team2[0].id)}
            />
            {is2v2 && (
              <PlayerInput
                value={team2[1]}
                onChange={(v) => setTeam2([team2[0], v])}
                placeholder="Select partner"
                allPlayers={allPlayers}
                selectedIds={selectedIdsExcept(team2[1].id)}
              />
            )}
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full py-4 bg-teal-600 text-white text-lg font-semibold rounded-xl hover:bg-teal-700 active:bg-teal-800 transition-colors disabled:opacity-50"
        >
          {loading ? 'Starting...' : 'Start Match'}
        </button>
      </div>
    </div>
  )
}
