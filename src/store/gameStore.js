import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { GAME_PHASES, BETTING_ROUNDS, DEFAULT_SETTINGS } from '../constants/gameConstants.js';

/**
 * @typedef {import('./types.js').GameState} GameState
 * @typedef {import('./types.js').Player} Player
 * @typedef {import('./types.js').PlayerSetup} PlayerSetup
 * @typedef {import('./types.js').GameLog} GameLog
 * @typedef {import('./types.js').HandSummary} HandSummary
 */

const initialGameState = {
  phase: GAME_PHASES.SETUP,
  players: [],
  deck: [],
  burnCards: [],
  communityCards: [],
  pot: 0,
  sidePots: [],
  currentBet: 0,
  lastRaiseSize: 0,
  dealerButton: 0,
  smallBlind: DEFAULT_SETTINGS.SMALL_BLIND,
  bigBlind: DEFAULT_SETTINGS.BIG_BLIND,
  activePlayer: 0,
  handNumber: 0,
  bettingRound: BETTING_ROUNDS.PREFLOP,
  lastAction: null,
  processingPhase: false,
  showingSummary: false,
  actionCount: 0
};

const initialPlayerSetup = {
  humanPlayer: { name: 'You', seat: 0 },
  aiPlayers: Array(8).fill(null).map((_, i) => ({
    name: `AI Player ${i + 1}`,
    seat: i + 1,
    strategy: 'randomly-determined'
  }))
};

const initialGameLog = {
  currentHand: [],
  handHistory: [],
  expandedHands: new Set()
};

export const useGameStore = create(
  subscribeWithSelector((set, get) => ({
    // State
    gameState: initialGameState,
    playerSetup: initialPlayerSetup,
    gameLog: initialGameLog,
    handSummary: null,
    aiMemories: {},
    betAmount: DEFAULT_SETTINGS.BIG_BLIND,
    darkMode: false,

    // Actions
    setGameState: (updates) => set((state) => ({
      gameState: { ...state.gameState, ...updates }
    })),

    setPlayerSetup: (updates) => set((state) => ({
      playerSetup: { ...state.playerSetup, ...updates }
    })),

    setGameLog: (updates) => set((state) => ({
      gameLog: { ...state.gameLog, ...updates }
    })),

    setHandSummary: (summary) => set({ handSummary: summary }),

    setAiMemories: (memories) => set({ aiMemories: memories }),

    setBetAmount: (amount) => set({ betAmount: amount }),

    setDarkMode: (darkMode) => set({ darkMode }),

    // Game actions
    resetGame: () => set({
      gameState: initialGameState,
      playerSetup: initialPlayerSetup,
      gameLog: initialGameLog,
      handSummary: null,
      aiMemories: {},
      betAmount: DEFAULT_SETTINGS.BIG_BLIND
    }),

    updatePlayer: (playerId, updates) => set((state) => ({
      gameState: {
        ...state.gameState,
        players: state.gameState.players.map(player =>
          player.id === playerId ? { ...player, ...updates } : player
        )
      }
    })),

    addLogEntry: (message, isHandStart = false) => set((state) => {
      if (isHandStart) {
        return {
          gameLog: {
            ...state.gameLog,
            currentHand: [{ message, timestamp: Date.now() }],
            handHistory: state.gameLog.currentHand.length > 0 
              ? [...state.gameLog.handHistory, { 
                  handNumber: state.gameState.handNumber, 
                  log: state.gameLog.currentHand,
                  completed: true 
                }]
              : state.gameLog.handHistory
          }
        };
      } else {
        return {
          gameLog: {
            ...state.gameLog,
            currentHand: [...state.gameLog.currentHand, { message, timestamp: Date.now() }]
          }
        };
      }
    }),

    toggleHandExpansion: (handNumber) => set((state) => {
      const newExpanded = new Set(state.gameLog.expandedHands);
      if (newExpanded.has(handNumber)) {
        newExpanded.delete(handNumber);
      } else {
        newExpanded.add(handNumber);
      }
      return {
        gameLog: { ...state.gameLog, expandedHands: newExpanded }
      };
    }),

    // Computed values
    getAvailableActions: (player) => {
      const state = get();
      const { gameState } = state;
      
      if (!player || !player.isActive || player.isAllIn) return [];
      
      const actions = [];
      const callAmount = gameState.currentBet - player.currentBet;
      
      if (callAmount === 0) {
        actions.push('check');
      } else if (callAmount <= player.chips && callAmount > 0) {
        actions.push('call');
      }
      
      if (callAmount > 0) {
        actions.push('fold');
      }
      
      const minRaiseSize = Math.max(gameState.lastRaiseSize, gameState.bigBlind);
      const minRaiseTotal = gameState.currentBet + minRaiseSize;
      const additionalForFullRaise = minRaiseTotal - player.currentBet;
      
      if (player.chips >= additionalForFullRaise) {
        actions.push('raise');
      }
      
      if (player.chips > 0) {
        actions.push('all-in');
      }
      
      return actions;
    },

    getCurrentPlayer: () => {
      const state = get();
      const { gameState } = state;
      return gameState.players[gameState.activePlayer];
    },

    getActivePlayers: () => {
      const state = get();
      return state.gameState.players.filter(p => p.isActive);
    },

    getHumanPlayer: () => {
      const state = get();
      return state.gameState.players.find(p => p.isHuman);
    }
  }))
);

// Selectors for common state access
export const useGameState = () => useGameStore((state) => state.gameState);
export const usePlayerSetup = () => useGameStore((state) => state.playerSetup);
export const useGameLog = () => useGameStore((state) => state.gameLog);
export const useHandSummary = () => useGameStore((state) => state.handSummary);
export const useAiMemories = () => useGameStore((state) => state.aiMemories);
export const useBetAmount = () => useGameStore((state) => state.betAmount);
export const useDarkMode = () => useGameStore((state) => state.darkMode);
export const useCurrentPlayer = () => useGameStore((state) => state.getCurrentPlayer());
export const useHumanPlayer = () => useGameStore((state) => state.getHumanPlayer());
export const useActivePlayers = () => useGameStore((state) => state.getActivePlayers());