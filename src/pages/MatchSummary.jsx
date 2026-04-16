import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

function formatDuration(startedAt, completedAt) {
  if (!startedAt || !completedAt) return null
  const ms = new Date(completedAt) - new Date(startedAt)
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function computeMatchStats(match) {
  let t1Sets = 0, t2Sets = 0, t1Games = 0, t2Games = 0
  for (const set of match.sets) {
    t1Games += set.team1_games
    t2Games += set.team2_games
    if (set.team1_games > set.team2_games) t1Sets++
    else if (set.team2_games > set.team1_games) t2Sets++
  }
  return { t1Sets, t2Sets, t1Games, t2Games }
}

function PlayerLink({ playerIds, teamName, index }) {
  const names = teamName.split(' / ')
  const name = names[index] || names[0]
  const pid = playerIds[index]
  if (pid) {
    return <Link to={`/players/${pid}`} className="hover:underline">{name}</Link>
  }
  return <span>{name}</span>
}

/**
 * Builds a running game score for each game in a set from game_history.
 * Returns array of { game, winner_team, t1Running, t2Running, is_tiebreak, tiebreak_score }
 */
function getSetGames(gameHistory, setNumber) {
  const games = (gameHistory || []).filter((g) => g.set === setNumber)
  let t1 = 0, t2 = 0
  return games.map((g) => {
    if (g.winner_team === 1) t1++
    else t2++
    return {
      ...g,
      t1Running: t1,
      t2Running: t2,
    }
  })
}

function SetRow({ match, set, setIndex, gameHistory }) {
  const [expanded, setExpanded] = useState(false)
  const setNumber = setIndex + 1
  const t1Won = set.team1_games > set.team2_games
  const t2Won = set.team2_games > set.team1_games
  const games = getSetGames(gameHistory, setNumber)
  const hasGames = games.length > 0

  return (
    <>
      <tr
        className={`border-b border-gray-50 ${hasGames ? 'cursor-pointer hover:bg-slate-50' : ''}`}
        onClick={() => hasGames && setExpanded(!expanded)}
      >
        <td className="py-3 px-4 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            {hasGames && (
              <svg
                className={`w-3 h-3 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            Set {setNumber}
          </span>
        </td>
        <td className={`py-3 px-4 text-center text-lg font-bold ${t1Won ? 'text-teal-600' : 'text-slate-400'}`}>
          {set.team1_games}
        </td>
        <td className={`py-3 px-4 text-center text-lg font-bold ${t2Won ? 'text-teal-600' : 'text-slate-400'}`}>
          {set.team2_games}
        </td>
      </tr>

      {expanded && hasGames && (
        <tr>
          <td colSpan={3} className="px-0 py-0">
            <div className="bg-slate-50 border-y border-gray-100">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] text-gray-400 uppercase tracking-wider">
                    <th className="py-2 px-4 text-left font-medium">Game</th>
                    <th className="py-2 px-4 text-center font-medium">Score</th>
                    <th className="py-2 px-4 text-center font-medium">Won by</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((g, i) => {
                    const wonByTeam1 = g.winner_team === 1
                    const wonByName = wonByTeam1
                      ? match.team1_name.split(' / ')[0]
                      : match.team2_name.split(' / ')[0]
                    return (
                      <tr key={i} className="border-t border-gray-100/50">
                        <td className="py-2 px-4 text-xs text-gray-500">
                          {g.is_tiebreak ? 'TB' : `Game ${g.game}`}
                        </td>
                        <td className="py-2 px-4 text-center text-xs font-mono font-semibold text-slate-700">
                          {g.is_tiebreak ? (
                            <span>
                              {g.t1Running}–{g.t2Running}
                              <span className="text-gray-400 ml-1">({g.tiebreak_score})</span>
                            </span>
                          ) : (
                            <span>{g.t1Running}–{g.t2Running}</span>
                          )}
                        </td>
                        <td className="py-2 px-4 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            wonByTeam1
                              ? 'bg-teal-100 text-teal-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {wonByName}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function MatchSummary() {
  const { id } = useParams()
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) setMatch(data)
        setLoading(false)
      })
  }, [id])

  function handleShare() {
    const url = `${window.location.origin}/match/${id}/summary`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

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

  const isAbandoned = match.status === 'abandoned'
  const duration = formatDuration(match.started_at, match.completed_at)
  const mstats = computeMatchStats(match)
  const is2v2 = match.format === '2v2'
  const t1Won = match.winner_team === 1
  const t2Won = match.winner_team === 2
  const hasGameHistory = match.game_history && match.game_history.length > 0

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24">
      <div className="max-w-md mx-auto pt-4">
        <div className="flex justify-between items-center mb-6">
          <Link to="/matches" className="text-teal-600 text-sm font-medium">
            &larr; Matches
          </Link>
          <button
            onClick={handleShare}
            className="text-sm font-medium text-teal-600 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>

        {isAbandoned && (
          <div className="bg-red-100 text-red-700 text-sm font-medium px-3 py-1 rounded-full inline-block mb-4">
            Abandoned
          </div>
        )}

        {/* Scoreboard header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <div className="flex items-center justify-between">
            <div className={`flex-1 text-center ${t1Won ? '' : 'opacity-60'}`}>
              <div className={`text-lg font-bold ${t1Won ? 'text-teal-600' : 'text-slate-800'}`}>
                {is2v2 ? (
                  <>
                    <div><PlayerLink playerIds={match.team1_player_ids} teamName={match.team1_name} index={0} /></div>
                    <div><PlayerLink playerIds={match.team1_player_ids} teamName={match.team1_name} index={1} /></div>
                  </>
                ) : (
                  <PlayerLink playerIds={match.team1_player_ids} teamName={match.team1_name} index={0} />
                )}
              </div>
              {t1Won && (
                <div className="mt-1">
                  <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold uppercase">Winner</span>
                </div>
              )}
            </div>

            <div className="px-4">
              <div className="flex items-center gap-2">
                <span className={`text-4xl font-black ${t1Won ? 'text-teal-600' : 'text-slate-400'}`}>{mstats.t1Sets}</span>
                <span className="text-2xl text-slate-300 font-light">:</span>
                <span className={`text-4xl font-black ${t2Won ? 'text-teal-600' : 'text-slate-400'}`}>{mstats.t2Sets}</span>
              </div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider text-center mt-1">Sets</div>
            </div>

            <div className={`flex-1 text-center ${t2Won ? '' : 'opacity-60'}`}>
              <div className={`text-lg font-bold ${t2Won ? 'text-teal-600' : 'text-slate-800'}`}>
                {is2v2 ? (
                  <>
                    <div><PlayerLink playerIds={match.team2_player_ids} teamName={match.team2_name} index={0} /></div>
                    <div><PlayerLink playerIds={match.team2_player_ids} teamName={match.team2_name} index={1} /></div>
                  </>
                ) : (
                  <PlayerLink playerIds={match.team2_player_ids} teamName={match.team2_name} index={0} />
                )}
              </div>
              {t2Won && (
                <div className="mt-1">
                  <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold uppercase">Winner</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Set-by-set breakdown with collapsible game details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          {hasGameHistory && (
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] text-gray-400">Tap a set to see game-by-game details</p>
            </div>
          )}
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-4 text-left font-medium">Set</th>
                <th className="py-3 px-4 text-center font-medium">{match.team1_name.split(' / ')[0]}</th>
                <th className="py-3 px-4 text-center font-medium">{match.team2_name.split(' / ')[0]}</th>
              </tr>
            </thead>
            <tbody>
              {match.sets.map((set, i) => (
                <SetRow
                  key={i}
                  match={match}
                  set={set}
                  setIndex={i}
                  gameHistory={match.game_history}
                />
              ))}
              <tr className="bg-slate-50">
                <td className="py-3 px-4 text-sm font-semibold text-gray-600">Total Games</td>
                <td className={`py-3 px-4 text-center text-lg font-bold ${
                  mstats.t1Games > mstats.t2Games ? 'text-teal-600' : 'text-slate-500'
                }`}>{mstats.t1Games}</td>
                <td className={`py-3 px-4 text-center text-lg font-bold ${
                  mstats.t2Games > mstats.t1Games ? 'text-teal-600' : 'text-slate-500'
                }`}>{mstats.t2Games}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Match details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <div className="text-center px-2">
              <div className="text-sm font-semibold text-slate-800">{match.format.toUpperCase()}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Format</div>
            </div>
            <div className="text-center px-2">
              <div className="text-sm font-semibold text-slate-800">{duration || '–'}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Duration</div>
            </div>
            <div className="text-center px-2">
              <div className="text-sm font-semibold text-slate-800">{match.sets.length}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Sets Played</div>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-400">
          {new Date(match.created_at).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
