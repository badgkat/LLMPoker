import { PLAYER_ACTIONS, BETTING_ROUNDS, GAME_PHASES } from '../constants/gameConstants.js';
import { isValidCard, isCompleteDeck } from './deckUtils.js';
import { getAvailableActions } from './pokerLogic.js';

/**
 * @typedef {import('../store/types.js').GameState} GameState
 * @typedef {import('../store/types.js').Player} Player
 * @typedef {import('../store/types.js').Card} Card
 */

/**
 * Game validation utilities for ensuring game state integrity
 */
export class GameValidator {
  
  /**
   * Validate complete game state
   * @param {GameState} gameState - Game state to validate
   * @returns {Object} Validation result
   */
  static validateGameState(gameState) {
    const errors = [];
    const warnings = [];

    try {
      // Validate basic structure
      if (!gameState || typeof gameState !== 'object') {
        errors.push('Game state is not a valid object');
        return { isValid: false, errors, warnings };
      }

      // Validate phase
      if (!Object.values(GAME_PHASES).includes(gameState.phase)) {
        errors.push(`Invalid game phase: ${gameState.phase}`);
      }

      // Validate players
      const playerValidation = this.validatePlayers(gameState.players);
      errors.push(...playerValidation.errors);
      warnings.push(...playerValidation.warnings);

      // Validate deck and cards
      const cardValidation = this.validateCards(gameState);
      errors.push(...cardValidation.errors);
      warnings.push(...cardValidation.warnings);

      // Validate betting
      const bettingValidation = this.validateBetting(gameState);
      errors.push(...bettingValidation.errors);
      warnings.push(...bettingValidation.warnings);

      // Validate game flow
      const flowValidation = this.validateGameFlow(gameState);
      errors.push(...flowValidation.errors);
      warnings.push(...flowValidation.warnings);

      return {
        isValid: errors.length === 0,
        errors: errors.filter(Boolean),
        warnings: warnings.filter(Boolean)
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
        warnings
      };
    }
  }

  /**
   * Validate players array
   * @param {Player[]} players - Players to validate
   * @returns {Object} Validation result
   */
  static validatePlayers(players) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(players)) {
      errors.push('Players must be an array');
      return { errors, warnings };
    }

    if (players.length === 0) {
      errors.push('Game must have at least one player');
      return { errors, warnings };
    }

    if (players.length > 9) {
      errors.push('Game cannot have more than 9 players');
    }

    const playerIds = new Set();
    const seatNumbers = new Set();
    let humanPlayerCount = 0;
    let activePlayerCount = 0;

    players.forEach((player, index) => {
      // Validate player structure
      if (!player || typeof player !== 'object') {
        errors.push(`Player at index ${index} is not a valid object`);
        return;
      }

      // Validate required fields
      const requiredFields = ['id', 'name', 'seat', 'chips', 'isHuman', 'isActive'];
      requiredFields.forEach(field => {
        if (player[field] === undefined || player[field] === null) {
          errors.push(`Player ${player.name || index} missing required field: ${field}`);
        }
      });

      // Validate unique IDs
      if (playerIds.has(player.id)) {
        errors.push(`Duplicate player ID: ${player.id}`);
      }
      playerIds.add(player.id);

      // Validate unique seats
      if (seatNumbers.has(player.seat)) {
        errors.push(`Duplicate seat number: ${player.seat}`);
      }
      seatNumbers.add(player.seat);

      // Validate seat range
      if (player.seat < 0 || player.seat > 8) {
        errors.push(`Invalid seat number for ${player.name}: ${player.seat}`);
      }

      // Validate chips
      if (typeof player.chips !== 'number' || player.chips < 0) {
        errors.push(`Invalid chip count for ${player.name}: ${player.chips}`);
      }

      // Validate hole cards
      if (player.holeCards && !Array.isArray(player.holeCards)) {
        errors.push(`Invalid hole cards for ${player.name}`);
      } else if (player.holeCards && player.holeCards.length > 0) {
        if (player.holeCards.length !== 2) {
          errors.push(`${player.name} must have exactly 2 hole cards, has ${player.holeCards.length}`);
        }
        
        player.holeCards.forEach((card, cardIndex) => {
          if (!isValidCard(card)) {
            errors.push(`Invalid hole card ${cardIndex} for ${player.name}`);
          }
        });
      }

      // Count player types
      if (player.isHuman) humanPlayerCount++;
      if (player.isActive) activePlayerCount++;

      // Validate current bet
      if (typeof player.currentBet !== 'number' || player.currentBet < 0) {
        errors.push(`Invalid current bet for ${player.name}: ${player.currentBet}`);
      }

      // Validate all-in status
      if (player.isAllIn && player.chips > 0) {
        warnings.push(`${player.name} is marked all-in but still has chips`);
      }
      
      if (!player.isAllIn && player.chips === 0 && player.isActive) {
        warnings.push(`${player.name} has no chips but is not marked all-in`);
      }
    });

    // Validate human player count
    if (humanPlayerCount === 0) {
      warnings.push('No human players in game');
    } else if (humanPlayerCount > 1) {
      warnings.push('Multiple human players detected');
    }

    // Validate active player count
    if (activePlayerCount < 2) {
      warnings.push('Fewer than 2 active players');
    }

    return { errors, warnings };
  }

  /**
   * Validate cards (deck, community cards, hole cards)
   * @param {GameState} gameState - Game state
   * @returns {Object} Validation result
   */
  static validateCards(gameState) {
    const errors = [];
    const warnings = [];

    // Validate community cards
    if (!Array.isArray(gameState.communityCards)) {
      errors.push('Community cards must be an array');
    } else {
      if (gameState.communityCards.length > 5) {
        errors.push(`Too many community cards: ${gameState.communityCards.length}`);
      }

      gameState.communityCards.forEach((card, index) => {
        if (!isValidCard(card)) {
          errors.push(`Invalid community card at index ${index}`);
        }
      });

      // Validate community cards match betting round
      const expectedCards = {
        [BETTING_ROUNDS.PREFLOP]: 0,
        [BETTING_ROUNDS.FLOP]: 3,
        [BETTING_ROUNDS.TURN]: 4,
        [BETTING_ROUNDS.RIVER]: 5
      };

      if (expectedCards[gameState.bettingRound] !== undefined) {
        const expected = expectedCards[gameState.bettingRound];
        if (gameState.communityCards.length !== expected) {
          errors.push(`Expected ${expected} community cards for ${gameState.bettingRound}, found ${gameState.communityCards.length}`);
        }
      }
    }

    // Validate burn cards
    if (!Array.isArray(gameState.burnCards)) {
      errors.push('Burn cards must be an array');
    } else if (gameState.burnCards.length > 4) {
      errors.push(`Too many burn cards: ${gameState.burnCards.length}`);
    }

    // Validate deck
    if (!Array.isArray(gameState.deck)) {
      errors.push('Deck must be an array');
    } else {
      gameState.deck.forEach((card, index) => {
        if (!isValidCard(card)) {
          errors.push(`Invalid deck card at index ${index}`);
        }
      });
    }

    // Validate total card count
    try {
      const totalCards = this.countAllCards(gameState);
      if (totalCards > 52) {
        errors.push(`Total cards exceed 52: ${totalCards}`);
      } else if (totalCards < 52) {
        warnings.push(`Missing cards, total: ${totalCards}`);
      }

      // Check for duplicate cards
      const allCards = this.getAllCards(gameState);
      const cardStrings = allCards.map(card => `${card.rank}${card.suit}`);
      const uniqueCards = new Set(cardStrings);
      
      if (uniqueCards.size !== allCards.length) {
        errors.push('Duplicate cards detected in game');
      }

    } catch (error) {
      warnings.push(`Card count validation failed: ${error.message}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate betting state
   * @param {GameState} gameState - Game state
   * @returns {Object} Validation result
   */
  static validateBetting(gameState) {
    const errors = [];
    const warnings = [];

    // Validate pot
    if (typeof gameState.pot !== 'number' || gameState.pot < 0) {
      errors.push(`Invalid pot size: ${gameState.pot}`);
    }

    // Validate current bet
    if (typeof gameState.currentBet !== 'number' || gameState.currentBet < 0) {
      errors.push(`Invalid current bet: ${gameState.currentBet}`);
    }

    // Validate blinds
    if (typeof gameState.smallBlind !== 'number' || gameState.smallBlind <= 0) {
      errors.push(`Invalid small blind: ${gameState.smallBlind}`);
    }

    if (typeof gameState.bigBlind !== 'number' || gameState.bigBlind <= 0) {
      errors.push(`Invalid big blind: ${gameState.bigBlind}`);
    }

    if (gameState.bigBlind <= gameState.smallBlind) {
      errors.push('Big blind must be larger than small blind');
    }

    // Validate player bets
    const activePlayers = gameState.players.filter(p => p.isActive);
    let totalPlayerBets = 0;

    activePlayers.forEach(player => {
      totalPlayerBets += player.currentBet;
      
      // Check if player bet is consistent with current bet
      if (!player.isAllIn && player.isActive && player.hasActed) {
        if (player.currentBet < gameState.currentBet && player.chips > 0) {
          warnings.push(`${player.name} current bet ${player.currentBet} is less than current bet ${gameState.currentBet}`);
        }
      }
    });

    // Validate betting round
    if (!Object.values(BETTING_ROUNDS).includes(gameState.bettingRound)) {
      errors.push(`Invalid betting round: ${gameState.bettingRound}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate game flow state
   * @param {GameState} gameState - Game state
   * @returns {Object} Validation result
   */
  static validateGameFlow(gameState) {
    const errors = [];
    const warnings = [];

    // Validate active player
    if (typeof gameState.activePlayer !== 'number') {
      errors.push(`Invalid active player index: ${gameState.activePlayer}`);
    } else {
      if (gameState.activePlayer < 0 || gameState.activePlayer >= gameState.players.length) {
        errors.push(`Active player index out of range: ${gameState.activePlayer}`);
      } else {
        const activePlayer = gameState.players[gameState.activePlayer];
        if (!activePlayer.isActive) {
          errors.push('Active player is not marked as active');
        }
        if (activePlayer.isAllIn) {
          warnings.push('Active player is all-in');
        }
      }
    }

    // Validate dealer button
    if (typeof gameState.dealerButton !== 'number') {
      errors.push(`Invalid dealer button: ${gameState.dealerButton}`);
    } else if (gameState.dealerButton < 0 || gameState.dealerButton >= gameState.players.length) {
      errors.push(`Dealer button out of range: ${gameState.dealerButton}`);
    }

    // Validate hand number
    if (typeof gameState.handNumber !== 'number' || gameState.handNumber < 1) {
      errors.push(`Invalid hand number: ${gameState.handNumber}`);
    }

    // Validate action count
    if (typeof gameState.actionCount !== 'number' || gameState.actionCount < 0) {
      errors.push(`Invalid action count: ${gameState.actionCount}`);
    }

    // Check for excessive actions (possible infinite loop)
    if (gameState.actionCount > 100) {
      warnings.push(`High action count detected: ${gameState.actionCount}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate a specific player action
   * @param {string} action - Action to validate
   * @param {number} amount - Action amount
   * @param {Player} player - Player making action
   * @param {GameState} gameState - Current game state
   * @returns {Object} Validation result
   */
  static validatePlayerAction(action, amount, player, gameState) {
    const errors = [];
    const warnings = [];

    try {
      // Check if action is valid type
      if (!Object.values(PLAYER_ACTIONS).includes(action)) {
        errors.push(`Invalid action type: ${action}`);
        return { isValid: false, errors, warnings };
      }

      // Check if player can act
      if (!player.isActive) {
        errors.push('Player is not active');
      }

      if (player.isAllIn) {
        errors.push('Player is already all-in');
      }

      // Get available actions
      const availableActions = getAvailableActions(
        player, 
        gameState.currentBet, 
        gameState.lastRaiseSize, 
        gameState.bigBlind
      );

      if (!availableActions.includes(action)) {
        errors.push(`Action ${action} not available. Available: ${availableActions.join(', ')}`);
      }

      // Validate action-specific requirements
      switch (action) {
        case PLAYER_ACTIONS.RAISE:
          const raiseValidation = this.validateRaiseAction(amount, player, gameState);
          errors.push(...raiseValidation.errors);
          warnings.push(...raiseValidation.warnings);
          break;

        case PLAYER_ACTIONS.CALL:
          const callValidation = this.validateCallAction(player, gameState);
          errors.push(...callValidation.errors);
          warnings.push(...callValidation.warnings);
          break;

        case PLAYER_ACTIONS.ALL_IN:
          const allInValidation = this.validateAllInAction(player, gameState);
          errors.push(...allInValidation.errors);
          warnings.push(...allInValidation.warnings);
          break;

        case PLAYER_ACTIONS.CHECK:
          const checkValidation = this.validateCheckAction(player, gameState);
          errors.push(...checkValidation.errors);
          warnings.push(...checkValidation.warnings);
          break;
      }

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors: errors.filter(Boolean),
      warnings: warnings.filter(Boolean)
    };
  }

  /**
   * Validate raise action
   * @param {number} amount - Raise amount
   * @param {Player} player - Player making raise
   * @param {GameState} gameState - Game state
   * @returns {Object} Validation result
   */
  static validateRaiseAction(amount, player, gameState) {
    const errors = [];
    const warnings = [];

    if (typeof amount !== 'number' || amount <= 0) {
      errors.push('Raise amount must be a positive number');
      return { errors, warnings };
    }

    const minRaiseSize = Math.max(gameState.lastRaiseSize, gameState.bigBlind);
    const minRaiseTotal = gameState.currentBet + minRaiseSize;
    const maxRaiseTotal = player.currentBet + player.chips;

    if (amount < minRaiseTotal) {
      errors.push(`Raise amount ${amount} below minimum ${minRaiseTotal}`);
    }

    if (amount > maxRaiseTotal) {
      errors.push(`Raise amount ${amount} exceeds maximum ${maxRaiseTotal}`);
    }

    const additionalAmount = amount - player.currentBet;
    if (additionalAmount > player.chips) {
      errors.push(`Insufficient chips for raise: need ${additionalAmount}, have ${player.chips}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate call action
   * @param {Player} player - Player making call
   * @param {GameState} gameState - Game state
   * @returns {Object} Validation result
   */
  static validateCallAction(player, gameState) {
    const errors = [];
    const warnings = [];

    const callAmount = gameState.currentBet - player.currentBet;
    
    if (callAmount <= 0) {
      warnings.push('No amount to call, should check instead');
    }

    if (callAmount > player.chips) {
      errors.push(`Insufficient chips to call: need ${callAmount}, have ${player.chips}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate all-in action
   * @param {Player} player - Player going all-in
   * @param {GameState} gameState - Game state
   * @returns {Object} Validation result
   */
  static validateAllInAction(player, gameState) {
    const errors = [];
    const warnings = [];

    if (player.chips <= 0) {
      errors.push('Player has no chips to go all-in');
    }

    return { errors, warnings };
  }

  /**
   * Validate check action
   * @param {Player} player - Player checking
   * @param {GameState} gameState - Game state
   * @returns {Object} Validation result
   */
  static validateCheckAction(player, gameState) {
    const errors = [];
    const warnings = [];

    if (gameState.currentBet > player.currentBet) {
      errors.push('Cannot check when there is a bet to call');
    }

    return { errors, warnings };
  }

  /**
   * Count all cards in the game
   * @param {GameState} gameState - Game state
   * @returns {number} Total card count
   */
  static countAllCards(gameState) {
    let count = 0;
    
    count += gameState.deck.length;
    count += gameState.communityCards.length;
    count += gameState.burnCards.length;
    
    gameState.players.forEach(player => {
      if (player.holeCards) {
        count += player.holeCards.length;
      }
    });
    
    return count;
  }

  /**
   * Get all cards in the game
   * @param {GameState} gameState - Game state
   * @returns {Card[]} All cards
   */
  static getAllCards(gameState) {
    const allCards = [];
    
    allCards.push(...gameState.deck);
    allCards.push(...gameState.communityCards);
    allCards.push(...gameState.burnCards);
    
    gameState.players.forEach(player => {
      if (player.holeCards) {
        allCards.push(...player.holeCards);
      }
    });
    
    return allCards;
  }

  /**
   * Quick validation for common issues
   * @param {GameState} gameState - Game state
   * @returns {boolean} True if basic validation passes
   */
  static quickValidate(gameState) {
    try {
      return (
        gameState &&
        Array.isArray(gameState.players) &&
        gameState.players.length > 0 &&
        typeof gameState.pot === 'number' &&
        gameState.pot >= 0 &&
        typeof gameState.currentBet === 'number' &&
        gameState.currentBet >= 0
      );
    } catch {
      return false;
    }
  }
}

// Convenience export functions
export const validateGameState = GameValidator.validateGameState;
export const validatePlayerAction = GameValidator.validatePlayerAction;
export const quickValidate = GameValidator.quickValidate;