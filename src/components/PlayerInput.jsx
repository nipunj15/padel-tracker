import { useState, useEffect, useRef } from 'react'

export default function PlayerInput({ value, onChange, placeholder, allPlayers, selectedIds }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [search, setSearch] = useState('')
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
        setIsCreating(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreating])

  // Filter out already-selected players and apply search
  const availablePlayers = allPlayers.filter((p) => {
    if (selectedIds.includes(p.id)) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function handleSelect(player) {
    onChange({ id: player.id, name: player.name })
    setIsOpen(false)
    setSearch('')
  }

  function handleCreateNew() {
    const trimmed = newName.trim()
    if (!trimmed) return

    // Check for duplicates (case-insensitive)
    const existing = allPlayers.find(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (existing) {
      onChange({ id: existing.id, name: existing.name })
    } else {
      onChange({ id: null, name: trimmed })
    }
    setIsCreating(false)
    setNewName('')
    setIsOpen(false)
    setSearch('')
  }

  const selectedPlayer = value.name

  return (
    <div ref={wrapperRef} className="relative">
      {/* Selected state / trigger button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen)
          setIsCreating(false)
          setSearch('')
        }}
        className={`w-full px-4 py-3 text-lg border rounded-lg text-left flex items-center justify-between transition-colors ${
          selectedPlayer
            ? 'border-teal-300 bg-teal-50'
            : 'border-gray-300 bg-white'
        } focus:outline-none focus:ring-2 focus:ring-teal-600`}
      >
        <span className={selectedPlayer ? 'text-slate-900' : 'text-gray-400'}>
          {selectedPlayer || placeholder}
        </span>
        {selectedPlayer ? (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onChange({ id: null, name: '' })
            }}
            className="text-gray-400 hover:text-red-500 ml-2 text-sm"
          >
            &times;
          </span>
        ) : (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search existing players */}
          {allPlayers.length > 0 && !isCreating && (
            <>
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search players..."
                  autoFocus
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
              <ul className="max-h-48 overflow-y-auto">
                {availablePlayers.map((p) => (
                  <li
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    className="px-4 py-3 cursor-pointer hover:bg-teal-50 active:bg-teal-100 text-sm font-medium text-slate-800 border-b border-gray-50 last:border-0"
                  >
                    {p.name}
                  </li>
                ))}
                {availablePlayers.length === 0 && (
                  <li className="px-4 py-3 text-sm text-gray-400">
                    {search ? 'No matching players' : 'All players selected'}
                  </li>
                )}
              </ul>
            </>
          )}

          {/* Create new player */}
          {isCreating ? (
            <div className="p-3 border-t border-gray-100">
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNew()
                  if (e.key === 'Escape') {
                    setIsCreating(false)
                    setNewName('')
                  }
                }}
                placeholder="Enter new player name"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 mb-2"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateNew}
                  disabled={!newName.trim()}
                  className="flex-1 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-40"
                >
                  Add Player
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false)
                    setNewName('')
                  }}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="w-full px-4 py-3 text-sm font-medium text-teal-600 hover:bg-teal-50 active:bg-teal-100 border-t border-gray-100 text-left flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add new player
            </button>
          )}
        </div>
      )}
    </div>
  )
}
