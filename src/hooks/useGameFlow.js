import { useEffect, useCallback } from 'react';
import { useGameStore, useGameState } from '../store/gameStore.js';
import { gameEngine } from '../utils/gameEngine.js';
import { aiEngine } from '../ai/aiEngine.js';
import { aiMemory } from '../ai/aiMemory.js';
import { GAME_PHASES } from '../constants/gameConstants.js';

/**
 * Custom hook for managing overall game flow and lifecycle
 * @returns {Object} Game flow methods and state
 */
export const useGameFlow = () => {
  const gameState = useGameState();
  const { 
    setGameState, 
    setHandSummary,
    setShowdownData,
    resetGame 
  } = useGameStore();

  // Create stable references to store functions to avoid dependency issues
  const addLogEntry = useCallback((message, isHandStart = false) => {
    useGameStore.getState().addLogEntry(message, isHandStart);
  }, []);

  const setAiMemories = useCallback((memories) => {
    useGameStore.getState().setAiMemories(memories);
  }, []);

  /**
   * Initialize game engine event listeners
   */
  useEffect(() => {
    // Game initialization events
    gameEngine.on('gameInitialized', (data) => {
      addLogEntry('🎰 New tournament started!');
      
      // Initialize AI memories for all players
      data.players.forEach(player => {
        if (!player.isHuman) {
          aiMemory.initializePlayer(player.id, player.name);
        }
      });
    });

    // Hand lifecycle events
    gameEngine.on('handStarted', (data) => {
      const { sbPlayer, bbPlayer } = data;
      addLogEntry(`Hand ${data.gameState.handNumber} started. Blinds: ${sbPlayer.name} (SB: ${data.gameState.smallBlind}), ${bbPlayer.name} (BB: ${data.gameState.bigBlind})`, true);
      addLogEntry(`Pre-flop burn card dealt face down`);
    });

    // Player action events
    gameEngine.on('playerAction', (data) => {
      const { description, player, action, amount } = data;
      addLogEntry(description);
      
      // Record action in AI memory for learning
      if (!player.isHuman) {
        const actionData = {
          handNumber: data.gameState.handNumber,
          bettingRound: data.gameState.bettingRound,
          action,
          amount,
          position: getPlayerPosition(player, data.gameState),
          potSize: data.gameState.pot,
          stackSize: player.chips,
          opponentsInHand: data.gameState.players.filter(p => p.isActive).length,
          potOdds: calculatePotOdds(data.gameState.currentBet - player.currentBet, data.gameState.pot),
          wasRaised: data.gameState.currentBet > data.gameState.bigBlind
        };
        
        aiMemory.recordAction(player.id, actionData);
      }
    });

    // Phase progression events
    gameEngine.on('phaseAdvanced', (data) => {
      const { phase, newCards } = data;
      if (newCards && newCards.length > 0) {
        const cardStr = newCards.map(c => `${c.rank}${c.suit}`).join(' ');
        addLogEntry(`${phase.toUpperCase()} dealt: ${cardStr}`);
        addLogEntry(`${phase} burn card dealt face down`);
      }
    });

    // Showdown events
    gameEngine.on('showdownStarted', (data) => {
      addLogEntry('--- SHOWDOWN ---');
      
      if (data.activePlayers.length > 1) {
        data.activePlayers.forEach(player => {
          const cardStr = player.holeCards.map(c => `${c.rank}${c.suit}`).join(' ');
          addLogEntry(`${player.name} shows: ${cardStr}`);
        });
      }
    });

    gameEngine.on('showdownComplete', (data) => {
      const { winners, handEvaluations } = data;
      
      // Log winners
      winners.forEach(winner => {
        if (winners.length === 1) {
          addLogEntry(`${winner.player.name} wins ${winner.amount.toLocaleString()} chips with ${winner.hand || 'best hand'} - Total: ${winner.player.chips.toLocaleString()}`);
        } else {
          addLogEntry(`${winner.player.name} ties and wins ${winner.amount.toLocaleString()} chips with ${winner.hand || 'best hand'} - Total: ${winner.player.chips.toLocaleString()}`);
        }
      });

      // Record hand results in AI memory
      data.gameState.players.forEach(player => {
        if (!player.isHuman) {
          const playerEval = handEvaluations.find(he => he.player.id === player.id);
          const winner = winners.find(w => w.player.id === player.id);
          
          aiMemory.recordHandResult(player.id, {
            handNumber: data.gameState.handNumber,
            showdown: handEvaluations.length > 1,
            won: !!winner,
            potWon: winner?.amount || 0,
            handStrength: playerEval?.evaluation.strength || 0,
            wasBluff: false // This would need more sophisticated detection
          });
        }
      });

      // Set showdown data to trigger the sequence
      setShowdownData(data);
      setGameState({ showingShowdown: true });
    });

    // Hand ending events
    gameEngine.on('handEndedEarly', (data) => {
      const { winner, amount } = data;
      if (winner) {
        addLogEntry(`${winner.name} wins ${amount.toLocaleString()} chips (all others folded) - Total: ${winner.chips.toLocaleString()}`);
        
        // Record win in AI memory
        if (!winner.isHuman) {
          aiMemory.recordHandResult(winner.id, {
            handNumber: data.gameState.handNumber,
            showdown: false,
            won: true,
            potWon: amount,
            wasBluff: false
          });
        }
      }

      // Show simple hand summary
      const summary = createHandSummary(data, 'fold');
      setHandSummary(summary);
      
      // Start next hand after delay
      setTimeout(() => {
        startNextHand(data.gameState);
      }, 3000);
    });

    // Game over events
    gameEngine.on('gameOver', (data) => {
      if (data.winner) {
        addLogEntry(`🏆 Tournament over! ${data.winner.name} wins with ${data.winner.chips.toLocaleString()} chips!`);
      } else {
        addLogEntry('🏁 Tournament ended');
      }
    });

    // Cleanup function to remove event listeners
    return () => {
      gameEngine.eventListeners.clear();
    };
  }, [addLogEntry, setAiMemories]); // Stable dependencies

  /**
   * Check for game over conditions (but not during showdown or processing)
   */
  useEffect(() => {
    if (gameState.phase === GAME_PHASES.PLAYING && 
        gameState.players && 
        !gameState.processingPhase && 
        !gameState.showingShowdown) {
      const activePlayers = gameState.players.filter(p => p.chips > 0);
      
      if (activePlayers.length < 2) {
        setGameState({ 
          ...gameState, 
          phase: GAME_PHASES.GAME_OVER 
        });
        
        if (activePlayers.length === 1) {
          gameEngine.emit('gameOver', { winner: activePlayers[0] });
        }
      }
    }
  }, [gameState, setGameState]);

  /**
   * Create hand summary object
   * @param {Object} data - Event data
   * @param {string} endType - How the hand ended
   * @returns {Object} Hand summary
   */
  const createHandSummary = useCallback((data, endType = 'showdown') => {
    const { gameState: finalGameState, winners = [], sidePots = [] } = data;
    
    return {
      handNumber: finalGameState.handNumber,
      communityCards: [...finalGameState.communityCards],
      showdownPlayers: endType === 'showdown' 
        ? finalGameState.players.filter(p => p.isActive).map(player => ({
            ...player,
            handEvaluation: {
              strength: Math.random() * 1000, // Placeholder
              description: "High Card" // Placeholder
            }
          }))
        : [],
      winners,
      sidePots,
      totalPot: sidePots.reduce((total, pot) => total + pot.amount, 0),
      endType
    };
  }, []);

  /**
   * Calculate pot odds
   * @param {number} callAmount - Amount to call
   * @param {number} potSize - Current pot size
   * @returns {number} Pot odds ratio
   */
  const calculatePotOdds = useCallback((callAmount, potSize) => {
    if (callAmount <= 0) return Infinity;
    return potSize / callAmount;
  }, []);

  /**
   * Get player position description
   * @param {Object} player - Player object
   * @param {Object} gameState - Game state
   * @returns {string} Position description
   */
  const getPlayerPosition = useCallback((player, gameState) => {
    const activePlayers = gameState.players.filter(p => p.isActive);
    const totalPlayers = activePlayers.length;
    const position = (player.seat - gameState.dealerButton + totalPlayers) % totalPlayers;
    
    switch (position) {
      case 0: return 'Button';
      case 1: return 'Small Blind';
      case 2: return 'Big Blind';
      case 3: return 'Under the Gun';
      case totalPlayers - 1: return 'Cutoff';
      default: return `Position ${position}`;
    }
  }, []);

  /**
   * Start the next hand after current hand completes
   * @param {Object} currentState - Current game state
   * @returns {void}
   */
  const startNextHand = useCallback((currentState) => {
    try {
      // Check if game should end
      const playersWithChips = currentState.players.filter(p => p.chips > 0);
      if (playersWithChips.length < 2) {
        setGameState({ 
          ...currentState, 
          phase: GAME_PHASES.GAME_OVER 
        });
        return;
      }
      
      // Move dealer button
      const newDealerButton = (currentState.dealerButton + 1) % currentState.players.length;
      
      // Update hand number and dealer
      const preHandState = {
        ...currentState,
        handNumber: currentState.handNumber + 1,
        dealerButton: newDealerButton,
        showingSummary: false
      };
      
      // Start new hand through game engine
      const newHandState = gameEngine.startNewHand(preHandState);
      setGameState(newHandState);
      
    } catch (error) {
      console.error('Error starting next hand:', error);
    }
  }, [setGameState]);

  /**
   * Handle completion of showdown sequence
   * @param {Object} showdownData - Showdown data
   */
  const handleShowdownComplete = useCallback((showdownData) => {
    
    // Show hand summary
    const summary = createHandSummary(showdownData);
    setHandSummary(summary);
    
    // Clear showdown data and ensure game continues
    setShowdownData(null);
    setGameState({ 
      showingShowdown: false,
      processingPhase: false // Ensure we're not stuck in processing
    });
    
    // Check for tournament end AFTER showdown completes
    const playersWithChips = showdownData.gameState.players.filter(p => p.chips > 0);
    if (playersWithChips.length < 2) {
      // Tournament is over, don't start next hand
      setTimeout(() => {
        setGameState({ 
          ...showdownData.gameState, 
          phase: GAME_PHASES.GAME_OVER 
        });
        
        if (playersWithChips.length === 1) {
          gameEngine.emit('gameOver', { winner: playersWithChips[0] });
        }
      }, 1000);
    } else {
      // Continue with next hand
      setTimeout(() => {
        startNextHand(showdownData.gameState);
      }, 3000);
    }
  }, [createHandSummary, setHandSummary, setShowdownData, setGameState, startNextHand]);

  /**
   * Start a new game
   * @param {Object} playerSetup - Player setup configuration
   * @returns {Promise<void>}
   */
  const startNewGame = useCallback(async (playerSetup) => {
    try {
      
      // Reset everything
      resetGame();
      aiMemory.clearMemory();
      aiEngine.clearMemories();

      // Initialize through game engine
      const initialGameState = gameEngine.initializeGame(playerSetup);
      setGameState(initialGameState);

      // Start first hand
      const firstHandState = gameEngine.startNewHand(initialGameState);
      setGameState(firstHandState);

      return firstHandState;
    } catch (error) {
      console.error('Failed to start new game:', error);
      throw error;
    }
  }, [resetGame, setGameState]);

  /**
   * Get AI memory statistics
   * @returns {Object} AI memory stats
   */
  const getAIStats = useCallback(() => {
    return aiMemory.getMemoryStats();
  }, []);

  /**
   * Get game statistics
   * @returns {Object} Game statistics
   */
  const getGameStats = useCallback(() => {
    if (!gameState.players) return null;

    const totalHands = gameState.handNumber;
    const activePlayers = gameState.players.filter(p => p.chips > 0);
    const eliminatedPlayers = gameState.players.filter(p => p.chips === 0);
    const totalPot = gameState.pot;
    const averageStack = activePlayers.length > 0 
      ? activePlayers.reduce((sum, p) => sum + p.chips, 0) / activePlayers.length 
      : 0;

    return {
      totalHands,
      activePlayers: activePlayers.length,
      eliminatedPlayers: eliminatedPlayers.length,
      totalPot,
      averageStack: Math.round(averageStack),
      chipLeader: activePlayers.length > 0 
        ? activePlayers.reduce((leader, player) => 
            player.chips > leader.chips ? player : leader
          )
        : null
    };
  }, [gameState]);

  /**
   * Force advance to next hand (for testing/admin)
   * @returns {void}
   */
  const forceNextHand = useCallback(() => {
    if (gameState.phase === GAME_PHASES.PLAYING) {
      startNextHand(gameState);
    }
  }, [gameState, startNextHand]);

  return {
    // Game control methods
    startNewGame,
    forceNextHand,
    handleShowdownComplete,
    
    // Statistics and info
    getAIStats,
    getGameStats,
    
    // State
    isGameActive: gameState.phase === GAME_PHASES.PLAYING,
    isGameOver: gameState.phase === GAME_PHASES.GAME_OVER,
    currentHand: gameState.handNumber,
    activePlayers: gameState.players?.filter(p => p.chips > 0).length || 0
  };
};