import { describe, it, expect } from 'vitest'
import {
  scorePoint,
  undoPoint,
  formatPointDisplay,
  createInitialMatchState,
  getCurrentSetScore,
} from './scoring'

function makeMatch(overrides = {}) {
  return createInitialMatchState({
    format: '1v1',
    team1_player_ids: ['a'],
    team2_player_ids: ['b'],
    team1_name: 'Player A',
    team2_name: 'Player B',
    ...overrides,
  })
}

// Helper: score N points for a team
function scoreN(match, team, n) {
  let m = match
  for (let i = 0; i < n; i++) {
    m = scorePoint(m, team)
  }
  return m
}

// Helper: have team win a game (4 points, assuming no deuce)
function winGame(match, team) {
  return scoreN(match, team, 4)
}

// Helper: have team win N games
function winGames(match, team, n) {
  let m = match
  for (let i = 0; i < n; i++) {
    m = winGame(m, team)
  }
  return m
}

describe('Standard point progression', () => {
  it('progresses through 0 → 15 → 30 → 40 → game', () => {
    let m = makeMatch()
    const display0 = formatPointDisplay(m)
    expect(display0.team1).toBe('0')

    m = scorePoint(m, 1)
    expect(formatPointDisplay(m).team1).toBe('15')

    m = scorePoint(m, 1)
    expect(formatPointDisplay(m).team1).toBe('30')

    m = scorePoint(m, 1)
    expect(formatPointDisplay(m).team1).toBe('40')

    // Winning point — game won, points reset
    m = scorePoint(m, 1)
    expect(m.current_point_team1).toBe(0)
    expect(m.current_point_team2).toBe(0)
  })

  it('sets started_at on first point', () => {
    let m = makeMatch()
    expect(m.started_at).toBeNull()
    m = scorePoint(m, 1)
    expect(m.started_at).not.toBeNull()
  })
})

describe('Deuce and advantage', () => {
  it('enters deuce at 40-40', () => {
    let m = makeMatch()
    m = scoreN(m, 1, 3) // 40-0
    m = scoreN(m, 2, 3) // 40-40

    const display = formatPointDisplay(m)
    expect(display.team1).toBe('40')
    expect(display.team2).toBe('40')
    expect(display.deuce).toBe(true)
  })

  it('gives advantage to scoring team from deuce', () => {
    let m = makeMatch()
    m = scoreN(m, 1, 3)
    m = scoreN(m, 2, 3) // deuce

    m = scorePoint(m, 1)
    const display = formatPointDisplay(m)
    expect(display.team1).toBe('AD')
    expect(display.team2).toBe('40')
  })

  it('returns to deuce when advantage is lost', () => {
    let m = makeMatch()
    m = scoreN(m, 1, 3)
    m = scoreN(m, 2, 3) // deuce
    m = scorePoint(m, 1) // AD team1
    m = scorePoint(m, 2) // back to deuce

    const display = formatPointDisplay(m)
    expect(display.deuce).toBe(true)
  })

  it('wins game from advantage', () => {
    let m = makeMatch()
    m = scoreN(m, 1, 3)
    m = scoreN(m, 2, 3) // deuce
    m = scorePoint(m, 1) // AD team1
    m = scorePoint(m, 1) // game

    expect(m.current_point_team1).toBe(0)
    expect(m.current_point_team2).toBe(0)
    expect(m.sets[0].team1_games).toBe(1)
  })

  it('handles multiple deuce cycles', () => {
    let m = makeMatch()
    m = scoreN(m, 1, 3)
    m = scoreN(m, 2, 3) // deuce

    // 3 deuce cycles
    for (let i = 0; i < 3; i++) {
      m = scorePoint(m, 1) // AD team1
      m = scorePoint(m, 2) // deuce
    }

    const display = formatPointDisplay(m)
    expect(display.deuce).toBe(true)

    // Finally win
    m = scorePoint(m, 2) // AD team2
    m = scorePoint(m, 2) // game
    expect(m.sets[0].team2_games).toBe(1)
  })
})

describe('Game and set progression', () => {
  it('tracks games within a set', () => {
    let m = makeMatch()
    m = winGames(m, 1, 3)
    m = winGames(m, 2, 2)

    expect(m.sets[0].team1_games).toBe(3)
    expect(m.sets[0].team2_games).toBe(2)
  })

  it('wins set at 6-4', () => {
    let m = makeMatch()
    // Interleave: 4-4, then team 1 wins 2 more
    m = winGames(m, 1, 4)
    m = winGames(m, 2, 4)
    m = winGames(m, 1, 2)

    // After 6-4, set is won and we move to set 2
    expect(m.current_set).toBe(2)
    expect(m.sets[0].team1_games).toBe(6)
    expect(m.sets[0].team2_games).toBe(4)
  })

  it('does not win set at 6-5 (need win by 2)', () => {
    let m = makeMatch()
    m = winGames(m, 1, 5)
    m = winGames(m, 2, 5)
    m = winGame(m, 1) // 6-5

    expect(m.current_set).toBe(1)
    expect(m.sets[0].team1_games).toBe(6)
    expect(m.sets[0].team2_games).toBe(5)
  })

  it('triggers tiebreak at 6-6', () => {
    let m = makeMatch()
    m = winGames(m, 1, 5)
    m = winGames(m, 2, 5)
    m = winGame(m, 1) // 6-5
    m = winGame(m, 2) // 6-6

    expect(m.is_tiebreak).toBe(true)
    expect(m.tiebreak_point_team1).toBe(0)
    expect(m.tiebreak_point_team2).toBe(0)
  })
})

describe('Tiebreak', () => {
  function toTiebreak() {
    let m = makeMatch()
    m = winGames(m, 1, 5)
    m = winGames(m, 2, 5)
    m = winGame(m, 1) // 6-5
    m = winGame(m, 2) // 6-6 → tiebreak
    return m
  }

  it('displays raw tiebreak points', () => {
    let m = toTiebreak()
    m = scoreN(m, 1, 3)
    m = scoreN(m, 2, 5)

    const display = formatPointDisplay(m)
    expect(display.team1).toBe('3')
    expect(display.team2).toBe('5')
  })

  it('wins tiebreak at 7-5', () => {
    let m = toTiebreak()
    m = scoreN(m, 1, 7)
    m = scoreN(m, 2, 5)

    // Tiebreak won → set won (7-6) → moved to set 2
    expect(m.is_tiebreak).toBe(false)
    expect(m.current_set).toBe(2)
    expect(m.sets[0].team1_games).toBe(7)
    expect(m.sets[0].team2_games).toBe(6)
  })

  it('does not win tiebreak at 7-6 (need win by 2)', () => {
    let m = toTiebreak()
    // Interleave to reach 6-6 in tiebreak, then one more for team 1
    m = scoreN(m, 1, 6)
    m = scoreN(m, 2, 6) // 6-6
    m = scorePoint(m, 1) // 7-6

    expect(m.is_tiebreak).toBe(true)
    expect(m.tiebreak_point_team1).toBe(7)
    expect(m.tiebreak_point_team2).toBe(6)
  })

  it('wins tiebreak at 8-6 after extended play', () => {
    let m = toTiebreak()
    m = scoreN(m, 1, 6)
    m = scoreN(m, 2, 6) // 6-6 in tiebreak
    m = scorePoint(m, 1) // 7-6
    m = scorePoint(m, 2) // 7-7
    m = scorePoint(m, 1) // 8-7
    m = scorePoint(m, 1) // 9-7 → win

    expect(m.is_tiebreak).toBe(false)
    expect(m.sets[0].team1_games).toBe(7)
  })
})

describe('Match completion (best of 3)', () => {
  function winSet(m, team) {
    return winGames(m, team, 6)
  }

  it('wins match after 2 sets (2-0)', () => {
    let m = makeMatch()
    m = winSet(m, 1) // Set 1: 6-0
    m = winSet(m, 1) // Set 2: 6-0

    expect(m.status).toBe('completed')
    expect(m.winner_team).toBe(1)
    expect(m.completed_at).not.toBeNull()
  })

  it('wins match 2-1 after losing a set', () => {
    let m = makeMatch()
    m = winSet(m, 1) // Set 1: team 1
    m = winSet(m, 2) // Set 2: team 2
    m = winSet(m, 1) // Set 3: team 1

    expect(m.status).toBe('completed')
    expect(m.winner_team).toBe(1)
    expect(m.sets.length).toBe(3)
  })

  it('does not score after match is completed', () => {
    let m = makeMatch()
    m = winSet(m, 1)
    m = winSet(m, 1)

    expect(m.status).toBe('completed')
    const afterExtra = scorePoint(m, 2)
    expect(afterExtra).toBe(m) // same reference, no change
  })
})

describe('Undo', () => {
  it('reverts the last point', () => {
    let m = makeMatch()
    m = scorePoint(m, 1) // 15-0
    m = scorePoint(m, 1) // 30-0

    expect(m.current_point_team1).toBe(2) // internal value for 30
    m = undoPoint(m)
    expect(m.current_point_team1).toBe(1) // internal value for 15
  })

  it('does nothing when no history', () => {
    const m = makeMatch()
    const result = undoPoint(m)
    expect(result.current_point_team1).toBe(0)
  })

  it('reverts a game win back to 40-0', () => {
    let m = makeMatch()
    m = scoreN(m, 1, 3) // 40-0
    m = scorePoint(m, 1) // game won

    expect(m.sets[0]?.team1_games).toBe(1)
    expect(m.current_point_team1).toBe(0)

    m = undoPoint(m)
    expect(m.current_point_team1).toBe(3) // back to 40
    expect(m.sets[0]).toBeUndefined() // set entry removed (was empty before)
  })

  it('preserves identity fields through undo', () => {
    let m = makeMatch()
    m = { ...m, id: 'test-id' }
    m = scorePoint(m, 1)
    m = undoPoint(m)

    expect(m.id).toBe('test-id')
    expect(m.team1_name).toBe('Player A')
  })

  it('can undo multiple times', () => {
    let m = makeMatch()
    m = scorePoint(m, 1) // 15-0
    m = scorePoint(m, 2) // 15-15
    m = scorePoint(m, 1) // 30-15

    m = undoPoint(m) // back to 15-15
    expect(m.current_point_team1).toBe(1)
    expect(m.current_point_team2).toBe(1)

    m = undoPoint(m) // back to 15-0
    expect(m.current_point_team1).toBe(1)
    expect(m.current_point_team2).toBe(0)

    m = undoPoint(m) // back to 0-0
    expect(m.current_point_team1).toBe(0)
    expect(m.current_point_team2).toBe(0)
  })
})

describe('Game history tracking', () => {
  it('records game history entries when games are won', () => {
    let m = makeMatch()
    m = winGame(m, 1) // game 1 won by team 1
    m = winGame(m, 2) // game 2 won by team 2

    expect(m.game_history.length).toBe(2)
    expect(m.game_history[0].set).toBe(1)
    expect(m.game_history[0].game).toBe(1)
    expect(m.game_history[0].winner_team).toBe(1)
    expect(m.game_history[0].score_before).toBe('0-0')
    expect(m.game_history[1].game).toBe(2)
    expect(m.game_history[1].winner_team).toBe(2)
    expect(m.game_history[1].score_before).toBe('1-0')
  })

  it('tracks games across sets', () => {
    let m = makeMatch()
    m = winGames(m, 1, 6) // set 1: 6-0
    m = winGame(m, 2)      // set 2, game 1

    expect(m.game_history.length).toBe(7)
    // Last entry should be set 2, game 1
    const last = m.game_history[6]
    expect(last.set).toBe(2)
    expect(last.game).toBe(1)
    expect(last.winner_team).toBe(2)
  })

  it('reverts game_history on undo', () => {
    let m = makeMatch()
    m = scoreN(m, 1, 3) // 40-0
    m = scorePoint(m, 1) // game won → game_history has 1 entry

    expect(m.game_history.length).toBe(1)

    m = undoPoint(m) // undo the game-winning point
    expect(m.game_history.length).toBe(0)
  })

  it('starts with empty game_history', () => {
    const m = makeMatch()
    expect(m.game_history).toEqual([])
  })
})

describe('getCurrentSetScore', () => {
  it('returns 0-0 for a fresh match', () => {
    const m = makeMatch()
    const score = getCurrentSetScore(m)
    expect(score.team1).toBe(0)
    expect(score.team2).toBe(0)
  })

  it('returns current game counts', () => {
    let m = makeMatch()
    m = winGames(m, 1, 3)
    m = winGames(m, 2, 2)
    const score = getCurrentSetScore(m)
    expect(score.team1).toBe(3)
    expect(score.team2).toBe(2)
  })
})
