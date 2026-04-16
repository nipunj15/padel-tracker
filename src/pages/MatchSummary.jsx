import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function formatDuration(startedAt, completedAt) {
  if (!startedAt || !completedAt) return null
  const ms = new Date(completedAt) - new Date(startedAt)
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default function MatchSummary() {
  const { id } = useParams()
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (data) setMatch(data)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading...</p>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-red-500 text-lg">Match not found</p>
      </div>
    )
  }

  const isCompleted = match.status === 'completed'
  const isAbandoned = match.status === 'abandoned'
  const duration = formatDuration(match.started_at, match.completed_at)

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto pt-8">
        <Link to="/" className="text-teal-600 text-sm font-medium mb-8 inline-block">
          &larr; Home
        </Link>

        {/* Status badge */}
        {isAbandoned && (
          <div className="bg-red-100 text-red-700 text-sm font-medium px-3 py-1 rounded-full inline-block mb-4">
            Abandoned
          </div>
        )}

        {/* Teams */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2
              className={`text-2xl font-bold ${
                match.winner_team === 1 ? 'text-teal-600' : 'text-slate-900'
              }`}
            >
              {match.team1_name}
              {match.winner_team === 1 && (
                <span className="ml-2 text-sm bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full align-middle">
                  Winner
                </span>
              )}
            </h2>
          </div>
          <div className="text-sm text-gray-400 font-medium my-2 uppercase tracking-wider">vs</div>
          <div className="flex items-center justify-between">
            <h2
              className={`text-2xl font-bold ${
                match.winner_team === 2 ? 'text-teal-600' : 'text-slate-900'
              }`}
            >
              {match.team2_name}
              {match.winner_team === 2 && (
                <span className="ml-2 text-sm bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full align-middle">
                  Winner
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Set scores */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Set Scores
          </h3>
          <div className="flex justify-center gap-4">
            {match.sets.map((set, i) => {
              const t1Won = set.team1_games > set.team2_games
              const t2Won = set.team2_games > set.team1_games
              return (
                <div
                  key={i}
                  className="bg-slate-50 rounded-xl px-5 py-3 text-center min-w-[70px]"
                >
                  <div className="text-xs text-gray-400 mb-1">Set {i + 1}</div>
                  <div className="flex items-center justify-center gap-1">
                    <span
                      className={`text-2xl font-bold ${
                        t1Won ? 'text-teal-600' : 'text-slate-400'
                      }`}
                    >
                      {set.team1_games}
                    </span>
                    <span className="text-slate-300 text-lg">–</span>
                    <span
                      className={`text-2xl font-bold ${
                        t2Won ? 'text-teal-600' : 'text-slate-400'
                      }`}
                    >
                      {set.team2_games}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Duration */}
        {duration && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 text-center">
            <span className="text-sm text-gray-500">Duration: </span>
            <span className="text-sm font-semibold text-slate-800">{duration}</span>
          </div>
        )}

        {/* Date */}
        <div className="text-center text-sm text-gray-400">
          {new Date(match.created_at).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>
    </div>
  )
}
