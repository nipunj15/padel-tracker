/**
 * Shared stats computation — used by Home, Players, and PlayerProfile pages.
 */

/**
 * Computes leaderboard from players and matches.
 * Only counts completed, non-deleted matches.
 */
export function computeLeaderboard(players, matches) {
  const completedMatches = matches.filter(
    (m) => m.status === 'completed' && !m.is_deleted
  )

  const stats = {}
  for (const p of players) {
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

  return Object.values(stats)
    .map((s) => ({
      ...s,
      total: s.wins + s.losses,
      winPct: s.wins + s.losses >= 3 ? s.wins / (s.wins + s.losses) : null,
    }))
    .sort((a, b) => {
      if (a.winPct !== null && b.winPct !== null) return b.winPct - a.winPct
      if (a.winPct !== null) return -1
      if (b.winPct !== null) return 1
      return b.total - a.total
    })
}

/**
 * Returns all matches involving a specific player (completed, non-deleted).
 */
export function getPlayerMatches(playerId, matches) {
  return matches.filter(
    (m) =>
      !m.is_deleted &&
      (m.team1_player_ids.includes(playerId) || m.team2_player_ids.includes(playerId))
  )
}

/**
 * Computes full stats for a single player.
 */
export function computePlayerStats(playerId, matches, players) {
  const playerMatches = getPlayerMatches(playerId, matches)
  const completedMatches = playerMatches
    .filter((m) => m.status === 'completed')
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))

  let wins = 0
  let losses = 0
  const opponentMap = {} // opponentId -> { id, name, played, wins, losses }

  for (const m of completedMatches) {
    const isTeam1 = m.team1_player_ids.includes(playerId)
    const playerWon =
      (isTeam1 && m.winner_team === 1) || (!isTeam1 && m.winner_team === 2)

    if (playerWon) wins++
    else losses++

    // Track opponent stats
    const opponentIds = isTeam1 ? m.team2_player_ids : m.team1_player_ids
    for (const oppId of opponentIds) {
      if (!opponentMap[oppId]) {
        const oppPlayer = players.find((p) => p.id === oppId)
        opponentMap[oppId] = {
          id: oppId,
          name: oppPlayer?.name || 'Unknown',
          played: 0,
          wins: 0,
          losses: 0,
        }
      }
      opponentMap[oppId].played++
      if (playerWon) opponentMap[oppId].wins++
      else opponentMap[oppId].losses++
    }
  }

  const total = wins + losses

  // Current streak
  let streakType = null
  let streakCount = 0
  for (const m of completedMatches) {
    const isTeam1 = m.team1_player_ids.includes(playerId)
    const won = (isTeam1 && m.winner_team === 1) || (!isTeam1 && m.winner_team === 2)
    const type = won ? 'W' : 'L'

    if (streakType === null) {
      streakType = type
      streakCount = 1
    } else if (type === streakType) {
      streakCount++
    } else {
      break
    }
  }

  // Recent form (last 5) with match details for tooltips
  const recentForm = completedMatches.slice(0, 5).map((m) => {
    const isTeam1 = m.team1_player_ids.includes(playerId)
    const won = (isTeam1 && m.winner_team === 1) || (!isTeam1 && m.winner_team === 2)
    const opponent = isTeam1 ? m.team2_name : m.team1_name
    const score = m.sets.map((s) => `${s.team1_games}-${s.team2_games}`).join(', ')
    return {
      result: won ? 'W' : 'L',
      opponent,
      score,
      date: m.completed_at,
      matchId: m.id,
    }
  })

  // Opponents sorted by most played
  const opponents = Object.values(opponentMap).sort((a, b) => b.played - a.played)

  return {
    totalMatches: total,
    wins,
    losses,
    winRate: total >= 3 ? wins / total : null,
    currentStreak: streakType ? { type: streakType, count: streakCount } : null,
    recentForm,
    opponents,
    matches: playerMatches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  }
}
