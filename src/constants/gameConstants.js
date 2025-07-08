export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const GAME_PHASES = {
  SETUP: 'setup',
  PLAYING: 'playing',
  GAME_OVER: 'game-over'
};

export const BETTING_ROUNDS = {
  PREFLOP: 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river'
};

export const PLAYER_ACTIONS = {
  FOLD: 'fold',
  CHECK: 'check',
  CALL: 'call',
  RAISE: 'raise',
  ALL_IN: 'all-in'
};

export const DEFAULT_SETTINGS = {
  INITIAL_CHIPS: 60000,
  SMALL_BLIND: 100,
  BIG_BLIND: 200,
  MAX_PLAYERS: 9,
  MAX_ACTIONS_PER_ROUND: 50
};