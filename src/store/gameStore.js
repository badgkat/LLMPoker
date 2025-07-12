import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { GAME_PHASES, BETTING_ROUNDS, DEFAULT_SETTINGS } from '../constants/gameConstants.js';
import { getAvailableActions as getAvailableActionsFromLogic } from '../utils/pokerLogic.js';

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
  showingShowdown: false,
  actionCount: 0
};

const initialPlayerSetup = {
  humanPlayer: { name: 'You' },  // Remove seat property - it will be assigned by game engine
  aiPlayers: Array(8).fill(null).map((_, i) => ({
    name: `AI Player ${i + 1}`,
    // Remove seat property - it will be assigned by game engine
    personality: 'RANDOM'
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
    showdownData: null,
    aiMemories: {},
    betAmount: DEFAULT_SETTINGS.BIG_BLIND,
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,

    // Actions
    setGameState: (updates) => {
      set((state) => {
        const newGameState = { ...state.gameState, ...updates };
        return { gameState: newGameState };
      });
    },

    setPlayerSetup: (updates) => {
      set((state) => {
        const newPlayerSetup = { ...state.playerSetup, ...updates };
        return { playerSetup: newPlayerSetup };
      });
    },

    setGameLog: (updates) => set((state) => ({
      gameLog: { ...state.gameLog, ...updates }
    })),

    setHandSummary: (summary) => set({ handSummary: summary }),

    setShowdownData: (data) => set({ showdownData: data }),

    setAiMemories: (memories) => set({ aiMemories: memories }),

    setBetAmount: (amount) => set({ betAmount: amount }),

    setDarkMode: (darkMode) => set({ darkMode }),

    // Game actions
    resetGame: () => set({
      gameState: initialGameState,
      playerSetup: initialPlayerSetup,
      gameLog: initialGameLog,
      handSummary: null,
      showdownData: null,
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
        // Always move current hand to history if it has entries, and use the previous hand number
        const previousHandNumber = state.gameState.handNumber > 0 ? state.gameState.handNumber - 1 : 0;
        
        // Check if we already have this hand number in history to avoid duplicates
        const existingHandIndex = state.gameLog.handHistory.findIndex(h => h.handNumber === previousHandNumber);
        
        let updatedHistory;
        if (state.gameLog.currentHand.length > 0) {
          const newHandEntry = {
            handNumber: previousHandNumber,
            log: [...state.gameLog.currentHand], // Create a copy
            completed: true
          };
          
          if (existingHandIndex !== -1) {
            // Update existing hand rather than create duplicate
            updatedHistory = [...state.gameLog.handHistory];
            updatedHistory[existingHandIndex] = newHandEntry;
          } else {
            // Add new hand to history
            updatedHistory = [...state.gameLog.handHistory, newHandEntry];
          }
        } else {
          updatedHistory = state.gameLog.handHistory;
        }

        return {
          gameLog: {
            ...state.gameLog,
            currentHand: [{ message, timestamp: Date.now() }],
            handHistory: updatedHistory
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
      
      return getAvailableActionsFromLogic(
        player,
        gameState.currentBet,
        gameState.lastRaiseSize,
        gameState.bigBlind
      );
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