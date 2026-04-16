import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { computeLeaderboard } from '../lib/stats'
import MatchCard from '../components/MatchCard'
import BottomNav from '../components/BottomNav'

export default function Home() {
  const [leaderboard, setLeaderboard] = useState([])
  const [recentMatches, setRecentMatches] = useState([])
  const [loading, setLoading] = useState(true)

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

    const players = playersRes.data || []
    const matches = matchesRes.data || []

    setLeaderboard(computeLeaderboard(players, matches))
    setRecentMatches(matches.filter((m) => m.status === 'completed').slice(0, 3))
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading...</p>
      </div>
    )
  }

  const top5 = leaderboard.slice(0, 5)

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24">
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

        {/* Leaderboard Preview */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-slate-900">Leaderboard</h2>
            <Link to="/players" className="text-sm text-teal-600 font-medium">
              See all
            </Link>
          </div>
          {top5.length === 0 ? (
            <p className="text-gray-400 text-sm">No players yet. Start a match!</p>
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
                  {top5.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3">
                        <Link to={`/players/${entry.id}`} className="text-sm font-medium text-slate-800 hover:text-teal-600">
                          {entry.name}
                        </Link>
                      </td>
                      <td className="text-center px-2 py-3 text-sm text-slate-600">{entry.wins}</td>
                      <td className="text-center px-2 py-3 text-sm text-slate-600">{entry.losses}</td>
                      <td className="text-center px-2 py-3 text-sm font-semibold">
                        {entry.winPct !== null ? (
                          <span className="text-teal-600">{Math.round(entry.winPct * 100)}%</span>
                        ) : (
                          <span className="text-gray-300">&ndash;</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent Matches Preview */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-slate-900">Recent Matches</h2>
            <Link to="/matches" className="text-sm text-teal-600 font-medium">
              See all
            </Link>
          </div>
          {recentMatches.length === 0 ? (
            <p className="text-gray-400 text-sm">No matches yet.</p>
          ) : (
            <div className="space-y-3">
              {recentMatches.map((m) => (
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
