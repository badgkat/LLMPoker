import { AI_STRATEGIES, AI_STRATEGY_DESCRIPTIONS } from '../constants/aiConstants.js';
import { getAvailableActions } from '../utils/pokerLogic.js';
import { formatCards } from '../utils/deckUtils.js';
import { llmService } from '../services/llmService.js';

/**
 * @typedef {import('../store/types.js').Player} Player
 * @typedef {import('../store/types.js').AIDecision} AIDecision
 * @typedef {import('../store/types.js').GameState} GameState
 */

/**
 * Main AI Engine for making poker decisions
 */
export class AIEngine {
  constructor() {
    this.memories = new Map();
  }

  /**
   * Get AI decision for a player
   * @param {Player} player - AI player making decision
   * @param {GameState} gameState - Current game state
   * @param {Object} gameContext - Additional game context
   * @returns {Promise<AIDecision>} AI decision
   */
  async getAIDecision(player, gameState, gameContext) {
    try {
      // Try LLM service first if available
      if (this.isLLMAvailable()) {
        return await this.getLLMAIDecision(player, gameState, gameContext);
      }
      
      // Fall back to rule-based AI
      return this.getFallbackAIDecision(player, gameState);
    } catch (error) {
      console.error('AI decision error:', error);
      return this.getEmergencyDecision(player, gameState);
    }
  }

  /**
   * Check if LLM service is available
   * @returns {boolean}
   */
  isLLMAvailable() {
    return llmService && llmService.initialized;
  }

  /**
   * Get AI decision using LLM service
   * @param {Player} player - AI player
   * @param {GameState} gameState - Current game state
   * @param {Object} gameContext - Game context
   * @returns {Promise<AIDecision>}
   */
  async getLLMAIDecision(player, gameState, gameContext) {
    const strategy = AI_STRATEGY_DESCRIPTIONS[player.actualStrategy || player.strategy];
    const memory = this.memories.get(player.id) || [];
    const availableActions = getAvailableActions(
      player, 
      gameState.currentBet, 
      gameState.lastRaiseSize, 
      gameState.bigBlind
    );

    const prompt = this.buildLLMPrompt(
      player, 
      gameState, 
      gameContext, 
      strategy, 
      memory, 
      availableActions
    );

    const response = await llmService.getAIDecision(prompt);
    const decision = {
      action: response.action,
      amount: response.amount,
      reasoning: response.reasoning
    };
    
    // Validate decision
    if (!availableActions.includes(decision.action)) {
      throw new Error(`Invalid action: ${decision.action}`);
    }
    
    // Store this decision in memory
    this.addToMemory(player.id, {
      hand: gameState.handNumber,
      action: decision.action,
      amount: decision.amount,
      reasoning: decision.reasoning,
      gameContext: {
        bettingRound: gameState.bettingRound,
        pot: gameState.pot,
        players: gameState.players.length
      }
    });
    
    return decision;
  }

  /**
   * Build prompt for LLM AI
   * @param {Player} player - AI player
   * @param {GameState} gameState - Current game state
   * @param {Object} gameContext - Game context
   * @param {string} strategy - Strategy description
   * @param {Array} memory - Player memory
   * @param {string[]} availableActions - Available actions
   * @returns {string} Formatted prompt
   */
  buildLLMPrompt(player, gameState, gameContext, strategy, memory, availableActions) {
    return `${strategy}

Current game situation:
- Your hole cards: ${formatCards(player.holeCards)}
- Community cards: ${formatCards(gameState.communityCards)}
- Cards burned this hand: ${gameState.burnCards.length} (face down, unknown)
- Your chips: ${player.chips.toLocaleString()}
- Current bet to call: ${(gameState.currentBet - player.currentBet).toLocaleString()}
- Pot size: ${gameState.pot.toLocaleString()}
- Betting round: ${gameState.bettingRound}
- Hand number: ${gameState.handNumber}
- Your position: ${this.getPositionDescription(player, gameState)}

Recent opponent actions this hand:
${gameContext.recentActions.map(a => `${a.playerName}: ${a.action} ${a.amount || ''}`).join('\n')}

Your memory of opponents from previous hands:
${memory.slice(-20).map(m => `Hand ${m.hand} - ${m.action} ${m.amount || ''} (${m.reasoning})`).join('\n')}

Pot odds: ${this.calculatePotOdds(gameState.currentBet - player.currentBet, gameState.pot)}
Stack to pot ratio: ${this.calculateStackToPotRatio(player.chips, gameState.pot)}

Available actions: ${availableActions.join(', ')}

Note: Burn cards are face down and unknown. Base your decisions on visible cards only.

Respond with a JSON object:
{
  "action": "fold|check|call|raise|all-in",
  "amount": number (only for raise),
  "reasoning": "brief explanation of your decision"
}

Your entire response must be valid JSON only.`;
  }

  /**
   * Get fallback AI decision using rule-based logic
   * @param {Player} player - AI player
   * @param {GameState} gameState - Current game state
   * @returns {AIDecision}
   */
  getFallbackAIDecision(player, gameState) {
    const availableActions = getAvailableActions(
      player, 
      gameState.currentBet, 
      gameState.lastRaiseSize, 
      gameState.bigBlind
    );
    
    const callAmount = gameState.currentBet - player.currentBet;
    const strategy = player.actualStrategy || player.strategy;
    
    let decision = { action: 'fold', amount: 0, reasoning: 'Default fold' };
    
    // Import strategy-specific logic
    switch (strategy) {
      case AI_STRATEGIES.AGGRESSIVE:
        decision = this.getAggressiveDecision(player, gameState, availableActions, callAmount);
        break;
        
      case AI_STRATEGIES.TIGHT:
        decision = this.getTightDecision(player, gameState, availableActions, callAmount);
        break;
        
      case AI_STRATEGIES.MATHEMATICAL:
        decision = this.getMathematicalDecision(player, gameState, availableActions, callAmount);
        break;
        
      case AI_STRATEGIES.RANDOM:
        decision = this.getRandomDecision(availableActions, callAmount, gameState);
        break;
        
      default:
        decision = this.getBalancedDecision(player, gameState, availableActions, callAmount);
        break;
    }
    
    // Ensure decision is valid
    if (!availableActions.includes(decision.action)) {
      decision = this.getEmergencyDecision(player, gameState);
    }
    
    return decision;
  }

  /**
   * Get aggressive strategy decision
   * @param {Player} player - AI player
   * @param {GameState} gameState - Current game state
   * @param {string[]} availableActions - Available actions
   * @param {number} callAmount - Amount to call
   * @returns {AIDecision}
   */
  getAggressiveDecision(player, gameState, availableActions, callAmount) {
    const aggressionFactor = Math.random();
    
    if (aggressionFactor > 0.4) { // 60% chance to be aggressive
      if (availableActions.includes('raise') && Math.random() > 0.3) {
        const minRaise = gameState.currentBet + Math.max(gameState.lastRaiseSize, gameState.bigBlind);
        const raiseAmount = Math.min(minRaise * (1 + Math.random()), player.currentBet + player.chips);
        return {
          action: 'raise',
          amount: raiseAmount,
          reasoning: 'Aggressive raise to apply pressure'
        };
      } else if (availableActions.includes('call')) {
        return {
          action: 'call',
          amount: callAmount,
          reasoning: 'Aggressive call to see more cards'
        };
      }
    }
    
    return { action: 'fold', amount: 0, reasoning: 'Not aggressive enough to continue' };
  }

  /**
   * Get tight strategy decision
   * @param {Player} player - AI player
   * @param {GameState} gameState - Current game state
   * @param {string[]} availableActions - Available actions
   * @param {number} callAmount - Amount to call
   * @returns {AIDecision}
   */
  getTightDecision(player, gameState, availableActions, callAmount) {
    const tightness = Math.random();
    
    if (tightness > 0.85) { // Only 15% chance to play
      if (availableActions.includes('call') && callAmount <= player.chips * 0.05) {
        return {
          action: 'call',
          amount: callAmount,
          reasoning: 'Small call with premium hand'
        };
      } else if (availableActions.includes('check')) {
        return {
          action: 'check',
          amount: 0,
          reasoning: 'Free card with tight play'
        };
      }
    }
    
    return { action: 'fold', amount: 0, reasoning: 'Tight fold waiting for premium hand' };
  }

  /**
   * Get mathematical strategy decision
   * @param {Player} player - AI player
   * @param {GameState} gameState - Current game state
   * @param {string[]} availableActions - Available actions
   * @param {number} callAmount - Amount to call
   * @returns {AIDecision}
   */
  getMathematicalDecision(player, gameState, availableActions, callAmount) {
    const potOdds = this.calculatePotOdds(callAmount, gameState.pot);
    const stackToPot = this.calculateStackToPotRatio(player.chips, gameState.pot);
    
    // Simple mathematical approach based on pot odds
    if (potOdds > 3 && callAmount <= player.chips * 0.1) {
      if (availableActions.includes('call')) {
        return {
          action: 'call',
          amount: callAmount,
          reasoning: `Good pot odds: ${potOdds.toFixed(1)}:1`
        };
      }
    } else if (availableActions.includes('check')) {
      return {
        action: 'check',
        amount: 0,
        reasoning: 'Free card with mathematical approach'
      };
    }
    
    return { action: 'fold', amount: 0, reasoning: 'Poor pot odds, mathematical fold' };
  }

  /**
   * Get random strategy decision
   * @param {string[]} availableActions - Available actions
   * @param {number} callAmount - Amount to call
   * @param {GameState} gameState - Current game state
   * @returns {AIDecision}
   */
  getRandomDecision(availableActions, callAmount, gameState) {
    const randomAction = availableActions[Math.floor(Math.random() * availableActions.length)];
    
    if (randomAction === 'raise') {
      const minRaise = gameState.currentBet + Math.max(gameState.lastRaiseSize, gameState.bigBlind);
      return {
        action: randomAction,
        amount: minRaise,
        reasoning: 'Random aggressive play'
      };
    }
    
    return {
      action: randomAction,
      amount: randomAction === 'call' ? callAmount : 0,
      reasoning: 'Random decision'
    };
  }

  /**
   * Get balanced strategy decision
   * @param {Player} player - AI player
   * @param {GameState} gameState - Current game state
   * @param {string[]} availableActions - Available actions
   * @param {number} callAmount - Amount to call
   * @returns {AIDecision}
   */
  getBalancedDecision(player, gameState, availableActions, callAmount) {
    const randomFactor = Math.random();
    
    if (randomFactor > 0.6) { // 40% chance to play
      if (availableActions.includes('call')) {
        return {
          action: 'call',
          amount: callAmount,
          reasoning: 'Balanced call'
        };
      } else if (availableActions.includes('check')) {
        return {
          action: 'check',
          amount: 0,
          reasoning: 'Balanced check'
        };
      }
    }
    
    return { action: 'fold', amount: 0, reasoning: 'Balanced fold' };
  }

  /**
   * Emergency decision when all else fails
   * @param {Player} player - AI player
   * @param {GameState} gameState - Current game state
   * @returns {AIDecision}
   */
  getEmergencyDecision(player, gameState) {
    const availableActions = getAvailableActions(
      player, 
      gameState.currentBet, 
      gameState.lastRaiseSize, 
      gameState.bigBlind
    );
    
    if (availableActions.includes('check')) {
      return { action: 'check', amount: 0, reasoning: 'Emergency check' };
    }
    
    return { action: 'fold', amount: 0, reasoning: 'Emergency fold' };
  }

  /**
   * Add decision to AI memory
   * @param {number} playerId - Player ID
   * @param {Object} memoryEntry - Memory entry to add
   */
  addToMemory(playerId, memoryEntry) {
    if (!this.memories.has(playerId)) {
      this.memories.set(playerId, []);
    }
    
    const playerMemory = this.memories.get(playerId);
    playerMemory.push(memoryEntry);
    
    // Keep only last 100 memories per player
    if (playerMemory.length > 100) {
      playerMemory.splice(0, playerMemory.length - 100);
    }
  }

  /**
   * Get player's memory
   * @param {number} playerId - Player ID
   * @returns {Array} Player's memory
   */
  getMemory(playerId) {
    return this.memories.get(playerId) || [];
  }

  /**
   * Calculate pot odds
   * @param {number} callAmount - Amount to call
   * @param {number} potSize - Current pot size
   * @returns {number} Pot odds ratio
   */
  calculatePotOdds(callAmount, potSize) {
    if (callAmount === 0) return Infinity;
    return potSize / callAmount;
  }

  /**
   * Calculate stack to pot ratio
   * @param {number} stackSize - Player's stack size
   * @param {number} potSize - Current pot size
   * @returns {number} Stack to pot ratio
   */
  calculateStackToPotRatio(stackSize, potSize) {
    if (potSize === 0) return Infinity;
    return stackSize / potSize;
  }

  /**
   * Get position description for player
   * @param {Player} player - Player
   * @param {GameState} gameState - Game state
   * @returns {string} Position description
   */
  getPositionDescription(player, gameState) {
    const totalPlayers = gameState.players.filter(p => p.isActive).length;
    const position = (player.seat - gameState.dealerButton + totalPlayers) % totalPlayers;
    
    switch (position) {
      case 0: return 'Button (Dealer)';
      case 1: return 'Small Blind';
      case 2: return 'Big Blind';
      case 3: return 'Under the Gun';
      case totalPlayers - 1: return 'Cutoff';
      default: return `Middle Position (${position})`;
    }
  }

  /**
   * Clear all AI memories
   */
  clearMemories() {
    this.memories.clear();
  }

  /**
   * Get memory stats
   * @returns {Object} Memory statistics
   */
  getMemoryStats() {
    const stats = {};
    this.memories.forEach((memory, playerId) => {
      stats[playerId] = {
        totalMemories: memory.length,
        recentDecisions: memory.slice(-10).map(m => ({
          hand: m.hand,
          action: m.action,
          reasoning: m.reasoning
        }))
      };
    });
    return stats;
  }
}

// Export singleton instance
export const aiEngine = new AIEngine();