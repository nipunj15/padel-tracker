import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { scorePoint, undoPoint, formatPointDisplay, getCurrentSetScore } from '../lib/scoring'

export default function LiveMatch() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingPoint, setPendingPoint] = useState(null) // { team, newState }
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const undoTimerRef = useRef(null)

  // Fetch match from Supabase
  const fetchMatch = useCallback(async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      setError('Match not found')
      setLoading(false)
      return
    }
    setMatch(data)
    setLoading(false)

    if (data.status === 'completed') {
      navigate(`/match/${id}/summary`, { replace: true })
    }
  }, [id, navigate])

  useEffect(() => {
    fetchMatch()
  }, [fetchMatch])

  // Persist match state to Supabase
  async function persistMatch(state) {
    const { error } = await supabase
      .from('matches')
      .update({
        sets: state.sets,
        current_set: state.current_set,
        current_point_team1: state.current_point_team1,
        current_point_team2: state.current_point_team2,
        is_tiebreak: state.is_tiebreak,
        tiebreak_point_team1: state.tiebreak_point_team1,
        tiebreak_point_team2: state.tiebreak_point_team2,
        point_history: state.point_history,
        game_history: state.game_history || [],
        status: state.status,
        winner_team: state.winner_team,
        started_at: state.started_at,
        completed_at: state.completed_at,
      })
      .eq('id', id)

    if (error) console.error('Failed to persist:', error)
  }

  function handleScore(team) {
    // If there's a pending point, commit it first and use its state as the base
    let baseState = match
    if (pendingPoint) {
      commitPendingPoint(pendingPoint.newState)
      baseState = pendingPoint.newState
    }

    const newState = scorePoint(baseState, team)
    setPendingPoint({ team, newState })

    // Clear any existing timer
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)

    // 2-second grace period
    undoTimerRef.current = setTimeout(() => {
      commitPendingPoint(newState)
    }, 2000)
  }

  function commitPendingPoint(state) {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setPendingPoint(null)
    setMatch(state)
    persistMatch(state)

    if (state.status === 'completed') {
      navigate(`/match/${id}/summary`)
    }
  }

  function handleGraceUndo() {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setPendingPoint(null)
    // Match stays as it was — the point was never committed
  }

  function handleUndo() {
    if (pendingPoint) {
      handleGraceUndo()
      return
    }
    const newState = undoPoint(match)
    setMatch(newState)
    persistMatch(newState)
  }

  async function handleAbandon() {
    const newState = { ...match, status: 'abandoned' }
    setMatch(newState)
    await persistMatch(newState)
    navigate('/')
  }

  function handleShare() {
    const url = `${window.location.origin}/match/${id}/summary`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading match...</p>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-red-500 text-lg">{error || 'Match not found'}</p>
      </div>
    )
  }

  // Use pending state for display if a point is in grace period
  const displayMatch = pendingPoint ? pendingPoint.newState : match
  const pointDisplay = formatPointDisplay(displayMatch)
  const gameScore = getCurrentSetScore(displayMatch)

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col no-select">
      {/* Set scores */}
      <div className="bg-slate-800 px-4 py-3">
        <div className="flex justify-center gap-3">
          {/* Completed sets */}
          {displayMatch.sets
            .filter((_, i) => i < displayMatch.current_set - 1)
            .map((set, i) => (
              <div
                key={i}
                className="bg-slate-700 rounded-lg px-3 py-1.5 text-center min-w-[60px]"
              >
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Set {i + 1}
                </div>
                <div className="text-white font-bold text-lg">
                  {set.team1_games}–{set.team2_games}
                </div>
              </div>
            ))}
          {/* Current set — always shown as highlighted */}
          {displayMatch.status === 'in_progress' && (
            <div className="bg-teal-800 rounded-lg px-3 py-1.5 text-center min-w-[60px] ring-2 ring-teal-500">
              <div className="text-[10px] text-teal-300 uppercase tracking-wider">
                Set {displayMatch.current_set}
              </div>
              <div className="text-white font-bold text-lg">
                {gameScore.team1}–{gameScore.team2}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Point display */}
      <div className="bg-slate-800 border-t border-slate-700 px-4 py-4">
        <div className="flex justify-center items-center gap-8">
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1 truncate max-w-[120px]">
              {displayMatch.team1_name}
            </div>
            <div className={`text-4xl font-bold ${
              pointDisplay.team1 === 'AD' ? 'text-teal-400' : 'text-white'
            }`}>
              {pointDisplay.team1}
            </div>
          </div>
          <div className="text-slate-500 text-xl font-light">–</div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1 truncate max-w-[120px]">
              {displayMatch.team2_name}
            </div>
            <div className={`text-4xl font-bold ${
              pointDisplay.team2 === 'AD' ? 'text-teal-400' : 'text-white'
            }`}>
              {pointDisplay.team2}
            </div>
          </div>
        </div>
        {pointDisplay.deuce && (
          <div className="text-center mt-2 text-teal-400 text-sm font-semibold uppercase tracking-wider">
            Deuce
          </div>
        )}
        {displayMatch.is_tiebreak && (
          <div className="text-center mt-2 text-amber-400 text-sm font-semibold uppercase tracking-wider">
            Tiebreak
          </div>
        )}
      </div>

      {/* Score buttons — dominant UI element */}
      <div className="flex-1 flex flex-col gap-1 p-1 min-h-[50vh]">
        <button
          onClick={() => handleScore(1)}
          className="flex-1 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-2xl flex items-center justify-center transition-colors"
        >
          <div className="text-center">
            <div className="text-white/80 text-sm font-medium mb-1">
              {displayMatch.team1_name}
            </div>
            <div className="text-white text-2xl font-bold">+ Point</div>
          </div>
        </button>
        <button
          onClick={() => handleScore(2)}
          className="flex-1 bg-slate-600 hover:bg-slate-700 active:bg-slate-800 rounded-2xl flex items-center justify-center transition-colors"
        >
          <div className="text-center">
            <div className="text-white/80 text-sm font-medium mb-1">
              {displayMatch.team2_name}
            </div>
            <div className="text-white text-2xl font-bold">+ Point</div>
          </div>
        </button>
      </div>

      {/* Undo grace period toast */}
      {pendingPoint && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-700 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-3 z-50">
          <span className="text-sm">
            Point for {pendingPoint.team === 1 ? displayMatch.team1_name : displayMatch.team2_name}
          </span>
          <button
            onClick={handleGraceUndo}
            className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full"
          >
            Undo
          </button>
        </div>
      )}

      {/* Bottom actions */}
      <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 flex justify-between items-center">
        <button
          onClick={handleUndo}
          disabled={!match.point_history?.length && !pendingPoint}
          className="text-slate-400 hover:text-white text-sm font-medium disabled:opacity-30 disabled:hover:text-slate-400 px-3 py-2"
        >
          Undo
        </button>

        <button
          onClick={handleShare}
          className="text-slate-400 hover:text-white text-sm font-medium px-3 py-2"
        >
          {copied ? 'Copied!' : 'Share'}
        </button>

        <button
          onClick={() => setShowAbandonConfirm(true)}
          className="text-red-400 hover:text-red-300 text-sm font-medium px-3 py-2"
        >
          Abandon
        </button>
      </div>

      {/* Abandon confirmation modal */}
      {showAbandonConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white text-lg font-bold mb-2">Abandon Match?</h3>
            <p className="text-slate-400 text-sm mb-6">
              This match will be marked as abandoned and won't count toward the leaderboard.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAbandonConfirm(false)}
                className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAbandon}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
              >
                Abandon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
