/**
 * Mock AI Service for poker decisions
 * Provides a mathematical decision-making engine for testing and fallback scenarios
 * Now uses 4D strategy ratings for more realistic poker behavior
 */

import { 
  AI_PERSONALITY_PROFILES, 
  calculate4DBehaviorThresholds
} from '../constants/aiConstants.js';

/**
 * @typedef {Object} MockAIResponse
 * @property {string} action - The poker action to take
 * @property {number} amount - The amount for raises/bets
 * @property {string} reasoning - The AI's reasoning for the decision
 */

export class MockAIService {
  constructor(strategyProfile = null) {
    // Use provided strategy or default to TAG profile
    this.strategyProfile = strategyProfile || AI_PERSONALITY_PROFILES.TAG;
    
    // Calculate behavior thresholds from 4D strategy
    this.behaviorThresholds = calculate4DBehaviorThresholds(this.strategyProfile);
    
    // Legacy compatibility
    this.config = {
      aggression: this.strategyProfile.aggression,
      bluffFrequency: this.behaviorThresholds.BLUFF_FREQUENCY,
      positionAwareness: this.strategyProfile.adaptability > 0.5,
      mathBased: true
    };
  }

  /**
   * Get AI decision for poker action
   * @param {string} prompt - The formatted prompt containing game state
   * @returns {Promise<MockAIResponse>}
   */
  async getAIDecision(prompt) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Extract game context from prompt
    const gameContext = this.extractGameContext(prompt);
    
    // Get hand strength evaluation
    const handStrength = this.evaluateHandFromPrompt(prompt);
    
    // Make decision based on mathematical decision tree
    const decision = this.makeMathematicalDecision(gameContext, handStrength);
    
    return decision;
  }

  /**
   * Extract game context from prompt
   * @param {string} prompt - The prompt containing game state
   * @returns {Object} Game context information
   */
  extractGameContext(prompt) {
    // Extract available actions
    const availableActionsMatch = prompt.match(/Available actions: (.+)/);
    let availableActions = ['fold', 'call']; // default fallback
    
    if (availableActionsMatch) {
      availableActions = availableActionsMatch[1].split(', ').map(action => action.trim());
    }
    
    // Extract numeric values (handle commas)
    const callAmountMatch = prompt.match(/Current bet to call: ([\d,]+)/);
    const potSizeMatch = prompt.match(/Pot size: ([\d,]+)/);
    const playerChipsMatch = prompt.match(/Your chips: ([\d,]+)/);
    const minRaiseMatch = prompt.match(/minimum raise to ([\d,]+)/);
    const totalPlayersMatch = prompt.match(/(\d+) players/);
    const positionMatch = prompt.match(/Position: (\w+)/);
    const roundMatch = prompt.match(/Round: (\w+)/);
    
    // Parse numbers, removing commas
    const callAmount = callAmountMatch ? parseInt(callAmountMatch[1].replace(/,/g, '')) : 0;
    const potSize = potSizeMatch ? parseInt(potSizeMatch[1].replace(/,/g, '')) : 1000;
    const playerChips = playerChipsMatch ? parseInt(playerChipsMatch[1].replace(/,/g, '')) : 5000;
    const minRaise = minRaiseMatch ? parseInt(minRaiseMatch[1].replace(/,/g, '')) : Math.max(callAmount + 100, 200);
    
    // Calculate pot odds
    const potOdds = callAmount > 0 ? (potSize + callAmount) / callAmount : Infinity;
    
    // Determine betting round
    let round = 'preflop';
    if (roundMatch) {
      round = roundMatch[1].toLowerCase();
    } else if (prompt.includes('Community cards:')) {
      const communityMatch = prompt.match(/Community cards: (.+)/);
      if (communityMatch) {
        const communityCards = communityMatch[1].split(', ').filter(card => card.trim() !== '');
        if (communityCards.length === 3) round = 'flop';
        else if (communityCards.length === 4) round = 'turn';
        else if (communityCards.length === 5) round = 'river';
      }
    }
    
    return {
      availableActions,
      callAmount,
      potSize,
      playerChips,
      minRaise,
      potOdds,
      totalPlayers: totalPlayersMatch ? parseInt(totalPlayersMatch[1]) : 6,
      position: positionMatch ? positionMatch[1] : 'unknown',
      round,
      stackSize: playerChips
    };
  }

  /**
   * Evaluate hand strength from prompt information
   * @param {string} prompt - The prompt containing hand information
   * @returns {number} Hand strength (0-1000)
   */
  evaluateHandFromPrompt(prompt) {
    // Extract hole cards
    const holeCardsMatch = prompt.match(/Your hole cards: (.+)/);
    if (!holeCardsMatch) return 200; // Default weak hand
    
    const holeCardsStr = holeCardsMatch[1];
    const holeCards = this.parseCards(holeCardsStr);
    
    // Extract community cards
    const communityMatch = prompt.match(/Community cards: (.+)/);
    const communityCards = communityMatch ? this.parseCards(communityMatch[1]) : [];
    
    // Use fallback evaluation
    return this.evaluateHand(holeCards, communityCards);
  }

  /**
   * Parse cards from string representation
   * @param {string} cardsStr - Cards string like "A♠, K♥"
   * @returns {Array} Array of card objects
   */
  parseCards(cardsStr) {
    if (!cardsStr || cardsStr.trim() === '') return [];
    
    return cardsStr.split(', ')
      .map(cardStr => cardStr.trim())
      .filter(cardStr => cardStr.length >= 2)
      .map(cardStr => {
        const rank = cardStr.slice(0, -1);
        const suit = cardStr.slice(-1);
        return { rank, suit };
      });
  }

  /**
   * Evaluate hand strength
   * @param {Array} holeCards - Hole cards
   * @param {Array} communityCards - Community cards
   * @returns {number} Hand strength estimate (0-1000)
   */
  evaluateHand(holeCards, communityCards) {
    if (!holeCards || holeCards.length < 2) return 200;
    
    const [card1, card2] = holeCards;
    const rank1 = this.getCardRank(card1.rank);
    const rank2 = this.getCardRank(card2.rank);
    const isPair = rank1 === rank2;
    const highCard = Math.max(rank1, rank2);
    
    // Simple pre-flop evaluation
    if (communityCards.length === 0) {
      const isSuited = card1.suit === card2.suit;
      const isConnected = Math.abs(rank1 - rank2) <= 1;
      
      if (isPair) {
        if (rank1 >= 14) return 950; // AA
        if (rank1 >= 13) return 900; // KK
        if (rank1 >= 12) return 850; // QQ
        if (rank1 >= 11) return 800; // JJ
        if (rank1 >= 10) return 750; // TT
        if (rank1 >= 9) return 700; // 99
        if (rank1 >= 7) return 600; // 77-88
        return 500 + rank1 * 15; // Small pairs
      } else {
        // High card combinations
        if (highCard >= 14 && rank2 >= 10) return 650 + (rank2 - 10) * 20; // AK, AQ, AJ, AT
        if (highCard >= 13 && rank2 >= 10) return 550 + (rank2 - 10) * 15; // KQ, KJ, KT
        if (highCard >= 12 && rank2 >= 10) return 450 + (rank2 - 10) * 10; // QJ, QT
        if (isSuited && isConnected && highCard >= 8) return 400 + highCard * 10; // Suited connectors
        if (isSuited && highCard >= 10) return 350 + highCard * 8; // Suited cards
        if (isConnected && highCard >= 9) return 300 + highCard * 5; // Connectors
        if (highCard >= 12) return 250 + highCard * 8; // High cards
        return 150 + highCard * 5 + rank2 * 2; // Weak hands
      }
    }
    
    // Post-flop evaluation
    let strength = 300; // Base strength
    
    // Check for potential pairs, draws, etc.
    const allCards = [...holeCards, ...communityCards];
    const ranks = allCards.map(card => this.getCardRank(card.rank));
    const suits = allCards.map(card => card.suit);
    
    // Basic pair detection
    const rankCounts = {};
    ranks.forEach(rank => rankCounts[rank] = (rankCounts[rank] || 0) + 1);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    
    if (counts[0] >= 2) strength += 200; // Pair or better
    if (counts[0] >= 3) strength += 300; // Three of a kind or better
    if (counts[0] >= 4) strength += 400; // Four of a kind
    
    // Basic flush draw detection
    const suitCounts = {};
    suits.forEach(suit => suitCounts[suit] = (suitCounts[suit] || 0) + 1);
    const maxSuitCount = Math.max(...Object.values(suitCounts));
    if (maxSuitCount >= 4) strength += 50; // Flush draw
    if (maxSuitCount >= 5) strength += 200; // Flush
    
    return Math.min(900, strength);
  }

  /**
   * Get numeric rank for card
   * @param {string} rank - Card rank (A, K, Q, J, 10, 9, etc.)
   * @returns {number} Numeric rank
   */
  getCardRank(rank) {
    if (rank === 'A') return 14;
    if (rank === 'K') return 13;
    if (rank === 'Q') return 12;
    if (rank === 'J') return 11;
    return parseInt(rank);
  }

  /**
   * Make mathematical decision based on game context and hand strength
   * Now uses 4D strategy ratings for more realistic decision making
   * @param {Object} context - Game context
   * @param {number} handStrength - Hand strength (0-1000)
   * @returns {MockAIResponse} Decision object
   */
  makeMathematicalDecision(context, handStrength) {
    const { availableActions, callAmount, potSize, potOdds, position, round, stackSize } = context;
    const { tightness, aggression, adaptability, riskTolerance } = this.strategyProfile;
    const thresholds = this.behaviorThresholds;
    
    // Position multipliers based on adaptability (more adaptable = more position aware)
    const positionMultiplier = this.getPositionMultiplier(position);
    const positionAdjustment = 1 + (adaptability * (positionMultiplier - 1));
    const adjustedHandStrength = handStrength * positionAdjustment;
    
    // Stack size considerations influenced by risk tolerance
    const stackRatio = stackSize / potSize;
    const isShortStack = stackRatio < 10;
    const shortStackMultiplier = isShortStack ? (1 + riskTolerance * 0.3) : 1;
    
    // Dynamic thresholds based on 4D strategy (more reasonable values)
    const foldThreshold = 150 + (tightness * 100); // 150-250 range
    const callThreshold = 200 + (tightness * 150); // 200-350 range  
    const raiseThreshold = 400 - (tightness * 100) + (aggression * 200); // 300-600 range
    const allInThreshold = 700 - (tightness * 200) + (riskTolerance * 200); // 500-900 range
    
    // Check if we're getting good pot odds (influenced by mathematical thinking)
    const mathWeight = 1 - (adaptability * 0.3); // Less adaptable = more math-focused
    const potOddsThreshold = 1.8 + (tightness * 0.7); // 1.8-2.5 range (much more reasonable)
    const hasGoodPotOdds = potOdds >= potOddsThreshold;
    const hasGreatPotOdds = potOdds >= potOddsThreshold * 1.3;
    
    // Bluffing and semi-bluffing logic based on 4D strategy (increased frequency)
    const positionBluffBonus = position === 'Button' ? adaptability * 0.2 : 0;
    const shouldBluff = Math.random() < (thresholds.BLUFF_FREQUENCY * 2 + positionBluffBonus) && round !== 'preflop';
    const shouldSemiBluff = Math.random() < (aggression * 0.25) && adjustedHandStrength >= 150 && round === 'flop';
    
    // Apply risk tolerance and short stack multiplier
    const finalHandStrength = adjustedHandStrength * shortStackMultiplier;
    
    // Decision logic tree based on 4D strategy
    if (finalHandStrength >= allInThreshold || (isShortStack && finalHandStrength >= raiseThreshold && riskTolerance > 0.6)) {
      // Very strong hand or short stack with good hand (risk tolerance affects short stack play)
      if (availableActions.includes('all-in')) {
        return { action: 'all-in', amount: 0, reasoning: `${this.strategyProfile.name}: Very strong hand - all-in` };
      } else if (availableActions.includes('raise')) {
        const raiseAmount = this.calculateRaiseAmount(context, 'aggressive');
        return { action: 'raise', amount: raiseAmount, reasoning: `${this.strategyProfile.name}: Strong hand - aggressive raise` };
      } else if (availableActions.includes('call')) {
        return { action: 'call', amount: 0, reasoning: `${this.strategyProfile.name}: Strong hand - call` };
      }
    } else if (finalHandStrength >= raiseThreshold || shouldBluff || shouldSemiBluff) {
      // Strong hand, bluff, or semi-bluff (frequency based on aggression)
      if (availableActions.includes('raise')) {
        const strategy = shouldBluff ? 'bluff' : (shouldSemiBluff ? 'aggressive' : 'value');
        const raiseAmount = this.calculateRaiseAmount(context, strategy);
        const reasoning = shouldBluff ? `${this.strategyProfile.name}: Position bluff` : 
                         (shouldSemiBluff ? `${this.strategyProfile.name}: Semi-bluff with draws` : 
                          `${this.strategyProfile.name}: Strong hand - value raise`);
        return { action: 'raise', amount: raiseAmount, reasoning };
      } else if (availableActions.includes('call')) {
        return { action: 'call', amount: 0, reasoning: `${this.strategyProfile.name}: Strong hand - call` };
      }
    } else if (finalHandStrength >= callThreshold || 
               (hasGoodPotOdds && finalHandStrength >= 150) || 
               hasGreatPotOdds) {
      // Decent hand, good pot odds, or great pot odds (tightness affects threshold)
      if (availableActions.includes('call')) {
        const reasoning = hasGreatPotOdds ? `${this.strategyProfile.name}: Great pot odds - call` : 
                         (hasGoodPotOdds ? `${this.strategyProfile.name}: Good pot odds - call` : 
                          `${this.strategyProfile.name}: Decent hand - call`);
        return { action: 'call', amount: 0, reasoning };
      } else if (availableActions.includes('check')) {
        return { action: 'check', amount: 0, reasoning: `${this.strategyProfile.name}: Decent hand - check` };
      }
    } else if (finalHandStrength >= foldThreshold && callAmount === 0) {
      // Weak hand but free to see more cards (tightness affects willingness to see free cards)
      if (availableActions.includes('check') && tightness < 0.8) {
        return { action: 'check', amount: 0, reasoning: `${this.strategyProfile.name}: Weak hand - check for free card` };
      }
    }
    
    // Default to fold
    if (availableActions.includes('fold')) {
      return { action: 'fold', amount: 0, reasoning: `${this.strategyProfile.name}: Weak hand - fold` };
    }
    
    // Emergency fallback
    return { action: availableActions[0], amount: 0, reasoning: `${this.strategyProfile.name}: Emergency fallback decision` };
  }

  /**
   * Get position multiplier for hand strength
   * @param {string} position - Player position
   * @returns {number} Multiplier (0.8 to 1.2)
   */
  getPositionMultiplier(position) {
    if (!this.config.positionAwareness) return 1.0;
    
    switch (position.toLowerCase()) {
      case 'button': return 1.15;
      case 'cutoff': return 1.05;
      case 'small blind': return 0.95;
      case 'big blind': return 1.0;
      case 'under the gun': return 0.85;
      default: return 0.95;
    }
  }

  /**
   * Calculate raise amount based on context and strategy
   * Now uses 4D strategy ratings for bet sizing
   * @param {Object} context - Game context
   * @param {string} strategy - 'value', 'aggressive', 'bluff'
   * @returns {number} Raise amount
   */
  calculateRaiseAmount(context, strategy = 'value') {
    const { potSize, minRaise, playerChips, callAmount } = context;
    const currentGameBet = callAmount;
    const { aggression, riskTolerance } = this.strategyProfile;
    const { BETTING_SIZE_MULTIPLIER } = this.behaviorThresholds;
    
    let baseMultiplier;
    switch (strategy) {
      case 'aggressive':
        baseMultiplier = 0.8 + Math.random() * 0.4; // 80-120% pot
        break;
      case 'value':
        baseMultiplier = 0.5 + Math.random() * 0.3; // 50-80% pot
        break;
      case 'bluff':
        baseMultiplier = 0.6 + Math.random() * 0.2; // 60-80% pot
        break;
      default:
        baseMultiplier = 0.6; // 60% pot
    }
    
    // Adjust multiplier based on 4D strategy
    const aggressionBonus = aggression * 0.3; // Up to 30% more aggressive sizing
    const riskBonus = riskTolerance * 0.2; // Up to 20% more variance in sizing
    const finalMultiplier = baseMultiplier * BETTING_SIZE_MULTIPLIER * (1 + aggressionBonus + riskBonus);
    
    const targetTotalBet = currentGameBet + Math.floor(potSize * finalMultiplier);
    const minTotalBet = currentGameBet + Math.max(minRaise, 200);
    const maxTotalBet = Math.min(playerChips, currentGameBet + Math.floor(potSize * 1.5));
    
    // Ensure raise is within valid bounds (return total bet amount, not just the raise)
    const totalBetAmount = Math.max(minTotalBet, Math.min(targetTotalBet, maxTotalBet));
    return totalBetAmount;
  }

  /**
   * Update AI strategy profile
   * @param {Object} newProfile - New 4D strategy profile
   */
  updateStrategyProfile(newProfile) {
    this.strategyProfile = { ...this.strategyProfile, ...newProfile };
    this.behaviorThresholds = calculate4DBehaviorThresholds(this.strategyProfile);
    
    // Update legacy config for backward compatibility
    this.config = {
      aggression: this.strategyProfile.aggression,
      bluffFrequency: this.behaviorThresholds.BLUFF_FREQUENCY,
      positionAwareness: this.strategyProfile.adaptability > 0.5,
      mathBased: true
    };
  }

  /**
   * Update AI configuration (legacy method)
   * @param {Object} newConfig - New configuration values
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Try to map legacy config back to 4D strategy
    if (newConfig.aggression !== undefined) {
      this.strategyProfile.aggression = newConfig.aggression;
    }
    if (newConfig.bluffFrequency !== undefined) {
      // Approximate mapping from bluff frequency to aggression/risk
      this.strategyProfile.aggression = Math.max(0, Math.min(1, newConfig.bluffFrequency * 3));
      this.strategyProfile.riskTolerance = Math.max(0, Math.min(1, newConfig.bluffFrequency * 2));
    }
    
    // Recalculate behavior thresholds
    this.behaviorThresholds = calculate4DBehaviorThresholds(this.strategyProfile);
  }

  /**
   * Get current 4D strategy profile
   * @returns {Object} Current strategy profile with behavior thresholds
   */
  getStrategyProfile() {
    return {
      profile: { ...this.strategyProfile },
      behaviorThresholds: { ...this.behaviorThresholds }
    };
  }

  /**
   * Get current configuration (legacy method)
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Get a readable description of the current strategy
   * @returns {string} Strategy description
   */
  getStrategyDescription() {
    const { tightness, aggression, adaptability, riskTolerance, name, description } = this.strategyProfile;
    
    return `${name} (${description})
Tightness: ${(tightness * 100).toFixed(0)}% (${tightness > 0.7 ? 'Very Tight' : tightness > 0.5 ? 'Tight' : tightness > 0.3 ? 'Loose' : 'Very Loose'})
Aggression: ${(aggression * 100).toFixed(0)}% (${aggression > 0.7 ? 'Very Aggressive' : aggression > 0.5 ? 'Aggressive' : aggression > 0.3 ? 'Passive' : 'Very Passive'})
Adaptability: ${(adaptability * 100).toFixed(0)}% (${adaptability > 0.7 ? 'Highly Adaptable' : adaptability > 0.5 ? 'Adaptable' : adaptability > 0.3 ? 'Consistent' : 'Very Consistent'})
Risk Tolerance: ${(riskTolerance * 100).toFixed(0)}% (${riskTolerance > 0.7 ? 'High Risk' : riskTolerance > 0.5 ? 'Medium Risk' : riskTolerance > 0.3 ? 'Low Risk' : 'Risk Averse'})`;
  }
}

// Export singleton instance
export const mockAIService = new MockAIService();