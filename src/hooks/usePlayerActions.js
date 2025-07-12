import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { gameEngine } from '../utils/gameEngine.js';
import { aiEngine } from '../ai/aiEngine.js';
import { validatePlayerAction, getAvailableActions } from '../utils/pokerLogic.js';
import { PLAYER_ACTIONS } from '../constants/gameConstants.js';
import { logPlayerAction, logGameStateChange } from '../utils/detailedLogger.js';

/**
 * Custom hook for handling player actions
 * @returns {Object} Player action methods and state
 */
export const usePlayerActions = () => {
  const { 
    gameState, 
    setGameState, 
    addLogEntry, 
    getCurrentPlayer, 
    getAvailableActions: getAvailableActionsFromStore 
  } = useGameStore();

  /**
   * Execute a player action
   * @param {string} action - Action to execute
   * @param {number} amount - Amount for the action
   * @returns {Promise<boolean>} Success status
   */
  const executePlayerAction = useCallback(async (action, amount = 0) => {
    try {
      const currentPlayer = getCurrentPlayer();
      
      if (!currentPlayer || !currentPlayer.isActive || gameState.processingPhase) {
        return false;
      }

      // Validate the action
      const isValid = validatePlayerAction(
        action,
        amount,
        currentPlayer,
        gameState.currentBet,
        gameState.lastRaiseSize,
        gameState.bigBlind,
        gameState
      );

      if (!isValid) {
        const availableActions = getAvailableActions(
          currentPlayer,
          gameState.currentBet,
          gameState.lastRaiseSize,
          gameState.bigBlind,
          gameState
        );
        console.error(`Invalid action attempted:`, {
          action,
          amount,
          player: currentPlayer.name,
          playerChips: currentPlayer.chips,
          playerCurrentBet: currentPlayer.currentBet,
          gameCurrentBet: gameState.currentBet,
          availableActions,
          lastRaiseSize: gameState.lastRaiseSize,
          bigBlind: gameState.bigBlind,
          callAmount: gameState.currentBet - currentPlayer.currentBet
        });
        throw new Error(`Invalid action: ${action} is not available for ${currentPlayer.name}. Available actions: ${availableActions.join(', ')}`);
      }

      // Set processing state
      setGameState({ processingPhase: true });

      // Log the player action
      logPlayerAction(currentPlayer, action, amount, gameState, {
        availableActions: getAvailableActions(
          currentPlayer,
          gameState.currentBet,
          gameState.lastRaiseSize,
          gameState.bigBlind,
          gameState
        ),
        validAction: isValid
      });

      // Process the action through game engine
      const newGameState = gameEngine.processPlayerAction(gameState, action, amount);
      
      // Log game state change
      logGameStateChange(gameState, newGameState, `player_action_${action}`);
      
      // Update the game state
      setGameState(newGameState);

      // Handle game flow continuation
      await handleGameFlow(newGameState);

      return true;
    } catch (error) {
      console.error('Error executing player action:', error);
      setGameState({ processingPhase: false });
      return false;
    }
  }, [gameState, getCurrentPlayer, setGameState]);

  /**
   * Handle AI action processing
   * @param {Object} player - AI player
   * @returns {Promise<boolean>} Success status
   */
  const processAIAction = useCallback(async (player) => {
    if (!player || !player.isActive || player.isAllIn || player.isHuman) {
      return false;
    }
    
    try {
      // Get game context for AI
      const gameContext = getGameContextForAI(player);
      
      // Get AI decision
      const decision = await aiEngine.getAIDecision(player, gameState, gameContext);
      
      if (!decision) {
        throw new Error(`AI_ACTION_ERROR: No decision returned from AI engine for ${player.name}`);
      }
      
      if (!decision.action) {
        throw new Error(`AI_ACTION_ERROR: No action in decision for ${player.name}`);
      }

      // Validate AI action before executing
      const availableActions = getAvailableActions(
        player,
        gameState.currentBet,
        gameState.lastRaiseSize,
        gameState.bigBlind,
        gameState
      );
      
      if (!availableActions.includes(decision.action)) {
        console.error(`AI chose invalid action:`, {
          aiPlayer: player.name,
          chosenAction: decision.action,
          chosenAmount: decision.amount,
          availableActions,
          playerState: {
            chips: player.chips,
            currentBet: player.currentBet,
            isActive: player.isActive,
            isAllIn: player.isAllIn
          },
          gameState: {
            currentBet: gameState.currentBet,
            lastRaiseSize: gameState.lastRaiseSize,
            bigBlind: gameState.bigBlind,
            bettingRound: gameState.bettingRound
          }
        });
        throw new Error(`AI_ACTION_ERROR: AI chose invalid action ${decision.action}. Available: ${availableActions.join(', ')}`);
      }
            
      // Ensure we're passing strings/numbers, not objects
      const actionString = String(decision.action);
      const actionAmount = Number(decision.amount || 0);
      
      const result = await executePlayerAction(actionString, actionAmount);
      
      return result;
    } catch (error) {
      console.error(`AI_ACTION_ERROR for ${player.name}:`, error);
      console.error('Error stack:', error.stack);
      
      // DO NOT hide the error with a fallback - let it bubble up
      throw error;
    }
  }, [gameState, executePlayerAction, addLogEntry]);

  /**
   * Handle game flow after an action
   * @param {Object} newGameState - Updated game state
   */
  const handleGameFlow = useCallback(async (newGameState) => {
    try {
      const activePlayers = newGameState.players.filter(p => p.isActive);
      const playersWhoCanAct = activePlayers.filter(p => !p.isAllIn);
      
      
      // PRIORITY 1: Handle early hand end (only one player left)
      if (activePlayers.length <= 1) {
        const finalState = gameEngine.endHandEarly(newGameState, activePlayers[0]);
        setGameState(finalState);
        
        // Start next hand after delay
        setTimeout(() => {
          startNextHand(finalState);
        }, 3000);
        return;
      }
      
      // PRIORITY 2: Handle all-in situation (everyone is all-in)
      if (playersWhoCanAct.length === 0) {
        
        // Prevent multiple concurrent all-in processing
        if (newGameState.processingPhase) {
          return;
        }
        
        addLogEntry("All remaining players are all-in - dealing remaining cards and going to showdown");
        
        // Set processing flag to prevent concurrent calls
        setGameState({ ...newGameState, processingPhase: true });
        
        setTimeout(() => {
          const showdownState = gameEngine.handleAllInSituation(newGameState);
          setGameState(showdownState);
        }, 1500);
        return;
      }
      
      // PRIORITY 3: Check if betting round is complete (normal flow)
      if (gameEngine.isBettingComplete(newGameState)) {
        setTimeout(() => {
          const nextPhaseState = gameEngine.advanceToNextPhase(newGameState);
          setGameState(nextPhaseState);
        }, 1000);
        return;
      }
      
      // PRIORITY 4: Continue with next player
      const nextPlayer = gameEngine.getNextPlayer(newGameState);
      if (nextPlayer === -1) {
        setTimeout(() => {
          const nextPhaseState = gameEngine.advanceToNextPhase(newGameState);
          setGameState(nextPhaseState);
        }, 1000);
      } else {
        setGameState({ 
          ...newGameState, 
          activePlayer: nextPlayer, 
          processingPhase: false 
        });
      }
    } catch (error) {
      console.error('Error in game flow:', error);
      setGameState({ processingPhase: false });
    }
  }, [setGameState, addLogEntry]);

  /**
   * Start the next hand
   * @param {Object} currentState - Current game state
   */
  const startNextHand = useCallback((currentState) => {
    try {
      // Move dealer button
      const newDealerButton = (currentState.dealerButton + 1) % currentState.players.length;
      
      // Update hand number and dealer
      const preHandState = {
        ...currentState,
        handNumber: currentState.handNumber + 1,
        dealerButton: newDealerButton
      };
      
      // Start new hand through game engine
      const newHandState = gameEngine.startNewHand(preHandState);
      setGameState(newHandState);
      
      // Log hand start
      addLogEntry(`Hand ${newHandState.handNumber} started`, true);
    } catch (error) {
      console.error('Error starting next hand:', error);
    }
  }, [setGameState, addLogEntry]);

  /**
   * Get game context for AI decision making
   * @param {Object} player - AI player
   * @returns {Object} Game context
   */
  const getGameContextForAI = useCallback((player) => {
    const recentActions = [];
    
    // Get recent actions from other players
    gameState.players.forEach(p => {
      if (p.id !== player.id && p.hasActed) {
        let actionText = 'unknown';
        if (gameState.lastAction && gameState.lastAction.player === p.id) {
          actionText = gameState.lastAction.action;
          if (gameState.lastAction.amount) {
            actionText += ` ${gameState.lastAction.amount}`;
          }
        }
        recentActions.push({
          playerName: p.name,
          action: actionText,
          amount: p.currentBet
        });
      }
    });

    return { 
      recentActions,
      burnCards: gameState.burnCards,
      communityCards: gameState.communityCards,
      handNumber: gameState.handNumber,
      bettingRound: gameState.bettingRound,
      potOdds: calculatePotOdds(gameState.currentBet - player.currentBet, gameState.pot),
      stackToPot: player.chips / Math.max(gameState.pot, 1),
      position: getPlayerPosition(player, gameState)
    };
  }, [gameState]);

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
   * @param {Object} player - Player
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
   * Validate if an action is available for current player
   * @param {string} action - Action to validate
   * @returns {boolean} True if action is available
   */
  const isActionAvailable = useCallback((action) => {
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return false;
    
    const availableActions = getAvailableActions(
      currentPlayer,
      gameState.currentBet,
      gameState.lastRaiseSize,
      gameState.bigBlind,
      gameState
    );
    
    const isAvailable = availableActions.includes(action);
    
    
    return isAvailable;
  }, [getCurrentPlayer, gameState.currentBet, gameState.lastRaiseSize, gameState.bigBlind]);

  /**
   * Get minimum raise amount
   * @returns {number} Minimum raise amount
   */
  const getMinRaiseAmount = useCallback(() => {
    const minRaiseSize = Math.max(gameState.lastRaiseSize, gameState.bigBlind);
    return gameState.currentBet + minRaiseSize;
  }, [gameState.currentBet, gameState.lastRaiseSize, gameState.bigBlind]);

  /**
   * Get maximum raise amount for current player
   * @returns {number} Maximum raise amount
   */
  const getMaxRaiseAmount = useCallback(() => {
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return 0;
    
    return currentPlayer.currentBet + currentPlayer.chips;
  }, [getCurrentPlayer]);

  /**
   * Get call amount for current player
   * @returns {number} Amount needed to call
   */
  const getCallAmount = useCallback(() => {
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return 0;
    
    return Math.max(0, gameState.currentBet - currentPlayer.currentBet);
  }, [getCurrentPlayer, gameState.currentBet]);

  return {
    // Action methods
    executePlayerAction,
    processAIAction,
    startNextHand,
    
    // Validation methods
    isActionAvailable,
    
    // Helper methods
    getMinRaiseAmount,
    getMaxRaiseAmount,
    getCallAmount,
    calculatePotOdds,
    
    // State
    isProcessing: gameState.processingPhase,
    currentPlayer: getCurrentPlayer(),
    availableActions: (() => {
      const player = getCurrentPlayer();
      if (!player) return [];
      
      const actions = getAvailableActionsFromStore(player);
      
      return actions;
    })()
  };
};