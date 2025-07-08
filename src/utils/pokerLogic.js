import { PLAYER_ACTIONS } from '../constants/gameConstants.js';

/**
 * @typedef {import('../store/types.js').Player} Player
 * @typedef {import('../store/types.js').Card} Card
 * @typedef {import('../store/types.js').HandEvaluation} HandEvaluation
 */

/**
 * Evaluate a poker hand (simplified version)
 * @param {Card[]} holeCards - Player's hole cards
 * @param {Card[]} communityCards - Community cards
 * @returns {HandEvaluation} Hand evaluation result
 */
export const evaluateHand = (holeCards, communityCards) => {
  // This is a placeholder - in a real implementation, you'd want proper hand evaluation
  // For now, just return a random strength with the actual cards
  return {
    strength: Math.random() * 1000,
    description: "High Card", // Placeholder
    cards: [...holeCards]
  };
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

  // Sort by total contribution (currentBet)
  const sortedPlayers = [...activePlayers].sort((a, b) => a.currentBet - b.currentBet);
  const pots = [];
  let previousBet = 0;

  sortedPlayers.forEach((player, index) => {
    const betLevel = player.currentBet;
    if (betLevel > previousBet) {
      const potContribution = (betLevel - previousBet) * (sortedPlayers.length - index);
      const eligiblePlayers = sortedPlayers.slice(index).map(p => p.id);
      
      pots.push({
        amount: potContribution,
        eligiblePlayers: eligiblePlayers
      });
      
      previousBet = betLevel;
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
 * Get available actions for a player
 * @param {Player} player - Player to check
 * @param {number} currentBet - Current bet amount
 * @param {number} lastRaiseSize - Last raise size
 * @param {number} bigBlind - Big blind amount
 * @returns {string[]} Array of available actions
 */
export const getAvailableActions = (player, currentBet, lastRaiseSize, bigBlind) => {
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
  
  // Raise logic
  const minRaiseSize = Math.max(lastRaiseSize, bigBlind);
  const minRaiseTotal = currentBet + minRaiseSize;
  const additionalForFullRaise = minRaiseTotal - player.currentBet;
  
  // Can raise if player has enough chips for a full minimum raise
  if (player.chips >= additionalForFullRaise) {
    actions.push(PLAYER_ACTIONS.RAISE);
  }
  
  // All-in (if player has chips)
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
 * @returns {boolean} True if action is valid
 */
export const validatePlayerAction = (action, amount, player, currentBet, lastRaiseSize, bigBlind) => {
  const availableActions = getAvailableActions(player, currentBet, lastRaiseSize, bigBlind);
  
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