import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { computePlayerStats } from '../lib/stats'
import MatchCard from '../components/MatchCard'
import BottomNav from '../components/BottomNav'

export default function PlayerProfile() {
  const { id } = useParams()
  const [player, setPlayer] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [renameError, setRenameError] = useState('')

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    const [playerRes, playersRes, matchesRes] = await Promise.all([
      supabase.from('players').select('*').eq('id', id).single(),
      supabase.from('players').select('*'),
      supabase.from('matches').select('*').eq('is_deleted', false),
    ])

    if (playerRes.data) setPlayer(playerRes.data)
    if (playersRes.data && matchesRes.data) {
      setStats(computePlayerStats(id, matchesRes.data, playersRes.data))
    }
    setLoading(false)
  }

  async function handleRename() {
    const trimmed = editName.trim()
    if (!trimmed) return

    setRenameError('')
    const { error } = await supabase
      .from('players')
      .update({ name: trimmed })
      .eq('id', id)

    if (error) {
      setRenameError(error.message.includes('unique') ? 'Name already taken' : error.message)
      return
    }

    setPlayer({ ...player, name: trimmed })
    setEditing(false)
    setEditName('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading...</p>
      </div>
    )
  }

  if (!player || !stats) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-red-500 text-lg">Player not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <Link to="/players" className="text-teal-600 text-sm font-medium pt-6 mb-2 inline-block">
          &larr; Players
        </Link>

        {editing ? (
          <div className="mb-6">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') { setEditing(false); setRenameError('') }
              }}
              autoFocus
              className="text-3xl font-bold text-slate-900 bg-white border border-gray-300 rounded-lg px-3 py-1 w-full focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            {renameError && <p className="text-red-500 text-sm mt-1">{renameError}</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={handleRename} className="px-4 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700">
                Save
              </button>
              <button onClick={() => { setEditing(false); setRenameError('') }} className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-3xl font-bold text-slate-900">{player.name}</h1>
            <button
              onClick={() => { setEditing(true); setEditName(player.name); setRenameError('') }}
              className="text-gray-300 hover:text-teal-600 transition-colors mt-1"
              title="Rename player"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{stats.totalMatches}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Matches</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-teal-600">
              {stats.winRate !== null ? `${Math.round(stats.winRate * 100)}%` : '–'}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Win Rate</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">
              <span className="text-green-600">{stats.wins}W</span>
              {' '}
              <span className="text-red-500">{stats.losses}L</span>
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Record</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            {stats.currentStreak ? (
              <div className={`text-2xl font-bold ${
                stats.currentStreak.type === 'W' ? 'text-green-600' : 'text-red-500'
              }`}>
                {stats.currentStreak.count}{stats.currentStreak.type}
              </div>
            ) : (
              <div className="text-2xl font-bold text-gray-300">–</div>
            )}
            <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Streak</div>
          </div>
        </div>

        {/* Recent Form */}
        {stats.recentForm.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
              Recent Form
            </h3>
            <div className="flex gap-2">
              {stats.recentForm.map((entry, i) => {
                const match = stats.matches.find((m) => m.id === entry.matchId)
                return (
                  <div key={i} className="relative group">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white cursor-default ${
                        entry.result === 'W' ? 'bg-green-500' : 'bg-red-400'
                      }`}
                    >
                      {entry.result}
                    </div>
                    {match && (
                      <div className="absolute top-full left-0 mt-2 hidden group-hover:block z-20 w-64">
                        <MatchCard match={match} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Head-to-Head */}
        {stats.opponents.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
              Head to Head
            </h3>
            <div className="space-y-3">
              {stats.opponents.map((opp) => (
                <Link
                  key={opp.id}
                  to={`/players/${opp.id}`}
                  className="flex items-center justify-between hover:bg-slate-50 rounded-lg -mx-2 px-2 py-1 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-800">{opp.name}</div>
                    <div className="text-xs text-gray-400">{opp.played} matches</div>
                  </div>
                  <div className="text-sm font-semibold">
                    <span className="text-green-600">{opp.wins}W</span>
                    <span className="text-gray-300 mx-1">–</span>
                    <span className="text-red-500">{opp.losses}L</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Match History */}
        <section>
          <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
            Match History
          </h3>
          {stats.matches.length === 0 ? (
            <p className="text-gray-400 text-sm">No matches yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.matches.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </div>
  )
}
