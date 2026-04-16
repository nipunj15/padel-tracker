import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { computeLeaderboard } from '../lib/stats'
import BottomNav from '../components/BottomNav'

const COLUMNS = [
  { key: 'name', label: 'Player', align: 'left' },
  { key: 'wins', label: 'W', align: 'center' },
  { key: 'losses', label: 'L', align: 'center' },
  { key: 'winPct', label: 'Win%', align: 'center' },
]

export default function Players() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState('winPct')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [playersRes, matchesRes] = await Promise.all([
      supabase.from('players').select('*').order('name'),
      supabase.from('matches').select('*').eq('is_deleted', false),
    ])

    setLeaderboard(computeLeaderboard(playersRes.data || [], matchesRes.data || []))
    setLoading(false)
  }

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const sorted = [...leaderboard].sort((a, b) => {
    let aVal = a[sortKey]
    let bVal = b[sortKey]

    // winPct: null goes to the bottom always
    if (sortKey === 'winPct') {
      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1
    }

    if (sortKey === 'name') {
      const cmp = a.name.localeCompare(b.name)
      return sortDir === 'asc' ? cmp : -cmp
    }

    return sortDir === 'asc' ? aVal - bVal : bVal - aVal
  })

  function SortIcon({ column }) {
    if (sortKey !== column) {
      return (
        <svg className="w-3 h-3 text-gray-300 ml-0.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortDir === 'asc' ? (
      <svg className="w-3 h-3 text-teal-600 ml-0.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-teal-600 ml-0.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

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
        <h1 className="text-2xl font-bold text-slate-900 pt-6 mb-4">Players</h1>

        {sorted.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No players yet.</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`px-4 py-3 text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:text-teal-600 select-none whitespace-nowrap ${
                        col.align === 'center' ? 'text-center w-14' : 'text-left'
                      } ${sortKey === col.key ? 'text-teal-600' : ''}`}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        {col.label}
                        <SortIcon column={col.key} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry) => (
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
      </div>

      <BottomNav />
    </div>
  )
}
