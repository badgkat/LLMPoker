/**
 * Mock AI Service for poker decisions
 * Provides a mathematical decision-making engine for testing and fallback scenarios
 * Now uses 4D strategy ratings for more realistic poker behavior
 */

import { 
  AI_PERSONALITY_PROFILES, 
  calculate4DBehaviorThresholds
} from '../constants/aiConstants.js';
import { roundToChipIncrement } from '../constants/tournamentConstants.js';

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
    
    // Removed debug logging
    
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
    // Extract tournament level for chip increment calculations
    const tournamentLevelMatch = prompt.match(/Tournament Level: (\d+)/);
    const tournamentLevel = tournamentLevelMatch ? parseInt(tournamentLevelMatch[1]) : 1;
    
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
      stackSize: playerChips,
      tournamentLevel
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
    if (!holeCardsMatch) {
      console.log('No hole cards found in prompt');
      return 200; // Default weak hand
    }
    
    const holeCardsStr = holeCardsMatch[1];
    const holeCards = this.parseCards(holeCardsStr);
    
    // Extract community cards
    const communityMatch = prompt.match(/Community cards: (.+)/);
    const communityCards = communityMatch ? this.parseCards(communityMatch[1]) : [];
    
    // Use fallback evaluation
    const strength = this.evaluateHand(holeCards, communityCards);
    
    return strength;
  }

  /**
   * Parse cards from string representation
   * @param {string} cardsStr - Cards string like "A♠, K♥"
   * @returns {Array} Array of card objects
   */
  parseCards(cardsStr) {
    if (!cardsStr || cardsStr.trim() === '') return [];
    
    const cards = cardsStr.split(' ')  // Changed from ', ' to ' ' since cards are space-separated
      .map(cardStr => cardStr.trim())
      .filter(cardStr => cardStr.length >= 2)
      .map(cardStr => {
        const rank = cardStr.slice(0, -1);
        const suit = cardStr.slice(-1);
        return { rank, suit };
      });
      
    // Removed debug logging
    
    return cards;
  }

  /**
   * Evaluate hand strength
   * @param {Array} holeCards - Hole cards
   * @param {Array} communityCards - Community cards
   * @returns {number} Hand strength estimate (0-1000)
   */
  evaluateHand(holeCards, communityCards) {
    if (!holeCards || holeCards.length < 2) return 50; // Much weaker default
    
    const [card1, card2] = holeCards;
    const rank1 = this.getCardRank(card1.rank);
    const rank2 = this.getCardRank(card2.rank);
    const isPair = rank1 === rank2;
    const highCard = Math.max(rank1, rank2);
    const lowCard = Math.min(rank1, rank2);
    
    // Simple pre-flop evaluation (much more conservative)
    if (communityCards.length === 0) {
      const isSuited = card1.suit === card2.suit;
      const isConnected = Math.abs(rank1 - rank2) <= 1;
      
      if (isPair) {
        if (rank1 >= 14) return 450; // AA - reduced from 950
        if (rank1 >= 13) return 420; // KK - reduced from 900
        if (rank1 >= 12) return 390; // QQ - reduced from 850
        if (rank1 >= 11) return 360; // JJ - reduced from 800
        if (rank1 >= 10) return 330; // TT - reduced from 750
        if (rank1 >= 9) return 300; // 99 - reduced from 700
        if (rank1 >= 7) return 250; // 77-88 - reduced from 600
        return 180 + rank1 * 8; // Small pairs - much reduced
      } else {
        // High card combinations (much more conservative)
        if (highCard >= 14 && lowCard >= 13) return 380; // AK - reduced from 730
        if (highCard >= 14 && lowCard >= 12) return 340; // AQ - reduced from 690
        if (highCard >= 14 && lowCard >= 11) return 300; // AJ - reduced from 650
        if (highCard >= 14 && lowCard >= 10) return 260; // AT - reduced from 610
        if (highCard >= 13 && lowCard >= 12) return 280; // KQ - reduced from 580
        if (highCard >= 13 && lowCard >= 11) return 240; // KJ - reduced from 565
        if (highCard >= 13 && lowCard >= 10) return 200; // KT - reduced from 550
        if (highCard >= 12 && lowCard >= 11) return 220; // QJ - reduced from 460
        if (highCard >= 12 && lowCard >= 10) return 180; // QT - reduced from 450
        
        // Suited and connected bonuses (reduced)
        let bonus = 0;
        if (isSuited && isConnected && highCard >= 8) bonus += 40; // Suited connectors
        else if (isSuited && highCard >= 10) bonus += 25; // Suited cards
        else if (isConnected && highCard >= 9) bonus += 15; // Connectors
        
        // Base strength for other combinations
        if (highCard >= 12) return 120 + bonus; // High cards
        if (highCard >= 10) return 80 + bonus; // Medium cards
        return 40 + highCard * 3 + lowCard + bonus; // Weak hands
      }
    }
    
    // Post-flop evaluation (completely rewritten)
    const allCards = [...holeCards, ...communityCards];
    const ranks = allCards.map(card => this.getCardRank(card.rank));
    const suits = allCards.map(card => card.suit);
    
    // Count rank occurrences
    const rankCounts = {};
    ranks.forEach(rank => rankCounts[rank] = (rankCounts[rank] || 0) + 1);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const sortedRanks = Object.entries(rankCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([rank, count]) => ({ rank: parseInt(rank), count }));
    
    // Count suit occurrences
    const suitCounts = {};
    suits.forEach(suit => suitCounts[suit] = (suitCounts[suit] || 0) + 1);
    const maxSuitCount = Math.max(...Object.values(suitCounts));
    
    // Check for straight
    const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
    const isWheel = uniqueRanks.includes(14) && uniqueRanks.includes(2) && uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5);
    let isStraight = false;
    if (isWheel) {
      isStraight = true;
    } else {
      for (let i = 0; i <= uniqueRanks.length - 5; i++) {
        if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
          isStraight = true;
          break;
        }
      }
    }
    
    // Evaluate hand type and assign strength
    let strength = 0;
    let handType = '';
    
    // Check hand types from strongest to weakest
    if (maxSuitCount >= 5 && isStraight) {
      // Straight flush or royal flush
      const highStraightCard = isWheel ? 5 : Math.max(...uniqueRanks.slice(0, 5));
      if (highStraightCard === 14) {
        strength = 900; // Royal flush
        handType = 'Royal Flush';
      } else {
        strength = 800 + highStraightCard; // Straight flush
        handType = 'Straight Flush';
      }
    } else if (counts[0] === 4) {
      // Four of a kind
      const quadRank = sortedRanks[0].rank;
      strength = 700 + quadRank; // 714-728
      handType = 'Four of a Kind';
    } else if (counts[0] === 3 && counts[1] === 2) {
      // Full house
      const tripRank = sortedRanks[0].rank;
      const pairRank = sortedRanks[1].rank;
      strength = 600 + tripRank + (pairRank * 0.1); // 602-628
      handType = 'Full House';
    } else if (maxSuitCount >= 5) {
      // Flush
      const flushCards = ranks.filter((rank, index) => {
        const suit = suits[index];
        return suits.filter(s => s === suit).length >= 5;
      }).sort((a, b) => b - a).slice(0, 5);
      strength = 500 + flushCards[0] + (flushCards[1] * 0.1); // 502-528
      handType = 'Flush';
    } else if (isStraight) {
      // Straight
      const highStraightCard = isWheel ? 5 : Math.max(...uniqueRanks.slice(0, 5));
      strength = 400 + highStraightCard; // 405-414
      handType = 'Straight';
    } else if (counts[0] === 3) {
      // Three of a kind
      const tripRank = sortedRanks[0].rank;
      strength = 300 + tripRank; // 302-317
      handType = 'Three of a Kind';
    } else if (counts[0] === 2 && counts[1] === 2) {
      // Two pair
      const highPair = Math.max(sortedRanks[0].rank, sortedRanks[1].rank);
      const lowPair = Math.min(sortedRanks[0].rank, sortedRanks[1].rank);
      strength = 200 + highPair + (lowPair * 0.1); // 202-228
      handType = 'Two Pair';
    } else if (counts[0] === 2) {
      // One pair
      const pairRank = sortedRanks[0].rank;
      strength = 100 + pairRank; // 102-117
      handType = 'Pair';
    } else {
      // High card
      const highCardRank = Math.max(...ranks);
      const secondHigh = ranks.filter(r => r !== highCardRank).length > 0 ? 
        Math.max(...ranks.filter(r => r !== highCardRank)) : 0;
      strength = highCardRank + (secondHigh * 0.1); // 2-28
      handType = 'High Card';
    }
    
    return Math.round(strength);
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
    
    // Dynamic thresholds based on 4D strategy (adjusted for new hand strength scale)
    const foldThreshold = 40 + (tightness * 40); // 40-80 range (fold weak hands)
    const callThreshold = 60 + (tightness * 60); // 60-120 range (call decent hands)  
    const raiseThreshold = 100 + (tightness * 80) + (aggression * 100); // 100-280 range (raise good hands)
    const allInThreshold = 350 + (riskTolerance * 150); // 350-500 range (all-in premium hands)
    
    // Check if we're getting good pot odds (influenced by mathematical thinking)
    const potOddsThreshold = 1.8 + (tightness * 0.7); // 1.8-2.5 range (much more reasonable)
    const hasGoodPotOdds = potOdds >= potOddsThreshold;
    const hasGreatPotOdds = potOdds >= potOddsThreshold * 1.3;
    
    // Bluffing and semi-bluffing logic based on 4D strategy (much more aggressive)
    const positionBluffBonus = position === 'Button' ? adaptability * 0.3 : 0;
    const shouldBluff = Math.random() < (thresholds.BLUFF_FREQUENCY * 4 + positionBluffBonus) && round !== 'preflop';
    const shouldSemiBluff = Math.random() < (aggression * 0.4) && adjustedHandStrength >= 120 && round === 'flop';
    const shouldValueRaise = Math.random() < (aggression * 0.6) && adjustedHandStrength >= raiseThreshold * 0.8;
    
    // Apply risk tolerance and short stack multiplier
    const finalHandStrength = adjustedHandStrength * shortStackMultiplier;
    
    // Decision logic tree based on 4D strategy (MUCH MORE AGGRESSIVE)
    
    // All-in with premium hands
    if (finalHandStrength >= allInThreshold) {
      if (availableActions.includes('all-in')) {
        return { action: 'all-in', amount: 0, reasoning: `${this.strategyProfile.name}: Premium hand - all-in` };
      } else if (availableActions.includes('raise')) {
        const raiseAmount = this.calculateRaiseAmount(context, 'aggressive');
        return { action: 'raise', amount: raiseAmount, reasoning: `${this.strategyProfile.name}: Premium hand - big raise` };
      }
    }
    
    // Raise with good hands OR when bluffing/value raising
    if (finalHandStrength >= raiseThreshold || shouldBluff || shouldSemiBluff || shouldValueRaise) {
      if (availableActions.includes('raise')) {
        let strategy = 'value';
        let reasoning = `${this.strategyProfile.name}: Good hand - value raise`;
        
        if (shouldBluff) {
          strategy = 'bluff';
          reasoning = `${this.strategyProfile.name}: Bluffing`;
        } else if (shouldSemiBluff) {
          strategy = 'aggressive';
          reasoning = `${this.strategyProfile.name}: Semi-bluff`;
        } else if (shouldValueRaise) {
          strategy = 'aggressive';
          reasoning = `${this.strategyProfile.name}: Aggressive value raise`;
        }
        
        const raiseAmount = this.calculateRaiseAmount(context, strategy);
        return { action: 'raise', amount: raiseAmount, reasoning };
      }
    }
    
    // Call with decent hands or good pot odds (but be more careful with big bets)
    const isBigBet = callAmount > (potSize * 0.5); // Calling more than half pot is a big bet
    const isAllInCall = callAmount >= (stackSize * 0.8); // Calling 80%+ of stack
    
    // Much stricter requirements for big bets and all-in calls
    if (isBigBet || isAllInCall) {
      // Need a strong hand for big bets - ignore pot odds for very large bets
      const bigBetThreshold = callThreshold + 80; // Need stronger hand for big bets
      if (finalHandStrength >= bigBetThreshold) {
        if (availableActions.includes('call')) {
          return { action: 'call', amount: 0, reasoning: `${this.strategyProfile.name}: Strong hand vs big bet` };
        }
      }
    } else {
      // Normal bet sizing - use regular logic
      if (finalHandStrength >= callThreshold || 
          (hasGoodPotOdds && finalHandStrength >= 50) || 
          (hasGreatPotOdds && finalHandStrength >= 35)) {
        if (availableActions.includes('call')) {
          const reasoning = hasGreatPotOdds ? `${this.strategyProfile.name}: Great pot odds` : 
                           (hasGoodPotOdds ? `${this.strategyProfile.name}: Good pot odds` : 
                            `${this.strategyProfile.name}: Decent hand`);
          return { action: 'call', amount: 0, reasoning };
        } else if (availableActions.includes('check')) {
          return { action: 'check', amount: 0, reasoning: `${this.strategyProfile.name}: Decent hand - check` };
        }
      }
    }
    
    // Check with weak hands if it's free
    if (callAmount === 0 && finalHandStrength >= foldThreshold) {
      if (availableActions.includes('check')) {
        return { action: 'check', amount: 0, reasoning: `${this.strategyProfile.name}: Free card` };
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
    const { potSize, minRaise, stackSize, callAmount, tournamentLevel } = context;
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
    const maxTotalBet = Math.min(stackSize, currentGameBet + Math.floor(potSize * 1.5));
    
    // Ensure raise is within valid bounds
    let totalBetAmount = Math.max(minTotalBet, Math.min(targetTotalBet, maxTotalBet));
    
    // WSOP Rule: Round to valid chip increment
    totalBetAmount = roundToChipIncrement(totalBetAmount, tournamentLevel || 1);
    
    // Debug: Log chip increment validation for testing
    if (Math.random() < 0.1) { // Only log 10% to avoid spam
      console.log(`MockAI: Tournament level ${tournamentLevel}, rounded ${targetTotalBet} to ${totalBetAmount}`);
    }
    
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