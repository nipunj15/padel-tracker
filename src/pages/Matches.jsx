import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import MatchCard from '../components/MatchCard'
import BottomNav from '../components/BottomNav'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'in_progress', label: 'Live' },
  { key: 'abandoned', label: 'Abandoned' },
]

const PAGE_SIZE = 20

export default function Matches() {
  const [matches, setMatches] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    supabase
      .from('matches')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMatches(data || [])
        setLoading(false)
      })
  }, [])

  const filtered =
    filter === 'all'
      ? matches
      : matches.filter((m) => m.status === filter)

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 pt-6 mb-4">Matches</h1>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key)
                setVisibleCount(PAGE_SIZE)
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                filter === f.key
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Match list */}
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No matches found.</p>
        ) : (
          <div className="space-y-3">
            {visible.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}

        {hasMore && (
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="w-full mt-4 py-3 text-sm font-medium text-teal-600 bg-white rounded-xl border border-gray-200 hover:border-teal-300"
          >
            Load more
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
