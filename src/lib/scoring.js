/**
 * Padel scoring engine — pure functions, no side effects.
 *
 * Point values: 0=0, 1=15, 2=30, 3=40, 4=Advantage
 * Tiebreak uses raw point counts instead.
 */

const POINT_LABELS = ['0', '15', '30', '40']

export function formatPoint(value) {
  return POINT_LABELS[value] ?? value.toString()
}

export function formatPointDisplay(match) {
  if (match.is_tiebreak) {
    return {
      team1: match.tiebreak_point_team1.toString(),
      team2: match.tiebreak_point_team2.toString(),
    }
  }

  const p1 = match.current_point_team1
  const p2 = match.current_point_team2

  if (p1 >= 3 && p2 >= 3) {
    if (p1 === p2) return { team1: '40', team2: '40', deuce: true }
    if (p1 > p2) return { team1: 'AD', team2: '40' }
    return { team1: '40', team2: 'AD' }
  }

  return {
    team1: formatPoint(p1),
    team2: formatPoint(p2),
  }
}

/**
 * Creates a snapshot of the current match state for undo history.
 */
function createSnapshot(match) {
  return {
    sets: JSON.parse(JSON.stringify(match.sets)),
    current_set: match.current_set,
    current_point_team1: match.current_point_team1,
    current_point_team2: match.current_point_team2,
    is_tiebreak: match.is_tiebreak,
    tiebreak_point_team1: match.tiebreak_point_team1,
    tiebreak_point_team2: match.tiebreak_point_team2,
    status: match.status,
    winner_team: match.winner_team,
  }
}

/**
 * Main scoring function. Returns a new match state after awarding a point to the given team.
 * Does NOT mutate the input.
 *
 * @param {object} match - current match state
 * @param {1|2} team - team that scored (1 or 2)
 * @returns {object} new match state
 */
export function scorePoint(match, team) {
  // Don't score on completed/abandoned matches
  if (match.status !== 'in_progress') return match

  const next = {
    ...match,
    sets: JSON.parse(JSON.stringify(match.sets)),
    point_history: [
      ...match.point_history,
      createSnapshot(match),
    ],
  }

  // Set started_at on first point
  if (!next.started_at) {
    next.started_at = new Date().toISOString()
  }

  if (next.is_tiebreak) {
    return scoreTiebreakPoint(next, team)
  }
  return scoreStandardPoint(next, team)
}

function scoreStandardPoint(match, team) {
  const myKey = team === 1 ? 'current_point_team1' : 'current_point_team2'
  const oppKey = team === 1 ? 'current_point_team2' : 'current_point_team1'

  const myPoints = match[myKey]
  const oppPoints = match[oppKey]

  // Both at 40+ (deuce territory)
  if (myPoints >= 3 && oppPoints >= 3) {
    if (myPoints === 4) {
      // Had advantage, wins the game
      return winGame(match, team)
    }
    if (oppPoints === 4) {
      // Opponent had advantage, back to deuce
      match[myKey] = 3
      match[oppKey] = 3
      return match
    }
    // Both at 40 (deuce), scorer gets advantage
    match[myKey] = 4
    return match
  }

  // At 40 (not deuce), wins the game
  if (myPoints === 3) {
    return winGame(match, team)
  }

  // Normal point progression: 0->1, 1->2, 2->3
  match[myKey] = myPoints + 1
  return match
}

function scoreTiebreakPoint(match, team) {
  const myKey = team === 1 ? 'tiebreak_point_team1' : 'tiebreak_point_team2'
  const oppKey = team === 1 ? 'tiebreak_point_team2' : 'tiebreak_point_team1'

  match[myKey] += 1

  const myPoints = match[myKey]
  const oppPoints = match[oppKey]

  // First to 7, win by 2
  if (myPoints >= 7 && myPoints - oppPoints >= 2) {
    return winTiebreak(match, team)
  }

  return match
}

function winTiebreak(match, team) {
  // The tiebreak winner wins the set 7-6
  const setIndex = match.current_set - 1

  // Ensure the set entry exists
  if (!match.sets[setIndex]) {
    match.sets[setIndex] = { team1_games: 6, team2_games: 6 }
  }

  if (team === 1) {
    match.sets[setIndex].team1_games = 7
  } else {
    match.sets[setIndex].team2_games = 7
  }

  // Reset tiebreak state
  match.is_tiebreak = false
  match.tiebreak_point_team1 = 0
  match.tiebreak_point_team2 = 0

  return winSet(match, team)
}

function winGame(match, team) {
  const setIndex = match.current_set - 1

  // Ensure the set entry exists
  if (!match.sets[setIndex]) {
    match.sets[setIndex] = { team1_games: 0, team2_games: 0 }
  }

  const gameKey = team === 1 ? 'team1_games' : 'team2_games'
  match.sets[setIndex][gameKey] += 1

  // Reset point counters
  match.current_point_team1 = 0
  match.current_point_team2 = 0

  const t1Games = match.sets[setIndex].team1_games
  const t2Games = match.sets[setIndex].team2_games
  const myGames = team === 1 ? t1Games : t2Games
  const oppGames = team === 1 ? t2Games : t1Games

  // Check if this triggers a tiebreak
  if (t1Games === 6 && t2Games === 6) {
    match.is_tiebreak = true
    match.tiebreak_point_team1 = 0
    match.tiebreak_point_team2 = 0
    return match
  }

  // Check if set is won (first to 6, win by 2)
  if (myGames >= 6 && myGames - oppGames >= 2) {
    return winSet(match, team)
  }

  return match
}

function winSet(match, team) {
  // Count sets won by each team
  let team1Sets = 0
  let team2Sets = 0

  for (const set of match.sets) {
    if (set.team1_games > set.team2_games) team1Sets++
    else if (set.team2_games > set.team1_games) team2Sets++
  }

  // Best of 3: first to 2 sets wins
  if ((team === 1 && team1Sets >= 2) || (team === 2 && team2Sets >= 2)) {
    match.status = 'completed'
    match.winner_team = team
    match.completed_at = new Date().toISOString()
    return match
  }

  // Start next set
  match.current_set += 1
  match.current_point_team1 = 0
  match.current_point_team2 = 0

  return match
}

/**
 * Undo the last point. Returns the restored match state.
 */
export function undoPoint(match) {
  if (!match.point_history || match.point_history.length === 0) return match

  const history = [...match.point_history]
  const snapshot = history.pop()

  return {
    ...match,
    ...snapshot,
    point_history: history,
    // Preserve identity fields
    id: match.id,
    format: match.format,
    team1_player_ids: match.team1_player_ids,
    team2_player_ids: match.team2_player_ids,
    team1_name: match.team1_name,
    team2_name: match.team2_name,
    started_at: match.started_at,
    created_at: match.created_at,
    is_deleted: match.is_deleted,
  }
}

/**
 * Creates the initial match state for a new match.
 */
export function createInitialMatchState({ format, team1_player_ids, team2_player_ids, team1_name, team2_name }) {
  return {
    format,
    team1_player_ids,
    team2_player_ids,
    team1_name,
    team2_name,
    status: 'in_progress',
    is_deleted: false,
    winner_team: null,
    sets: [],
    current_set: 1,
    current_point_team1: 0,
    current_point_team2: 0,
    is_tiebreak: false,
    tiebreak_point_team1: 0,
    tiebreak_point_team2: 0,
    point_history: [],
    started_at: null,
    completed_at: null,
  }
}

/**
 * Returns the current set's game score.
 */
export function getCurrentSetScore(match) {
  const setIndex = match.current_set - 1
  const currentSet = match.sets[setIndex]
  if (!currentSet) return { team1: 0, team2: 0 }
  return { team1: currentSet.team1_games, team2: currentSet.team2_games }
}
