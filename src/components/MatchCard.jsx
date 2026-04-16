import { Link } from 'react-router-dom'

export default function MatchCard({ match }) {
  const isCompleted = match.status === 'completed'
  const isInProgress = match.status === 'in_progress'
  const isAbandoned = match.status === 'abandoned'

  return (
    <Link
      to={isInProgress ? `/match/${match.id}` : `/match/${match.id}/summary`}
      className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:border-teal-200 transition-colors"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <span
            className={`text-sm font-semibold ${
              match.winner_team === 1 ? 'text-teal-600' : 'text-slate-700'
            }`}
          >
            {match.team1_name}
          </span>
          <span className="text-gray-400 text-sm mx-2">vs</span>
          <span
            className={`text-sm font-semibold ${
              match.winner_team === 2 ? 'text-teal-600' : 'text-slate-700'
            }`}
          >
            {match.team2_name}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          {isInProgress && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium uppercase">
              Live
            </span>
          )}
          {isAbandoned && (
            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium uppercase">
              Abandoned
            </span>
          )}
          <span className="text-xs text-gray-400">
            {new Date(match.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
      {match.sets && match.sets.length > 0 && (
        <div className="flex gap-2">
          {match.sets.map((set, i) => (
            <span
              key={i}
              className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium"
            >
              {set.team1_games}–{set.team2_games}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}
