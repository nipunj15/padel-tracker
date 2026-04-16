import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [players, setPlayers] = useState([])
  const [matches, setMatches] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [editName, setEditName] = useState('')
  const [renameError, setRenameError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [playersRes, matchesRes] = await Promise.all([
      supabase.from('players').select('*').order('name'),
      supabase
        .from('matches')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
    ])

    const allPlayers = playersRes.data || []
    const allMatches = matchesRes.data || []

    setPlayers(allPlayers)
    setMatches(allMatches)

    // Build leaderboard from completed matches only
    const completedMatches = allMatches.filter((m) => m.status === 'completed')
    const stats = {}

    for (const p of allPlayers) {
      stats[p.id] = { id: p.id, name: p.name, wins: 0, losses: 0 }
    }

    for (const m of completedMatches) {
      const winnerIds = m.winner_team === 1 ? m.team1_player_ids : m.team2_player_ids
      const loserIds = m.winner_team === 1 ? m.team2_player_ids : m.team1_player_ids

      for (const pid of winnerIds) {
        if (stats[pid]) stats[pid].wins++
      }
      for (const pid of loserIds) {
        if (stats[pid]) stats[pid].losses++
      }
    }

    const board = Object.values(stats)
      .map((s) => ({
        ...s,
        total: s.wins + s.losses,
        winPct: s.wins + s.losses >= 3 ? s.wins / (s.wins + s.losses) : null,
      }))
      .sort((a, b) => {
        // Players with 3+ matches first, sorted by win%
        if (a.winPct !== null && b.winPct !== null) return b.winPct - a.winPct
        if (a.winPct !== null) return -1
        if (b.winPct !== null) return 1
        return b.total - a.total
      })

    setLeaderboard(board)
    setLoading(false)
  }

  async function handleRename(playerId) {
    const trimmed = editName.trim()
    if (!trimmed) return

    setRenameError('')

    const { error } = await supabase
      .from('players')
      .update({ name: trimmed })
      .eq('id', playerId)

    if (error) {
      setRenameError(error.message.includes('unique') ? 'Name already taken' : error.message)
      return
    }

    setEditingPlayer(null)
    setEditName('')
    loadData()
  }

  // Recent completed matches (last 10)
  const recentMatches = matches
    .filter((m) => m.status === 'completed')
    .slice(0, 10)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center pt-6 mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Padel Tracker</h1>
        </div>

        {/* New Match button */}
        <Link
          to="/match/new"
          className="block w-full py-4 bg-teal-600 text-white text-lg font-semibold rounded-xl text-center hover:bg-teal-700 active:bg-teal-800 transition-colors mb-8"
        >
          New Match
        </Link>

        {/* Leaderboard */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <p className="text-gray-400 text-sm">No players yet. Start a match to begin!</p>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="text-left px-4 py-3">Player</th>
                    <th className="text-center px-2 py-3 w-12">W</th>
                    <th className="text-center px-2 py-3 w-12">L</th>
                    <th className="text-center px-2 py-3 w-16">Win%</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3">
                        {editingPlayer === entry.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename(entry.id)
                                if (e.key === 'Escape') {
                                  setEditingPlayer(null)
                                  setRenameError('')
                                }
                              }}
                              autoFocus
                              className="text-sm border border-gray-300 rounded px-2 py-1 w-24 focus:outline-none focus:ring-1 focus:ring-teal-600"
                            />
                            <button
                              onClick={() => handleRename(entry.id)}
                              className="text-teal-600 text-xs font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingPlayer(null)
                                setRenameError('')
                              }}
                              className="text-gray-400 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">
                              {entry.name}
                            </span>
                            <button
                              onClick={() => {
                                setEditingPlayer(entry.id)
                                setEditName(entry.name)
                                setRenameError('')
                              }}
                              className="text-gray-300 hover:text-teal-600 transition-colors"
                              title="Rename player"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </div>
                        )}
                        {renameError && editingPlayer === entry.id && (
                          <p className="text-red-500 text-xs mt-1">{renameError}</p>
                        )}
                      </td>
                      <td className="text-center px-2 py-3 text-sm text-slate-600">
                        {entry.wins}
                      </td>
                      <td className="text-center px-2 py-3 text-sm text-slate-600">
                        {entry.losses}
                      </td>
                      <td className="text-center px-2 py-3 text-sm font-semibold">
                        {entry.winPct !== null ? (
                          <span className="text-teal-600">
                            {Math.round(entry.winPct * 100)}%
                          </span>
                        ) : (
                          <span className="text-gray-300">–</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent Matches */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">Recent Matches</h2>
          {recentMatches.length === 0 ? (
            <p className="text-gray-400 text-sm">No matches yet.</p>
          ) : (
            <div className="space-y-3">
              {recentMatches.map((m) => (
                <Link
                  key={m.id}
                  to={`/match/${m.id}/summary`}
                  className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:border-teal-200 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span
                        className={`text-sm font-semibold ${
                          m.winner_team === 1 ? 'text-teal-600' : 'text-slate-700'
                        }`}
                      >
                        {m.team1_name}
                      </span>
                      <span className="text-gray-400 text-sm mx-2">vs</span>
                      <span
                        className={`text-sm font-semibold ${
                          m.winner_team === 2 ? 'text-teal-600' : 'text-slate-700'
                        }`}
                      >
                        {m.team2_name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(m.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {m.sets.map((set, i) => (
                      <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                        {set.team1_games}–{set.team2_games}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
