/**
 * @typedef {Object} Card
 * @property {string} suit - The suit of the card (♠, ♥, ♦, ♣)
 * @property {string} rank - The rank of the card (2-10, J, Q, K, A)
 * @property {number} value - The numeric value of the card (2-14)
 */

/**
 * @typedef {Object} Player
 * @property {number} id - Unique player identifier
 * @property {string} name - Player's name
 * @property {number} seat - Seat position (0-8)
 * @property {number} chips - Current chip count
 * @property {Card[]} holeCards - Player's hole cards
 * @property {boolean} isHuman - Whether this is a human player
 * @property {boolean} isActive - Whether player is still in the hand
 * @property {number} currentBet - Current bet amount for this round
 * @property {number} totalContribution - Total amount contributed to pot this hand
 * @property {boolean} hasActed - Whether player has acted this round
 * @property {boolean} isAllIn - Whether player is all-in
 * @property {string} strategy - AI strategy type
 * @property {string} actualStrategy - Resolved AI strategy
 */

/**
 * @typedef {Object} GameState
 * @property {string} phase - Current game phase
 * @property {Player[]} players - Array of all players
 * @property {Card[]} deck - Remaining cards in deck
 * @property {Card[]} burnCards - Cards that have been burned
 * @property {Card[]} communityCards - Community cards on the table
 * @property {number} pot - Current pot size
 * @property {Object[]} sidePots - Side pots for all-in situations
 * @property {number} currentBet - Current bet to call
 * @property {number} lastRaiseSize - Size of the last raise
 * @property {number} dealerButton - Position of dealer button
 * @property {number} smallBlind - Small blind amount
 * @property {number} bigBlind - Big blind amount
 * @property {number} activePlayer - Index of current active player
 * @property {number} handNumber - Current hand number
 * @property {string} bettingRound - Current betting round
 * @property {Object} lastAction - Last action taken
 * @property {boolean} processingPhase - Whether game is processing
 * @property {boolean} showingSummary - Whether showing hand summary
 * @property {number} actionCount - Number of actions in current round
 */

/**
 * @typedef {Object} PlayerSetup
 * @property {Object} humanPlayer - Human player configuration
 * @property {Object[]} aiPlayers - AI player configurations
 */

/**
 * @typedef {Object} GameLog
 * @property {Object[]} currentHand - Log entries for current hand
 * @property {Object[]} handHistory - History of completed hands
 * @property {Set} expandedHands - Set of expanded hand numbers
 */

/**
 * @typedef {Object} HandSummary
 * @property {number} handNumber - Hand number
 * @property {Card[]} communityCards - Community cards shown
 * @property {Player[]} showdownPlayers - Players that went to showdown
 * @property {Object[]} winners - Winners of the hand
 * @property {Object[]} sidePots - Side pots information
 * @property {number} totalPot - Total pot amount
 * @property {string} endType - How the hand ended (showdown/fold)
 */

/**
 * @typedef {Object} AIDecision
 * @property {string} action - Action to take
 * @property {number} amount - Amount for raise/bet
 * @property {string} reasoning - AI's reasoning for the decision
 */

/**
 * @typedef {Object} HandEvaluation
 * @property {number} strength - Numeric strength of the hand
 * @property {string} description - Description of the hand
 * @property {Card[]} cards - Cards that make up the hand
 */

export {};