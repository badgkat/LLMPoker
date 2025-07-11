import { createDeck, dealCards, burnCard } from './deckUtils.js';
import { 
  calculateSidePots, 
  isBettingRoundComplete, 
  getNextActivePlayer, 
  getFirstToActPostFlop,
  evaluateHand 
} from './pokerLogic.js';
import { 
  GAME_PHASES, 
  BETTING_ROUNDS, 
  DEFAULT_SETTINGS, 
  PLAYER_ACTIONS 
} from '../constants/gameConstants.js';
import { AI_STRATEGIES, AI_PERSONALITY_PROFILES } from '../constants/aiConstants.js';

/**
 * @typedef {import('../store/types.js').GameState} GameState
 * @typedef {import('../store/types.js').Player} Player
 * @typedef {import('../store/types.js').PlayerSetup} PlayerSetup
 */

/**
 * Core Game Engine for managing poker game flow
 */
export class GameEngine {
  constructor() {
    this.eventListeners = new Map();
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  /**
   * Initialize a new game
   * @param {PlayerSetup} playerSetup - Player setup configuration
   * @returns {GameState} Initial game state
   */
  initializeGame(playerSetup) {
    
    // Strict validation - no fallbacks that hide errors
    if (!playerSetup) {
      throw new Error('INITIALIZATION ERROR: playerSetup is null or undefined');
    }
    
    if (!playerSetup.humanPlayer) {
      throw new Error('INITIALIZATION ERROR: humanPlayer is missing from playerSetup');
    }
    
    if (!playerSetup.humanPlayer.name || typeof playerSetup.humanPlayer.name !== 'string') {
      throw new Error('INITIALIZATION ERROR: humanPlayer.name is invalid or missing');
    }
    
    if (!playerSetup.aiPlayers || !Array.isArray(playerSetup.aiPlayers)) {
      throw new Error('INITIALIZATION ERROR: aiPlayers is not an array');
    }
    
    if (playerSetup.aiPlayers.length === 0) {
      throw new Error('INITIALIZATION ERROR: aiPlayers array is empty');
    }
    
    // Validate each AI player
    playerSetup.aiPlayers.forEach((ai, index) => {
      if (!ai || typeof ai !== 'object') {
        throw new Error(`INITIALIZATION ERROR: AI player ${index} is invalid`);
      }
      if (!ai.name || typeof ai.name !== 'string') {
        throw new Error(`INITIALIZATION ERROR: AI player ${index} has invalid name`);
      }
      if (!ai.personality || typeof ai.personality !== 'string') {
        throw new Error(`INITIALIZATION ERROR: AI player ${index} has invalid personality`);
      }
    });
    
    
    // Randomly assign seat positions (0-8)
    const availableSeats = Array.from({length: 9}, (_, i) => i);
    const shuffledSeats = this.shuffleArray(availableSeats);

    // Create human player
    const humanPlayer = {
      id: 0,
      name: playerSetup.humanPlayer.name,
      seat: shuffledSeats[0],
      chips: DEFAULT_SETTINGS.INITIAL_CHIPS,
      holeCards: [],
      isHuman: true,
      isActive: true,
      currentBet: 0,
      hasActed: false,
      isAllIn: false,
      strategy: null,
      actualStrategy: null
    };
    
    
    const players = [
      humanPlayer,
      ...playerSetup.aiPlayers.map((ai, index) => {
        let actualPersonality = ai.personality;
        if (ai.personality === 'RANDOM') {
          const availablePersonalities = Object.keys(AI_PERSONALITY_PROFILES);
          actualPersonality = availablePersonalities[Math.floor(Math.random() * availablePersonalities.length)];
        }
        
        const aiPlayer = {
          id: index + 1,
          name: ai.name,
          seat: shuffledSeats[index + 1],
          chips: DEFAULT_SETTINGS.INITIAL_CHIPS,
          holeCards: [],
          isHuman: false,
          isActive: true,
          currentBet: 0,
          hasActed: false,
          isAllIn: false,
          personality: ai.personality,
          actualPersonality: actualPersonality,
          // Keep strategy for backward compatibility during transition
          strategy: ai.strategy || 'balanced',
          actualStrategy: ai.strategy || 'balanced'
        };
        
        return aiPlayer;
      })
    ];

    // Sort players by seat for consistent positioning
    players.sort((a, b) => a.seat - b.seat);
    
    // Randomly assign dealer button
    const dealerButton = Math.floor(Math.random() * 9);

    const gameState = {
      phase: GAME_PHASES.PLAYING,
      players,
      deck: [],
      burnCards: [],
      communityCards: [],
      pot: 0,
      sidePots: [],
      currentBet: 0,
      lastRaiseSize: 0,
      dealerButton,
      smallBlind: DEFAULT_SETTINGS.SMALL_BLIND,
      bigBlind: DEFAULT_SETTINGS.BIG_BLIND,
      activePlayer: 0,
      handNumber: 1,
      bettingRound: BETTING_ROUNDS.PREFLOP,
      lastAction: null,
      processingPhase: false,
      showingSummary: false,
      actionCount: 0
    };
    
    this.emit('gameInitialized', { gameState, players });
    return gameState;
  }

  /**
   * Start a new hand
   * @param {GameState} gameState - Current game state
   * @returns {GameState} Updated game state
   */
  startNewHand(gameState) {
    const activePlayers = gameState.players.filter(p => p.chips > 0);
    
    // Check if game is over
    if (activePlayers.length < 2) {
      const newState = {
        ...gameState,
        phase: GAME_PHASES.GAME_OVER
      };
      this.emit('gameOver', { winner: activePlayers[0] });
      return newState;
    }

    // Create and shuffle new deck
    const deck = createDeck();
    
    // Burn first card
    const { burnCard: firstBurn, remainingDeck } = burnCard(deck);
    const burnCards = [firstBurn];

    // Deal hole cards to active players
    let currentDeck = remainingDeck;
    activePlayers.forEach(player => {
      const { cards, remainingDeck: afterDeal } = dealCards(currentDeck, 2);
      player.holeCards = cards;
      player.currentBet = 0;
      player.hasActed = false;
      player.isAllIn = false;
      player.isActive = true;
      currentDeck = afterDeal;
    });

    // Post blinds
    const sbIndex = (gameState.dealerButton + 1) % activePlayers.length;
    const bbIndex = (gameState.dealerButton + 2) % activePlayers.length;
    
    activePlayers[sbIndex].chips -= gameState.smallBlind;
    activePlayers[sbIndex].currentBet = gameState.smallBlind;
    activePlayers[bbIndex].chips -= gameState.bigBlind;
    activePlayers[bbIndex].currentBet = gameState.bigBlind;

    // Determine first to act (UTG)
    const firstToAct = (gameState.dealerButton + 3) % activePlayers.length;

    const newState = {
      ...gameState,
      players: activePlayers,
      deck: currentDeck,
      burnCards,
      communityCards: [],
      pot: gameState.smallBlind + gameState.bigBlind,
      sidePots: [],
      currentBet: gameState.bigBlind,
      lastRaiseSize: gameState.bigBlind,
      activePlayer: firstToAct,
      bettingRound: BETTING_ROUNDS.PREFLOP,
      lastAction: null,
      processingPhase: false,
      showingSummary: false,
      actionCount: 0
    };

    this.emit('handStarted', { 
      gameState: newState, 
      sbPlayer: activePlayers[sbIndex], 
      bbPlayer: activePlayers[bbIndex] 
    });

    return newState;
  }

  /**
   * Process a player action
   * @param {GameState} gameState - Current game state
   * @param {string} action - Action to execute
   * @param {number} amount - Amount for the action
   * @returns {GameState} Updated game state
   */
  processPlayerAction(gameState, action, amount = 0) {
    if (gameState.processingPhase) {
      return gameState; // Prevent multiple simultaneous actions
    }

    const newPlayers = [...gameState.players];
    const player = newPlayers[gameState.activePlayer];
    
    if (!player || !player.isActive) {
      return gameState;
    }
    
    let newPot = gameState.pot;
    let newCurrentBet = gameState.currentBet;
    let newLastRaiseSize = gameState.lastRaiseSize;
    let actionDescription = '';

    // Execute the action
    const actionResult = this.executeAction(
      action, 
      amount, 
      player, 
      gameState, 
      newPot, 
      newCurrentBet, 
      newLastRaiseSize
    );

    newPot = actionResult.pot;
    newCurrentBet = actionResult.currentBet;
    newLastRaiseSize = actionResult.lastRaiseSize;
    actionDescription = actionResult.description;

    player.hasActed = true;

    const newState = {
      ...gameState,
      players: newPlayers,
      pot: newPot,
      currentBet: newCurrentBet,
      lastRaiseSize: newLastRaiseSize,
      lastAction: { player: player.id, action, amount },
      processingPhase: false,
      actionCount: gameState.actionCount + 1
    };

    this.emit('playerAction', { 
      gameState: newState, 
      player, 
      action, 
      amount, 
      description: actionDescription 
    });

    return newState;
  }

  /**
   * Execute a specific action
   * @param {string} action - Action to execute
   * @param {number} amount - Action amount
   * @param {Player} player - Player executing action
   * @param {GameState} gameState - Current game state
   * @param {number} pot - Current pot
   * @param {number} currentBet - Current bet
   * @param {number} lastRaiseSize - Last raise size
   * @returns {Object} Action result
   */
  executeAction(action, amount, player, gameState, pot, currentBet, lastRaiseSize) {
    let newPot = pot;
    let newCurrentBet = currentBet;
    let newLastRaiseSize = lastRaiseSize;
    let description = '';

    switch (action) {
      case PLAYER_ACTIONS.FOLD:
        player.isActive = false;
        description = `${player.name} folds`;
        break;
        
      case PLAYER_ACTIONS.CHECK:
        if (gameState.currentBet === player.currentBet) {
          description = `${player.name} checks`;
        } else {
          player.isActive = false;
          description = `${player.name} folds (can't check)`;
        }
        break;
        
      case PLAYER_ACTIONS.CALL:
        const callAmount = Math.min(gameState.currentBet - player.currentBet, player.chips);
        if (callAmount > 0) {
          player.chips -= callAmount;
          player.currentBet += callAmount;
          newPot += callAmount;
          if (player.chips === 0) {
            player.isAllIn = true;
            description = `${player.name} calls ${callAmount} and is all-in`;
          } else {
            description = `${player.name} calls ${callAmount}`;
          }
        } else {
          description = `${player.name} checks`;
        }
        break;
        
      case PLAYER_ACTIONS.RAISE:
        const raiseResult = this.processRaise(player, amount, gameState);
        player.chips = raiseResult.chips;
        player.currentBet = raiseResult.currentBet;
        player.isAllIn = raiseResult.isAllIn;
        newPot += raiseResult.potIncrease;
        newCurrentBet = raiseResult.newCurrentBet;
        newLastRaiseSize = raiseResult.newLastRaiseSize;
        description = raiseResult.description;
        break;
        
      case PLAYER_ACTIONS.ALL_IN:
        const allInResult = this.processAllIn(player, gameState);
        player.chips = 0;
        player.currentBet = allInResult.newCurrentBet;
        player.isAllIn = true;
        newPot += allInResult.potIncrease;
        newCurrentBet = Math.max(newCurrentBet, allInResult.newCurrentBet);
        if (allInResult.isFullRaise) {
          newLastRaiseSize = allInResult.raiseAmount;
        }
        description = allInResult.description;
        break;
    }

    return {
      pot: newPot,
      currentBet: newCurrentBet,
      lastRaiseSize: newLastRaiseSize,
      description
    };
  }

  /**
   * Process a raise action
   * @param {Player} player - Player making the raise
   * @param {number} amount - Raise amount
   * @param {GameState} gameState - Current game state
   * @returns {Object} Raise result
   */
  processRaise(player, amount, gameState) {
    const minRaiseSize = Math.max(gameState.lastRaiseSize, gameState.bigBlind);
    const minTotalBet = gameState.currentBet + minRaiseSize;
    const maxPossibleBet = player.currentBet + player.chips;
    const totalBetSize = Math.min(Math.max(amount || minTotalBet, minTotalBet), maxPossibleBet);
    const additionalAmount = totalBetSize - player.currentBet;
    const actualRaiseSize = totalBetSize - gameState.currentBet;

    let description = '';
    let isAllIn = false;
    let newLastRaiseSize = gameState.lastRaiseSize;

    if (additionalAmount > 0 && additionalAmount <= player.chips) {
      const newChips = player.chips - additionalAmount;
      
      if (newChips === 0) {
        isAllIn = true;
        if (actualRaiseSize >= minRaiseSize) {
          newLastRaiseSize = actualRaiseSize;
          description = `${player.name} goes all-in, raising to ${totalBetSize}`;
        } else {
          description = `${player.name} goes all-in for ${totalBetSize} (incomplete raise)`;
        }
      } else {
        newLastRaiseSize = actualRaiseSize;
        description = `${player.name} raises to ${totalBetSize}`;
      }

      return {
        chips: newChips,
        currentBet: totalBetSize,
        isAllIn,
        potIncrease: additionalAmount,
        newCurrentBet: totalBetSize,
        newLastRaiseSize,
        description
      };
    } else {
      // Invalid raise, convert to check/fold
      if (gameState.currentBet === player.currentBet) {
        description = `${player.name} checks`;
        return {
          chips: player.chips,
          currentBet: player.currentBet,
          isAllIn: false,
          potIncrease: 0,
          newCurrentBet: gameState.currentBet,
          newLastRaiseSize: gameState.lastRaiseSize,
          description
        };
      } else {
        return {
          chips: player.chips,
          currentBet: player.currentBet,
          isAllIn: false,
          potIncrease: 0,
          newCurrentBet: gameState.currentBet,
          newLastRaiseSize: gameState.lastRaiseSize,
          description: `${player.name} folds`
        };
      }
    }
  }

  /**
   * Process an all-in action
   * @param {Player} player - Player going all-in
   * @param {GameState} gameState - Current game state
   * @returns {Object} All-in result
   */
  processAllIn(player, gameState) {
    const allInAmount = player.chips;
    if (allInAmount <= 0) {
      return {
        newCurrentBet: player.currentBet,
        potIncrease: 0,
        isFullRaise: false,
        raiseAmount: 0,
        description: `${player.name} checks (no chips)`
      };
    }

    const newTotalBet = player.currentBet + allInAmount;
    const raiseAmount = newTotalBet - gameState.currentBet;
    const minRaiseSize = Math.max(gameState.lastRaiseSize, gameState.bigBlind);
    const isFullRaise = raiseAmount >= minRaiseSize && newTotalBet > gameState.currentBet;

    let description = '';
    if (isFullRaise) {
      description = `${player.name} goes all-in for ${allInAmount} (raises to ${newTotalBet})`;
    } else if (newTotalBet > gameState.currentBet) {
      description = `${player.name} goes all-in for ${allInAmount} (incomplete raise to ${newTotalBet})`;
    } else {
      description = `${player.name} goes all-in for ${allInAmount} (calls)`;
    }

    return {
      newCurrentBet: newTotalBet,
      potIncrease: allInAmount,
      isFullRaise,
      raiseAmount,
      description
    };
  }

  /**
   * Handle all-in situation - deal all remaining cards and go to showdown
   * @param {GameState} gameState - Current game state
   * @returns {GameState} Updated game state
   */
  handleAllInSituation(gameState) {
    
    const activePlayers = gameState.players.filter(p => p.isActive);
    
    if (activePlayers.length <= 1) {
      return this.endHandEarly(gameState, activePlayers[0]);
    }

    let newDeck = [...gameState.deck];
    let newBurnCards = [...gameState.burnCards];
    let newCommunityCards = [...gameState.communityCards];
    
    // Deal all remaining community cards at once
    switch (gameState.bettingRound) {
      case BETTING_ROUNDS.PREFLOP:
        
        // Burn and deal flop
        if (newDeck.length > 0) {
          const { burnCard: flopBurn, remainingDeck: afterFlopBurn } = burnCard(newDeck);
          newBurnCards.push(flopBurn);
          newDeck = afterFlopBurn;
          
          if (newDeck.length >= 3) {
            const { cards: flopCards, remainingDeck: afterFlop } = dealCards(newDeck, 3);
            newCommunityCards.push(...flopCards);
            newDeck = afterFlop;
          }
        }
        
        // Burn and deal turn
        if (newDeck.length > 0) {
          const { burnCard: turnBurn, remainingDeck: afterTurnBurn } = burnCard(newDeck);
          newBurnCards.push(turnBurn);
          newDeck = afterTurnBurn;
          
          if (newDeck.length >= 1) {
            const { cards: turnCards, remainingDeck: afterTurn } = dealCards(newDeck, 1);
            newCommunityCards.push(...turnCards);
            newDeck = afterTurn;
          }
        }
        
        // Burn and deal river
        if (newDeck.length > 0) {
          const { burnCard: riverBurn, remainingDeck: afterRiverBurn } = burnCard(newDeck);
          newBurnCards.push(riverBurn);
          newDeck = afterRiverBurn;
          
          if (newDeck.length >= 1) {
            const { cards: riverCards, remainingDeck: afterRiver } = dealCards(newDeck, 1);
            newCommunityCards.push(...riverCards);
            newDeck = afterRiver;
          }
        }
        break;
        
      case BETTING_ROUNDS.FLOP:
        // Burn and deal turn
        if (newDeck.length > 0) {
          const { burnCard: turnBurn, remainingDeck: afterTurnBurn } = burnCard(newDeck);
          newBurnCards.push(turnBurn);
          newDeck = afterTurnBurn;
          
          if (newDeck.length >= 1) {
            const { cards: turnCards, remainingDeck: afterTurn } = dealCards(newDeck, 1);
            newCommunityCards.push(...turnCards);
            newDeck = afterTurn;
          }
        }
        
        // Burn and deal river
        if (newDeck.length > 0) {
          const { burnCard: riverBurn, remainingDeck: afterRiverBurn } = burnCard(newDeck);
          newBurnCards.push(riverBurn);
          newDeck = afterRiverBurn;
          
          if (newDeck.length >= 1) {
            const { cards: riverCards, remainingDeck: afterRiver } = dealCards(newDeck, 1);
            newCommunityCards.push(...riverCards);
            newDeck = afterRiver;
          }
        }
        break;
        
      case BETTING_ROUNDS.TURN:
        // Burn and deal river
        if (newDeck.length > 0) {
          const { burnCard: riverBurn, remainingDeck: afterRiverBurn } = burnCard(newDeck);
          newBurnCards.push(riverBurn);
          newDeck = afterRiverBurn;
          
          if (newDeck.length >= 1) {
            const { cards: riverCards, remainingDeck: afterRiver } = dealCards(newDeck, 1);
            newCommunityCards.push(...riverCards);
            newDeck = afterRiver;
          }
        }
        break;
        
      case BETTING_ROUNDS.RIVER:
        break;
    }
    
    // Create updated state and go to showdown
    const updatedState = {
      ...gameState,
      deck: newDeck,
      burnCards: newBurnCards,
      communityCards: newCommunityCards,
      bettingRound: BETTING_ROUNDS.RIVER,
      processingPhase: false
    };

    // Emit event for all cards being dealt
    this.emit('allInShowdown', { 
      gameState: updatedState, 
      communityCards: newCommunityCards 
    });
    
    return this.showdown(updatedState);
  }

  /**
   * Advance to the next betting round or showdown
   * @param {GameState} gameState - Current game state
   * @returns {GameState} Updated game state
   */
  advanceToNextPhase(gameState) {
    const activePlayers = gameState.players.filter(p => p.isActive);
    
    if (activePlayers.length <= 1) {
      return this.endHandEarly(gameState, activePlayers[0]);
    }

    if (gameState.processingPhase) {
      return gameState;
    }

    let newDeck = [...gameState.deck];
    let newBurnCards = [...gameState.burnCards];
    let newCommunityCards = [...gameState.communityCards];
    
    // Burn a card for the next phase
    if (newDeck.length > 0) {
      const { burnCard: nextBurn, remainingDeck } = burnCard(newDeck);
      newBurnCards.push(nextBurn);
      newDeck = remainingDeck;
    }

    let nextPhase = '';
    let cardsToAdd = 0;

    switch (gameState.bettingRound) {
      case BETTING_ROUNDS.PREFLOP:
        nextPhase = BETTING_ROUNDS.FLOP;
        cardsToAdd = 3;
        break;
      case BETTING_ROUNDS.FLOP:
        nextPhase = BETTING_ROUNDS.TURN;
        cardsToAdd = 1;
        break;
      case BETTING_ROUNDS.TURN:
        nextPhase = BETTING_ROUNDS.RIVER;
        cardsToAdd = 1;
        break;
      case BETTING_ROUNDS.RIVER:
        return this.showdown(gameState);
    }

    // Deal community cards
    if (cardsToAdd > 0 && newDeck.length >= cardsToAdd) {
      const { cards, remainingDeck } = dealCards(newDeck, cardsToAdd);
      newCommunityCards.push(...cards);
      newDeck = remainingDeck;
    }

    // Reset players for new betting round
    const newPlayers = gameState.players.map(p => ({
      ...p,
      currentBet: 0,
      hasActed: false
    }));

    const firstToActPlayer = getFirstToActPostFlop(newPlayers, gameState.dealerButton);
    
    const newState = {
      ...gameState,
      deck: newDeck,
      burnCards: newBurnCards,
      communityCards: newCommunityCards,
      bettingRound: nextPhase,
      currentBet: 0,
      lastRaiseSize: gameState.bigBlind,
      players: newPlayers,
      activePlayer: firstToActPlayer,
      processingPhase: false,
      actionCount: 0
    };

    this.emit('phaseAdvanced', { 
      gameState: newState, 
      phase: nextPhase, 
      newCards: newCommunityCards.slice(-cardsToAdd) 
    });

    return newState;
  }

  /**
   * Handle showdown
   * @param {GameState} gameState - Current game state
   * @returns {GameState} Updated game state
   */
  showdown(gameState) {
    // Players eligible for showdown are those who made it to the end without folding
    // They should have cards to show (holeCards) and have invested money in the pot
    const showdownPlayers = gameState.players.filter(p => 
      p.holeCards && p.holeCards.length === 2 && 
      (p.isActive || p.currentBet > 0 || p.isAllIn)
    );
    
    // For the actual hand evaluation, use players who are still "active" (didn't fold)
    const activePlayers = gameState.players.filter(p => p.isActive);
    const sidePots = calculateSidePots(gameState.players, gameState.pot);
    
    
    this.emit('showdownStarted', { activePlayers, sidePots });
    
    // Check if we actually need a showdown or if hand should end early
    // Only end early if there's truly just one player who didn't fold
    const playersWhoDidntFold = gameState.players.filter(p => 
      p.holeCards && p.holeCards.length === 2 && p.isActive
    );
    
    if (playersWhoDidntFold.length === 1) {
      return this.endHandEarly(gameState, playersWhoDidntFold[0]);
    }
    
    // If we have multiple players who didn't fold, proceed with showdown
    if (playersWhoDidntFold.length < 2) {
      // This shouldn't happen, but if it does, find the last remaining player
      const remainingPlayer = gameState.players.find(p => p.chips > 0);
      if (remainingPlayer) {
        return this.endHandEarly(gameState, remainingPlayer);
      }
    }

    // Evaluate all hands
    const handEvaluations = activePlayers.map(player => ({
      player,
      evaluation: evaluateHand(player.holeCards, gameState.communityCards)
    }));
    
    
    // Sort by hand strength (highest first)
    handEvaluations.sort((a, b) => b.evaluation.strength - a.evaluation.strength);
    
    // Distribute side pots
    const winners = [];
    const updatedPlayers = [...gameState.players];
    
    sidePots.forEach((pot, potIndex) => {
      const eligibleEvaluations = handEvaluations.filter(he => 
        pot.eligiblePlayers.includes(he.player.id)
      );
      
      if (eligibleEvaluations.length > 0) {
        const bestStrength = eligibleEvaluations[0].evaluation.strength;
        const potWinners = eligibleEvaluations.filter(he => 
          he.evaluation.strength === bestStrength
        );
        
        const amountPerWinner = Math.floor(pot.amount / potWinners.length);
        
        potWinners.forEach(winnerEval => {
          const playerIndex = updatedPlayers.findIndex(p => p.id === winnerEval.player.id);
          if (playerIndex !== -1) {
            updatedPlayers[playerIndex].chips += amountPerWinner;
            
            winners.push({
              player: { ...updatedPlayers[playerIndex] },
              amount: amountPerWinner,
              hand: winnerEval.evaluation.description,
              potIndex
            });
          }
        });
      }
    });
    
    const newState = {
      ...gameState,
      players: updatedPlayers,
      pot: 0,
      sidePots: [],
      activePlayer: -1,
      processingPhase: true,
      showingShowdown: true  // Preserve showdown flag for UI
    };

    this.emit('showdownComplete', { 
      gameState: newState, 
      winners, 
      sidePots, 
      handEvaluations 
    });

    return newState;
  }

  /**
   * End hand early (all but one player folded)
   * @param {GameState} gameState - Current game state
   * @param {Player} winner - Winning player
   * @returns {GameState} Updated game state
   */
  endHandEarly(gameState, winner) {
    const sidePots = calculateSidePots(gameState.players, gameState.pot);
    const totalPot = sidePots.reduce((total, pot) => total + pot.amount, 0);
    
    const updatedPlayers = gameState.players.map(p => {
      if (p.id === winner?.id) {
        return { ...p, chips: p.chips + totalPot };
      }
      return p;
    });
    
    const newState = {
      ...gameState,
      players: updatedPlayers,
      pot: 0,
      sidePots: [],
      activePlayer: -1,
      processingPhase: true
    };
    
    this.emit('handEndedEarly', { 
      gameState: newState, 
      winner: updatedPlayers.find(p => p.id === winner?.id), 
      amount: totalPot 
    });

    return newState;
  }

  /**
   * Check if betting round is complete
   * @param {GameState} gameState - Current game state
   * @returns {boolean} True if betting round is complete
   */
  isBettingComplete(gameState) {
    return isBettingRoundComplete(gameState.players, gameState.currentBet);
  }

  /**
   * Get next active player
   * @param {GameState} gameState - Current game state
   * @returns {number} Next player index or -1
   */
  getNextPlayer(gameState) {
    return getNextActivePlayer(gameState.players, gameState.activePlayer);
  }

  /**
   * Utility function to shuffle an array
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Export singleton instance
export const gameEngine = new GameEngine();