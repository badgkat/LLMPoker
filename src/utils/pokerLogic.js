import { PLAYER_ACTIONS } from '../constants/gameConstants.js';

/**
 * @typedef {import('../store/types.js').Player} Player
 * @typedef {import('../store/types.js').Card} Card
 * @typedef {import('../store/types.js').HandEvaluation} HandEvaluation
 */

/**
 * Evaluate a poker hand strength for AI decision making
 * @param {Card[]} holeCards - Player's hole cards
 * @param {Card[]} communityCards - Community cards
 * @returns {HandEvaluation} Hand evaluation result
 */
export const evaluateHand = (holeCards, communityCards) => {
  if (!holeCards || holeCards.length !== 2) {
    return { strength: 0, description: "Invalid Hand", cards: [] };
  }

  const allCards = [...holeCards, ...communityCards];
  
  // Pre-flop hand strength evaluation
  if (communityCards.length === 0) {
    return evaluatePreFlopHand(holeCards);
  }
  
  // Post-flop hand strength evaluation
  return evaluatePostFlopHand(allCards, holeCards);
};

/**
 * Evaluate pre-flop hand strength
 * @param {Card[]} holeCards - Player's hole cards
 * @returns {HandEvaluation} Hand evaluation result
 */
const evaluatePreFlopHand = (holeCards) => {
  const [card1, card2] = holeCards;
  const rank1 = getCardRank(card1);
  const rank2 = getCardRank(card2);
  const suit1 = card1.suit;
  const suit2 = card2.suit;
  
  const isPair = rank1 === rank2;
  const isSuited = suit1 === suit2;
  const isConnected = Math.abs(rank1 - rank2) === 1;
  const highCard = Math.max(rank1, rank2);
  const lowCard = Math.min(rank1, rank2);
  
  let strength = 0;
  let description = "High Card";
  
  // Premium pairs
  if (isPair) {
    if (rank1 >= 14) { // Aces
      strength = 950;
      description = "Pocket Aces";
    } else if (rank1 >= 13) { // Kings
      strength = 900;
      description = "Pocket Kings";
    } else if (rank1 >= 12) { // Queens
      strength = 850;
      description = "Pocket Queens";
    } else if (rank1 >= 11) { // Jacks
      strength = 800;
      description = "Pocket Jacks";
    } else if (rank1 >= 10) { // Tens
      strength = 750;
      description = "Pocket Tens";
    } else if (rank1 >= 9) { // Nines
      strength = 700;
      description = "Pocket Nines";
    } else if (rank1 >= 7) { // Sevens and Eights
      strength = 600 + (rank1 - 7) * 25;
      description = `Pocket ${getCardName(rank1)}s`;
    } else { // Small pairs
      strength = 500 + rank1 * 10;
      description = `Pocket ${getCardName(rank1)}s`;
    }
  } else {
    // High card combinations
    if (highCard === 14 && lowCard >= 10) { // Ace with high card
      strength = 700 + (lowCard - 10) * 20;
      description = `Ace ${getCardName(lowCard)}${isSuited ? ' suited' : ''}`;
    } else if (highCard === 13 && lowCard >= 10) { // King with high card
      strength = 600 + (lowCard - 10) * 15;
      description = `King ${getCardName(lowCard)}${isSuited ? ' suited' : ''}`;
    } else if (highCard === 12 && lowCard >= 10) { // Queen with high card
      strength = 550 + (lowCard - 10) * 15;
      description = `Queen ${getCardName(lowCard)}${isSuited ? ' suited' : ''}`;
    } else if (highCard >= 11 && lowCard >= 10) { // Jack-Ten
      strength = 500;
      description = `Jack ${getCardName(lowCard)}${isSuited ? ' suited' : ''}`;
    } else if (isSuited && isConnected && highCard >= 7) { // Suited connectors
      strength = 400 + highCard * 10;
      description = `${getCardName(lowCard)}-${getCardName(highCard)} suited`;
    } else if (isConnected && highCard >= 9) { // Offsuit connectors
      strength = 300 + highCard * 5;
      description = `${getCardName(lowCard)}-${getCardName(highCard)} offsuit`;
    } else if (isSuited && highCard >= 10) { // Suited cards
      strength = 350 + highCard * 5;
      description = `${getCardName(lowCard)}-${getCardName(highCard)} suited`;
    } else if (highCard >= 12) { // High card
      strength = 200 + highCard * 10;
      description = `${getCardName(highCard)} high`;
    } else {
      // Weak hands
      strength = 100 + highCard * 5 + lowCard * 2;
      description = `${getCardName(highCard)}-${getCardName(lowCard)} offsuit`;
    }
  }
  
  // Bonus for suited
  if (isSuited && !isPair) {
    strength += 25;
  }
  
  return {
    strength: Math.max(0, Math.min(1000, strength)),
    description,
    cards: [...holeCards]
  };
};

/**
 * Evaluate post-flop hand strength (simplified)
 * @param {Card[]} allCards - All available cards
 * @param {Card[]} holeCards - Player's hole cards
 * @returns {HandEvaluation} Hand evaluation result
 */
const evaluatePostFlopHand = (allCards, holeCards) => {
  // Get detailed hand analysis
  const detailedRank = getDetailedHandRank(allCards);
  
  // Calculate hand strength based on rank and specifics
  let strength = 0;
  let description = "High Card";
  
  if (detailedRank.isStraightFlush) {
    strength = 990 + detailedRank.highCard * 2;
    if (detailedRank.highCard === 14) {
      description = "Royal Flush";
    } else {
      description = `Straight Flush, ${getCardName(detailedRank.highCard)} high`;
    }
  } else if (detailedRank.isFourOfAKind) {
    strength = 950 + detailedRank.quads * 5;
    description = `Four of a Kind, ${getCardName(detailedRank.quads)}s`;
  } else if (detailedRank.isFullHouse) {
    strength = 900 + detailedRank.trips * 5 + detailedRank.pair;
    description = `Full House, ${getCardName(detailedRank.trips)}s over ${getCardName(detailedRank.pair)}s`;
  } else if (detailedRank.isFlush) {
    strength = 850 + detailedRank.highCard * 5;
    description = `Flush, ${getCardName(detailedRank.highCard)} high`;
  } else if (detailedRank.isStraight) {
    strength = 800 + detailedRank.highCard * 5;
    if (detailedRank.highCard === 5) {
      description = "Straight, Five high (wheel)";
    } else {
      description = `Straight, ${getCardName(detailedRank.highCard)} high`;
    }
  } else if (detailedRank.isThreeOfAKind) {
    strength = 700 + detailedRank.trips * 10;
    
    // Add kicker values for tie-breaking
    if (detailedRank.kickers && detailedRank.kickers.length > 0) {
      for (let i = 0; i < Math.min(detailedRank.kickers.length, 2); i++) {
        strength += (detailedRank.kickers[i] / 15) * (3 - i); // Scale down to prevent overlap
      }
    }
    
    description = `Three of a Kind, ${getCardName(detailedRank.trips)}s`;
  } else if (detailedRank.isTwoPair) {
    strength = 500 + detailedRank.highPair * 5 + detailedRank.lowPair * 2;
    
    // Add kicker value for tie-breaking
    if (detailedRank.kicker) {
      strength += (detailedRank.kicker / 15) * 2; // Scale down to prevent overlap
    }
    
    description = `Two Pair, ${getCardName(detailedRank.highPair)}s over ${getCardName(detailedRank.lowPair)}s`;
    if (detailedRank.kicker) {
      description += ` with ${getCardName(detailedRank.kicker)} kicker`;
    }
  } else if (detailedRank.isPair) {
    // Base strength for pair, plus kickers for tie-breaking
    strength = 300 + detailedRank.pair * 10;
    
    // Add kicker values to ensure different strengths for different kickers
    if (detailedRank.kickers && detailedRank.kickers.length > 0) {
      // First kicker much more important than subsequent kickers
      for (let i = 0; i < Math.min(detailedRank.kickers.length, 3); i++) {
        const kickerWeight = i === 0 ? 9 : (i === 1 ? 2 : 0.5);
        strength += (detailedRank.kickers[i] / 15) * kickerWeight;
      }
    }
    
    description = `Pair of ${getCardName(detailedRank.pair)}s`;
    if (detailedRank.kickers && detailedRank.kickers.length > 0) {
      description += ` with ${getCardName(detailedRank.kickers[0])} kicker`;
    }
  } else {
    // High card hand
    strength = 100 + detailedRank.highCard * 5;
    
    // Add kicker values for tie-breaking - first kicker much more important
    if (detailedRank.kickers && detailedRank.kickers.length > 0) {
      for (let i = 0; i < Math.min(detailedRank.kickers.length, 4); i++) {
        // First kicker worth up to 5 points, subsequent kickers much less
        const kickerWeight = i === 0 ? 5 : (0.5 / (i + 1));
        strength += (detailedRank.kickers[i] / 15) * kickerWeight;
      }
    }
    
    description = `${getCardName(detailedRank.highCard)} high`;
    if (detailedRank.kickers && detailedRank.kickers.length > 0) {
      description += `, ${getCardName(detailedRank.kickers[0])} kicker`;
    }
  }
  
  // Add draw potential (simplified)
  const drawPotential = calculateDrawPotential(allCards);
  strength += drawPotential;
  
  return {
    strength: Math.max(0, Math.min(1000, strength)),
    description,
    cards: [...holeCards],
    rank: detailedRank
  };
};

/**
 * Convert card rank to numeric value
 * @param {Card} card - Card object
 * @returns {number} Numeric rank (2-14)
 */
const getCardRank = (card) => {
  const rank = card.rank;
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return parseInt(rank);
};

/**
 * Get card name from rank
 * @param {number} rank - Numeric rank
 * @returns {string} Card name
 */
const getCardName = (rank) => {
  if (rank === 14) return 'Ace';
  if (rank === 13) return 'King';
  if (rank === 12) return 'Queen';
  if (rank === 11) return 'Jack';
  return rank.toString();
};

/**
 * Simple hand ranking detection
 * @param {Card[]} cards - All cards
 * @returns {Object} Hand rank information
 */
const getSimpleHandRank = (cards) => {
  const ranks = cards.map(getCardRank);
  const suits = cards.map(card => card.suit);
  
  // Count occurrences
  const rankCounts = {};
  ranks.forEach(rank => {
    rankCounts[rank] = (rankCounts[rank] || 0) + 1;
  });
  
  const suitCounts = {};
  suits.forEach(suit => {
    suitCounts[suit] = (suitCounts[suit] || 0) + 1;
  });
  
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const maxSuit = Math.max(...Object.values(suitCounts));
  const highCard = Math.max(...ranks);
  
  // Check for straight (simplified)
  const sortedRanks = [...new Set(ranks)].sort((a, b) => b - a);
  const isStraight = sortedRanks.length >= 5 && 
    sortedRanks.slice(0, 5).every((rank, i) => i === 0 || rank === sortedRanks[i-1] - 1);
  
  return {
    isPair: counts[0] === 2,
    isTwoPair: counts[0] === 2 && counts[1] === 2,
    isThreeOfAKind: counts[0] === 3,
    isStraight,
    isFlush: maxSuit >= 5,
    isFullHouse: counts[0] === 3 && counts[1] === 2,
    isFourOfAKind: counts[0] === 4,
    isStraightFlush: isStraight && maxSuit >= 5,
    highCard
  };
};

/**
 * Get detailed hand ranking with specific cards and kickers
 * @param {Card[]} cards - All cards
 * @returns {Object} Detailed hand rank information
 */
const getDetailedHandRank = (cards) => {
  const ranks = cards.map(getCardRank);
  const suits = cards.map(card => card.suit);
  
  // Count occurrences of each rank
  const rankCounts = {};
  ranks.forEach(rank => {
    rankCounts[rank] = (rankCounts[rank] || 0) + 1;
  });
  
  // Count occurrences of each suit
  const suitCounts = {};
  suits.forEach(suit => {
    suitCounts[suit] = (suitCounts[suit] || 0) + 1;
  });
  
  // Get ranks sorted by count, then by rank value
  const ranksByCount = Object.entries(rankCounts)
    .map(([rank, count]) => ({ rank: parseInt(rank), count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
  
  const highCard = Math.max(...ranks);
  const maxSuitCount = Math.max(...Object.values(suitCounts));
  const isFlush = maxSuitCount >= 5;
  
  // Check for straight
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
  let isStraight = false;
  let straightHigh = 0;
  
  // Check for regular straight
  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    const testRanks = uniqueRanks.slice(i, i + 5);
    if (testRanks.every((rank, idx) => idx === 0 || rank === testRanks[idx - 1] - 1)) {
      isStraight = true;
      straightHigh = testRanks[0];
      break;
    }
  }
  
  // Check for wheel (A-2-3-4-5)
  if (!isStraight && uniqueRanks.includes(14) && uniqueRanks.includes(2) && 
      uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
    isStraight = true;
    straightHigh = 5; // Five-high straight
  }
  
  const isStraightFlush = isStraight && isFlush;
  
  // Determine hand type and extract specific information
  const counts = ranksByCount.map(r => r.count);
  let result = {
    highCard: isStraight ? straightHigh : highCard,
    kickers: []
  };
  
  if (isStraightFlush) {
    result.isStraightFlush = true;
  } else if (counts[0] === 4) {
    result.isFourOfAKind = true;
    result.quads = ranksByCount[0].rank;
    result.kicker = ranksByCount[1]?.rank;
  } else if (counts[0] === 3 && counts[1] === 2) {
    result.isFullHouse = true;
    result.trips = ranksByCount[0].rank;
    result.pair = ranksByCount[1].rank;
  } else if (isFlush) {
    result.isFlush = true;
    // Get flush cards and find highest
    const flushSuit = Object.entries(suitCounts).find(([suit, count]) => count >= 5)[0];
    const flushCards = cards.filter(card => card.suit === flushSuit)
      .map(card => getCardRank(card))
      .sort((a, b) => b - a);
    result.highCard = flushCards[0];
    result.kickers = flushCards.slice(1, 5);
  } else if (isStraight) {
    result.isStraight = true;
  } else if (counts[0] === 3) {
    result.isThreeOfAKind = true;
    result.trips = ranksByCount[0].rank;
    // Get kickers sorted by rank (highest first) for proper tie-breaking
    result.kickers = ranksByCount.slice(1)
      .map(r => r.rank)
      .sort((a, b) => b - a)
      .slice(0, 2);
  } else if (counts[0] === 2 && counts[1] === 2) {
    result.isTwoPair = true;
    result.highPair = ranksByCount[0].rank;
    result.lowPair = ranksByCount[1].rank;
    result.kicker = ranksByCount[2]?.rank;
  } else if (counts[0] === 2) {
    result.isPair = true;
    result.pair = ranksByCount[0].rank;
    // Get kickers sorted by rank (highest first) for proper tie-breaking
    result.kickers = ranksByCount.slice(1)
      .map(r => r.rank)
      .sort((a, b) => b - a)
      .slice(0, 3);
  } else {
    // High card
    result.kickers = uniqueRanks.slice(1, 5);
  }
  
  return result;
};

/**
 * Calculate draw potential (simplified)
 * @param {Card[]} allCards - All cards
 * @param {Card[]} holeCards - Player's hole cards
 * @returns {number} Draw potential bonus
 */
const calculateDrawPotential = (allCards) => {
  if (allCards.length < 5) return 0; // Need at least flop
  
  const ranks = allCards.map(getCardRank);
  const suits = allCards.map(card => card.suit);
  
  // Flush draw potential
  const suitCounts = {};
  suits.forEach(suit => {
    suitCounts[suit] = (suitCounts[suit] || 0) + 1;
  });
  
  const maxSuitCount = Math.max(...Object.values(suitCounts));
  let drawBonus = 0;
  
  if (maxSuitCount === 4) {
    drawBonus += 50; // Flush draw
  }
  
  // Straight draw potential (simplified)
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b);
  for (let i = 0; i < uniqueRanks.length - 3; i++) {
    const sequence = uniqueRanks.slice(i, i + 4);
    if (sequence.every((rank, j) => j === 0 || rank === sequence[j-1] + 1)) {
      drawBonus += 30; // Open-ended straight draw
      break;
    }
  }
  
  return drawBonus;
};

/**
 * Calculate side pots for all-in situations
 * @param {Player[]} players - Array of players
 * @param {number} mainPot - Main pot amount
 * @returns {Array} Array of side pot objects
 */
export const calculateSidePots = (players, mainPot) => {
  const activePlayers = players.filter(p => p.isActive);
  const allInPlayers = activePlayers.filter(p => p.isAllIn);
  
  if (allInPlayers.length === 0) {
    return [{ amount: mainPot, eligiblePlayers: activePlayers.map(p => p.id) }];
  }

  // Sort by total contribution across the entire hand
  const sortedPlayers = [...activePlayers].sort((a, b) => a.totalContribution - b.totalContribution);
  const pots = [];
  let previousContribution = 0;

  sortedPlayers.forEach((player, index) => {
    const contributionLevel = player.totalContribution;
    if (contributionLevel > previousContribution) {
      const potAmount = (contributionLevel - previousContribution) * (sortedPlayers.length - index);
      const eligiblePlayers = sortedPlayers.slice(index).map(p => p.id);
      
      pots.push({
        amount: potAmount,
        eligiblePlayers: eligiblePlayers
      });
      
      previousContribution = contributionLevel;
    }
  });

  return pots;
};

/**
 * Check if a betting round is complete
 * @param {Player[]} players - Array of players
 * @param {number} currentBet - Current bet amount
 * @returns {boolean} True if betting round is complete
 */
export const isBettingRoundComplete = (players, currentBet) => {
  const activePlayers = players.filter(p => p.isActive);
  
  // If only one or no active players, round is complete
  if (activePlayers.length <= 1) return true;
  
  // Find players who can still make decisions (not all-in)
  const playersWhoCanAct = activePlayers.filter(p => !p.isAllIn);
  
  // If everyone is all-in, round is complete
  if (playersWhoCanAct.length === 0) return true;
  
  // If only one player can act and they've matched the current bet, round is complete
  if (playersWhoCanAct.length === 1) {
    const lastPlayer = playersWhoCanAct[0];
    return lastPlayer.hasActed && lastPlayer.currentBet === currentBet;
  }
  
  // For multiple players who can act:
  // 1. All must have acted
  // 2. All active players must have matching bets (or be all-in)
  const allActed = playersWhoCanAct.every(p => p.hasActed);
  const allMatchedBet = activePlayers.every(p => p.currentBet === currentBet || p.isAllIn);
  
  return allActed && allMatchedBet;
};

/**
 * Get the next active player index
 * @param {Player[]} players - Array of players
 * @param {number} currentPlayerIndex - Current player index
 * @returns {number} Next player index or -1 if no valid next player
 */
export const getNextActivePlayer = (players, currentPlayerIndex) => {
  const activePlayers = players.filter(p => p.isActive);
  
  // If no active players or only one, return -1
  if (activePlayers.length <= 1) return -1;
  
  // Find players who can still act (active and not all-in)
  const playersWhoCanAct = activePlayers.filter(p => !p.isAllIn);
  
  // If no one can act, return -1 to advance to next phase
  if (playersWhoCanAct.length === 0) return -1;
  
  // Find the next player in sequence who can act
  let nextIndex = (currentPlayerIndex + 1) % players.length;
  let attempts = 0;
  
  while (attempts < players.length) {
    const player = players[nextIndex];
    if (player && player.isActive && !player.isAllIn) {
      return nextIndex;
    }
    nextIndex = (nextIndex + 1) % players.length;
    attempts++;
  }
  
  return -1; // No valid next player - should advance to next phase
};

/**
 * Get the first player to act post-flop
 * @param {Player[]} players - Array of players
 * @param {number} dealerButton - Dealer button position
 * @returns {number} First player index or -1 if no valid player
 */
export const getFirstToActPostFlop = (players, dealerButton) => {
  // If all players are all-in, return -1 to skip to next phase
  const playersWhoCanAct = players.filter(p => p.isActive && !p.isAllIn);
  if (playersWhoCanAct.length === 0) return -1;
  
  // Find first active player who can act, starting from left of dealer
  for (let i = 1; i < players.length; i++) {
    const playerIndex = (dealerButton + i) % players.length;
    if (players[playerIndex].isActive && !players[playerIndex].isAllIn) {
      return playerIndex;
    }
  }
  return -1;
};

/**
 * Get available actions for a player (WSOP compliant)
 * @param {Player} player - Player to check
 * @param {number} currentBet - Current bet amount
 * @param {number} lastRaiseSize - Last raise size
 * @param {number} bigBlind - Big blind amount
 * @param {Object} gameState - Full game state for incomplete raise checking
 * @returns {string[]} Array of available actions
 */
export const getAvailableActions = (player, currentBet, lastRaiseSize, bigBlind, gameState = null) => {
  if (!player || !player.isActive || player.isAllIn) return [];
  
  const actions = [];
  const callAmount = currentBet - player.currentBet;
  
  // Check or Call
  if (callAmount === 0) {
    actions.push(PLAYER_ACTIONS.CHECK);
  } else if (callAmount <= player.chips && callAmount > 0) {
    actions.push(PLAYER_ACTIONS.CALL);
  }
  
  // Always can fold (unless already checked)
  if (callAmount > 0) {
    actions.push(PLAYER_ACTIONS.FOLD);
  }
  
  // WSOP Rule: Check for incomplete raise restrictions
  let canRaise = true;
  if (gameState?.lastIncompleteRaise && player.hasActed) {
    // If an incomplete raise occurred and this player already acted, they cannot re-raise
    canRaise = false;
  }
  
  // Raise logic (only if WSOP rules allow)
  if (canRaise) {
    const minRaiseSize = Math.max(lastRaiseSize, bigBlind);
    const minRaiseTotal = currentBet + minRaiseSize;
    const additionalForFullRaise = minRaiseTotal - player.currentBet;
    
    // Can raise if player has enough chips for a full minimum raise
    if (player.chips >= additionalForFullRaise) {
      actions.push(PLAYER_ACTIONS.RAISE);
    }
  }
  
  // All-in (if player has chips) - always allowed regardless of incomplete raise
  if (player.chips > 0) {
    actions.push(PLAYER_ACTIONS.ALL_IN);
  }
  
  return actions;
};

/**
 * Validate a player action
 * @param {string} action - Action to validate
 * @param {number} amount - Amount for the action
 * @param {Player} player - Player making the action
 * @param {number} currentBet - Current bet amount
 * @param {number} lastRaiseSize - Last raise size
 * @param {number} bigBlind - Big blind amount
 * @param {Object} gameState - Full game state for WSOP compliance
 * @returns {boolean} True if action is valid
 */
export const validatePlayerAction = (action, amount, player, currentBet, lastRaiseSize, bigBlind, gameState = null) => {
  const availableActions = getAvailableActions(player, currentBet, lastRaiseSize, bigBlind, gameState);
  
  if (!availableActions.includes(action)) {
    return false;
  }
  
  // Additional validation for raise amounts
  if (action === PLAYER_ACTIONS.RAISE) {
    const minRaiseSize = Math.max(lastRaiseSize, bigBlind);
    const minRaiseTotal = currentBet + minRaiseSize;
    const maxRaiseTotal = player.currentBet + player.chips;
    
    return amount >= minRaiseTotal && amount <= maxRaiseTotal;
  }
  
  return true;
};

/**
 * Calculate pot odds for a player
 * @param {number} callAmount - Amount needed to call
 * @param {number} potSize - Current pot size
 * @returns {number} Pot odds ratio
 */
export const calculatePotOdds = (callAmount, potSize) => {
  if (callAmount === 0) return Infinity;
  return potSize / callAmount;
};

/**
 * Calculate position relative to dealer
 * @param {number} seatIndex - Player's seat index
 * @param {number} dealerButton - Dealer button position
 * @param {number} totalPlayers - Total number of players
 * @returns {string} Position name
 */
export const getPositionName = (seatIndex, dealerButton, totalPlayers) => {
  const position = (seatIndex - dealerButton + totalPlayers) % totalPlayers;
  
  switch (position) {
    case 0: return 'Button';
    case 1: return 'Small Blind';
    case 2: return 'Big Blind';
    case 3: return 'Under the Gun';
    case totalPlayers - 1: return 'Cutoff';
    default: return `Position ${position}`;
  }
};