/**
 * Padel scoring engine — pure functions, no side effects.
 *
 * Point values: 0=0, 1=15, 2=30, 3=40, 4=Advantage
 * Tiebreak uses raw point counts instead.
 *
 * game_history: array of { set, game, winner_team, score_before }
 *   score_before is the game score when this game was won, e.g. "3-2" meaning
 *   the winner took it from 3-2 to 4-2 (or whatever the new count is).
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
    game_history: match.game_history ? [...match.game_history] : [],
  }
}

/**
 * Main scoring function. Returns a new match state after awarding a point to the given team.
 * Does NOT mutate the input.
 */
export function scorePoint(match, team) {
  if (match.status !== 'in_progress') return match

  const next = {
    ...match,
    sets: JSON.parse(JSON.stringify(match.sets)),
    point_history: [
      ...match.point_history,
      createSnapshot(match),
    ],
    game_history: match.game_history ? [...match.game_history] : [],
  }

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

  if (myPoints >= 3 && oppPoints >= 3) {
    if (myPoints === 4) {
      return winGame(match, team)
    }
    if (oppPoints === 4) {
      match[myKey] = 3
      match[oppKey] = 3
      return match
    }
    match[myKey] = 4
    return match
  }

  if (myPoints === 3) {
    return winGame(match, team)
  }

  match[myKey] = myPoints + 1
  return match
}

function scoreTiebreakPoint(match, team) {
  const myKey = team === 1 ? 'tiebreak_point_team1' : 'tiebreak_point_team2'
  const oppKey = team === 1 ? 'tiebreak_point_team2' : 'tiebreak_point_team1'

  match[myKey] += 1

  const myPoints = match[myKey]
  const oppPoints = match[oppKey]

  if (myPoints >= 7 && myPoints - oppPoints >= 2) {
    return winTiebreak(match, team)
  }

  return match
}

function winTiebreak(match, team) {
  const setIndex = match.current_set - 1

  if (!match.sets[setIndex]) {
    match.sets[setIndex] = { team1_games: 6, team2_games: 6 }
  }

  // Record tiebreak as a game in history
  const t1 = match.sets[setIndex].team1_games
  const t2 = match.sets[setIndex].team2_games
  const gameNum = t1 + t2 + 1 - 12 + 1 // game number within the tiebreak context
  match.game_history.push({
    set: match.current_set,
    game: t1 + t2 - 11, // game 13 in the set = game 1 of tiebreak display
    winner_team: team,
    is_tiebreak: true,
    tiebreak_score: `${match.tiebreak_point_team1}-${match.tiebreak_point_team2}`,
    score_before: `${t1}-${t2}`,
  })

  if (team === 1) {
    match.sets[setIndex].team1_games = 7
  } else {
    match.sets[setIndex].team2_games = 7
  }

  match.is_tiebreak = false
  match.tiebreak_point_team1 = 0
  match.tiebreak_point_team2 = 0

  return winSet(match, team)
}

function winGame(match, team) {
  const setIndex = match.current_set - 1

  if (!match.sets[setIndex]) {
    match.sets[setIndex] = { team1_games: 0, team2_games: 0 }
  }

  // Record the game score BEFORE incrementing
  const t1Before = match.sets[setIndex].team1_games
  const t2Before = match.sets[setIndex].team2_games
  const gameNumber = t1Before + t2Before + 1

  match.game_history.push({
    set: match.current_set,
    game: gameNumber,
    winner_team: team,
    is_tiebreak: false,
    score_before: `${t1Before}-${t2Before}`,
  })

  const gameKey = team === 1 ? 'team1_games' : 'team2_games'
  match.sets[setIndex][gameKey] += 1

  match.current_point_team1 = 0
  match.current_point_team2 = 0

  const t1Games = match.sets[setIndex].team1_games
  const t2Games = match.sets[setIndex].team2_games
  const myGames = team === 1 ? t1Games : t2Games
  const oppGames = team === 1 ? t2Games : t1Games

  if (t1Games === 6 && t2Games === 6) {
    match.is_tiebreak = true
    match.tiebreak_point_team1 = 0
    match.tiebreak_point_team2 = 0
    return match
  }

  if (myGames >= 6 && myGames - oppGames >= 2) {
    return winSet(match, team)
  }

  return match
}

function winSet(match, team) {
  let team1Sets = 0
  let team2Sets = 0

  for (const set of match.sets) {
    if (set.team1_games > set.team2_games) team1Sets++
    else if (set.team2_games > set.team1_games) team2Sets++
  }

  if ((team === 1 && team1Sets >= 2) || (team === 2 && team2Sets >= 2)) {
    match.status = 'completed'
    match.winner_team = team
    match.completed_at = new Date().toISOString()
    return match
  }

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
    game_history: [],
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
