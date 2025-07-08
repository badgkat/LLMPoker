import { AI_STRATEGIES, AI_BEHAVIOR_THRESHOLDS } from '../constants/aiConstants.js';

/**
 * @typedef {import('../store/types.js').Player} Player
 * @typedef {import('../store/types.js').GameState} GameState
 * @typedef {import('../store/types.js').AIDecision} AIDecision
 */

/**
 * Advanced AI Strategy implementations
 */
export class AIStrategies {
  
  /**
   * Aggressive strategy implementation
   * Likes to bet, raise, and bluff frequently
   * @param {Player} player - AI player
   * @param {GameState} gameState - Current game state
   * @param {string[]} availableActions - Available actions
   * @param {Object} context - Additional context
   * @returns {AIDecision}
   */
  static aggressive(player, gameState, availableActions, context) {
    const { callAmount, potOdds, position } = context;
    const thresholds = AI_BEHAVIOR_THRESHOLDS[AI_STRATEGIES.AGGRESSIVE];
    
    // Aggressive players are more likely to bet/raise
    const aggressionLevel = Math.random();
    const isLatePosition = position === 'Button' || position === 'Cutoff';
    
    // Bluff more in late position
    const bluffChance = isLatePosition ? thresholds.BLUFF_PROBABILITY * 1.5 : thresholds.BLUFF_PROBABILITY;
    
    if (aggressionLevel < thresholds.RAISE_PROBABILITY) {
      if (availableActions.includes('raise')) {
        const raiseSize = this.calculateAggressiveRaiseSize(player, gameState);
        return {
          action: 'raise',
          amount: raiseSize,
          reasoning: `Aggressive raise (${(aggressionLevel * 100).toFixed(0)}% aggression)`
        };
      }
    }
    
    // Bluffing logic
    if (Math.random() < bluffChance && gameState.bettingRound !== 'preflop') {
      if (availableActions.includes('raise')) {
        const bluffSize = this.calculateBluffSize(player, gameState);
        return {
          action: 'raise',
          amount: bluffSize,
          reasoning: 'Aggressive bluff attempt'
        };
      } else if (availableActions.includes('call') && potOdds > 2) {
        return {
          action: 'call',
          amount: callAmount,
          reasoning: 'Aggressive bluff call'
        };
      }
    }
    
    // Standard aggressive play
    if (aggressionLevel < thresholds.ACTION_THRESHOLD) {
      if (availableActions.includes('call')) {
        return {
          action: 'call',
          amount: callAmount,
          reasoning: 'Aggressive call to see more cards'
        };
      } else if (availableActions.includes('check')) {
        return {
          action: 'check',
          amount: 0,
          reasoning: 'Aggressive check to trap'
        };
      }
    }
    
    return { action: 'fold', amount: 0, reasoning: 'Even aggression has limits' };
  }

  /**
   * Tight strategy implementation
   * Only plays premium hands, very conservative
   * @param {Player} player - AI player
   * @param {GameState} gameState - Current game state
   * @param {string[]} availableActions - Available actions
   * @param {Object} context - Additional context
   * @returns {AIDecision}
   */
  static tight(player, gameState, availableActions, context) {
    const { callAmount, potOdds, stackToPot } = context;
    const thresholds = AI_BEHAVIOR_THRESHOLDS[AI_STRATEGIES.TIGHT];
    
    // Tight players require very good conditions to play
    const handQuality = this.estimateHandQuality(player.holeCards, gameState.communityCards);
    
    // Only play if hand quality is high
    if (handQuality < 0.8) {
      return { action: 'fold', amount: 0, reasoning: 'Tight fold - waiting for premium hand' };
    }
    
    // Even with good hands, be conservative
    const conservativeLevel = Math.random();
    
    if (conservativeLevel < thresholds.ACTION_THRESHOLD) {
      // Very selective about betting
      if (handQuality > 0.9 && availableActions.includes('raise')) {
        const conservativeRaise = this.calculateConservativeRaiseSize(player, gameState);
        return {
          action: 'raise',
          amount: conservativeRaise,
          reasoning: 'Tight raise with premium hand'
        };
      }
      
      // Call only with very good pot odds
      if (availableActions.includes('call') && potOdds > 4) {
        return {
          action: 'call',
          amount: callAmount,
          reasoning: 'Tight call with excellent pot odds'
        };
      }
      
      if (availableActions.includes('check')) {
        return {
          action: 'check',
          amount: 0,
          reasoning: 'Tight check to control pot size'
        };
      }
    }
    
    return { action: 'fold', amount: 0, reasoning: 'Tight fold - not strong enough' };
  }

  /**
   * Mathematical strategy implementation
   * Makes decisions based on pot odds, expected value
   * @param {Player} player - AI player
   * @param {GameState} gameState - Current game state
   * @param {string[]} availableActions - Available actions
   * @param {Object} context - Additional context
   * @returns {AIDecision}
   */
  static mathematical(player, gameState, availableActions, context) {
    const { callAmount, potOdds, stackToPot, position } = context;
    
    // Calculate expected value based on pot odds
    const handEquity = this.calculateHandEquity(player.holeCards, gameState.communityCards);
    const requiredEquity = 1 / (potOdds + 1);
    
    // Pot odds decision
    if (handEquity > requiredEquity * 1.1) { // 10% margin for safety
      if (availableActions.includes('raise') && handEquity > 0.7) {
        const mathematicalRaise = this.calculateMathematicalRaiseSize(player, gameState, handEquity);
        return {
          action: 'raise',
          amount: mathematicalRaise,
          reasoning: `Mathematical raise: ${(handEquity * 100).toFixed(1)}% equity vs ${(requiredEquity * 100).toFixed(1)}% required`
        };
      }
      
      if (availableActions.includes('call')) {
        return {
          action: 'call',
          amount: callAmount,
          reasoning: `Mathematical call: ${(handEquity * 100).toFixed(1)}% equity, ${potOdds.toFixed(1)}:1 pot odds`
        };
      }
    }
    
    // Check if we can see a free card
    if (availableActions.includes('check') && handEquity > 0.2) {
      return {
        action: 'check',
        amount: 0,
        reasoning: 'Mathematical check for free card'
      };
    }
    
    return { 
      action: 'fold', 
      amount: 0, 
      reasoning: `Mathematical fold: ${(handEquity * 100).toFixed(1)}% equity insufficient`
    };
  }

  /**
   * Positional strategy implementation
   * Adjusts play based on table position
   * @param {Player} player - AI player
   * @param {GameState} gameState - Current game state
   * @param {string[]} availableActions - Available actions
   * @param {Object} context - Additional context
   * @returns {AIDecision}
   */
  static positional(player, gameState, availableActions, context) {
    const { callAmount, potOdds, position } = context;
    
    // Position-based decision making
    const isEarlyPosition = ['Under the Gun', 'Early Position'].includes(position);
    const isLatePosition = ['Button', 'Cutoff'].includes(position);
    const isBlinds = ['Small Blind', 'Big Blind'].includes(position);
    
    const handQuality = this.estimateHandQuality(player.holeCards, gameState.communityCards);
    
    if (isEarlyPosition) {
      // Play tighter in early position
      if (handQuality < 0.75) {
        return { action: 'fold', amount: 0, reasoning: 'Positional fold - early position requires strong hand' };
      }
      
      if (availableActions.includes('call') && potOdds > 3) {
        return {
          action: 'call',
          amount: callAmount,
          reasoning: 'Early position call with premium hand'
        };
      }
    } else if (isLatePosition) {
      // Play more hands in late position
      if (handQuality > 0.4 || potOdds > 3) {
        if (availableActions.includes('raise') && Math.random() > 0.6) {
          const positionalRaise = this.calculatePositionalRaiseSize(player, gameState);
          return {
            action: 'raise',
            amount: positionalRaise,
            reasoning: 'Late position aggression'
          };
        }
        
        if (availableActions.includes('call')) {
          return {
            action: 'call',
            amount: callAmount,
            reasoning: 'Late position call with position advantage'
          };
        }
      }
    } else if (isBlinds) {
      // Defend blinds selectively
      if (position === 'Big Blind' && potOdds > 2) {
        return {
          action: 'call',
          amount: callAmount,
          reasoning: 'Big blind defense with decent pot odds'
        };
      }
    }
    
    if (availableActions.includes('check')) {
      return {
        action: 'check',
        amount: 0,
        reasoning: `Positional check from ${position}`
      };
    }
    
    return { action: 'fold', amount: 0, reasoning: 'Positional fold' };
  }

  /**
   * Calculate aggressive raise size
   * @param {Player} player - AI player
   * @param {GameState} gameState - Current game state
   * @returns {number} Raise amount
   */
  static calculateAggressiveRaiseSize(player, gameState) {
    const minRaise = gameState.currentBet + Math.max(gameState.lastRaiseSize, gameState.bigBlind);
    const potSizeRaise = gameState.pot * (0.6 + Math.random() * 0.4); // 60-100% pot
    const maxRaise = player.currentBet + player.chips;
    
    return Math.min(Math.max(minRaise, potSizeRaise), maxRaise);
  }

  /**
   * Calculate conservative raise size
   * @param {Player} player - AI player
   * @param {GameState} gameState - Current game state
   * @returns {number} Raise amount
   */
  static calculateConservativeRaiseSize(player, gameState) {
    const minRaise = gameState.currentBet + Math.max(gameState.lastRaiseSize, gameState.bigBlind);
    const conservativeRaise = gameState.pot * (0.3 + Math.random() * 0.2); // 30-50% pot
    const maxRaise = player.currentBet + player.chips;
    
    return Math.min(Math.max(minRaise, conservativeRaise), maxRaise);
  }

  /**
   * Calculate mathematical raise size based on equity
   * @param {Player} player - AI player
   * @param {GameState} gameState - Current game state
   * @param {number} handEquity - Estimated hand equity
   * @returns {number} Raise amount
   */
  static calculateMathematicalRaiseSize(player, gameState, handEquity) {
    const minRaise = gameState.currentBet + Math.max(gameState.lastRaiseSize, gameState.bigBlind);
    const equityBasedRaise = gameState.pot * handEquity; // Raise proportional to equity
    const maxRaise = player.currentBet + player.chips;
    
    return Math.min(Math.max(minRaise, equityBasedRaise), maxRaise);
  }

  /**
   * Calculate positional raise size
   * @param {Player} player - AI player
   * @param {GameState} gameState - Current game state
   * @returns {number} Raise amount
   */
  static calculatePositionalRaiseSize(player, gameState) {
    const minRaise = gameState.currentBet + Math.max(gameState.lastRaiseSize, gameState.bigBlind);
    const positionalRaise = gameState.pot * (0.4 + Math.random() * 0.3); // 40-70% pot
    const maxRaise = player.currentBet + player.chips;
    
    return Math.min(Math.max(minRaise, positionalRaise), maxRaise);
  }

  /**
   * Calculate bluff size
   * @param {Player} player - AI player
   * @param {GameState} gameState - Current game state
   * @returns {number} Bluff amount
   */
  static calculateBluffSize(player, gameState) {
    const minRaise = gameState.currentBet + Math.max(gameState.lastRaiseSize, gameState.bigBlind);
    const bluffSize = gameState.pot * (0.7 + Math.random() * 0.5); // 70-120% pot for bluffs
    const maxRaise = player.currentBet + player.chips;
    
    return Math.min(Math.max(minRaise, bluffSize), maxRaise);
  }

  /**
   * Estimate hand quality (simplified)
   * @param {Array} holeCards - Player's hole cards
   * @param {Array} communityCards - Community cards
   * @returns {number} Hand quality between 0 and 1
   */
  static estimateHandQuality(holeCards, communityCards) {
    // This is a simplified hand evaluation
    // In a real implementation, you'd want proper hand ranking
    
    if (!holeCards || holeCards.length !== 2) return 0.1;
    
    let quality = 0.1; // Base quality
    
    // Pocket pairs
    if (holeCards[0].rank === holeCards[1].rank) {
      quality += 0.4;
      // High pocket pairs
      if (holeCards[0].value >= 10) quality += 0.3;
    }
    
    // High cards
    const avgValue = (holeCards[0].value + holeCards[1].value) / 2;
    if (avgValue >= 12) quality += 0.3;
    else if (avgValue >= 10) quality += 0.2;
    
    // Suited cards
    if (holeCards[0].suit === holeCards[1].suit) {
      quality += 0.1;
    }
    
    // Connected cards
    if (Math.abs(holeCards[0].value - holeCards[1].value) === 1) {
      quality += 0.1;
    }
    
    return Math.min(quality, 1);
  }

  /**
   * Calculate hand equity (simplified)
   * @param {Array} holeCards - Player's hole cards
   * @param {Array} communityCards - Community cards
   * @returns {number} Estimated equity between 0 and 1
   */
  static calculateHandEquity(holeCards, communityCards) {
    // Simplified equity calculation
    // In practice, you'd run Monte Carlo simulations
    
    const handQuality = this.estimateHandQuality(holeCards, communityCards);
    const cardsRemaining = 5 - communityCards.length;
    
    // Adjust equity based on betting round
    let equity = handQuality;
    
    // More uncertainty early in hand
    if (cardsRemaining > 2) {
      equity *= 0.8; // Reduce confidence early
    }
    
    // Add some randomness for uncertainty
    equity += (Math.random() - 0.5) * 0.2;
    
    return Math.max(0, Math.min(1, equity));
  }

  /**
   * Get strategy function by name
   * @param {string} strategyName - Name of strategy
   * @returns {Function} Strategy function
   */
  static getStrategy(strategyName) {
    switch (strategyName) {
      case AI_STRATEGIES.AGGRESSIVE:
        return this.aggressive;
      case AI_STRATEGIES.TIGHT:
        return this.tight;
      case AI_STRATEGIES.MATHEMATICAL:
        return this.mathematical;
      case AI_STRATEGIES.POSITIONAL:
        return this.positional;
      default:
        return this.mathematical; // Default to mathematical
    }
  }
}