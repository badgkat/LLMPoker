import React, { useState, useEffect } from 'react';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const AI_STRATEGIES = {
  'aggressive': "You are an aggressive poker player who likes to bluff, apply pressure, and play many hands.",
  'tight': "You are a tight, conservative poker player who only plays strong hands.",
  'mathematical': "You are a mathematical poker player who focuses on pot odds and expected value.",
  'random': "You play with high randomness and unpredictable patterns.",
  'positional': "You adjust your strategy based on your seat position.",
  'balanced': "You play a balanced strategy, mixing aggressive and conservative play.",
  'randomly-determined': "Random strategy assigned automatically"
};

const PokerApp = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [gameState, setGameState] = useState({
    phase: 'setup',
    players: [],
    deck: [],
    burnCards: [],
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentBet: 0,
    lastRaiseSize: 0,
    dealerButton: 0,
    smallBlind: 100,
    bigBlind: 200,
    activePlayer: 0,
    handNumber: 0,
    bettingRound: 'preflop',
    lastAction: null,
    processingPhase: false,
    showingSummary: false,
    actionCount: 0 // Add action counter to detect loops
  });

  const [playerSetup, setPlayerSetup] = useState({
    humanPlayer: { name: 'You', seat: 0 },
    aiPlayers: Array(8).fill(null).map((_, i) => ({
      name: `AI Player ${i + 1}`,
      seat: i + 1,
      strategy: 'randomly-determined'
    }))
  });

  // Enhanced game log with hand organization
  const [gameLog, setGameLog] = useState({
    currentHand: [],
    handHistory: [],
    expandedHands: new Set()
  });
  
  const [handSummary, setHandSummary] = useState(null);
  const [aiMemories, setAiMemories] = useState({});
  const [betAmount, setBetAmount] = useState(200);

  const createDeck = () => {
    const deck = [];
    SUITS.forEach(suit => {
      RANKS.forEach(rank => {
        deck.push({ suit, rank, value: getRankValue(rank) });
      });
    });
    return shuffleDeck(deck);
  };

  const shuffleDeck = (deck) => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const getRankValue = (rank) => {
    if (rank === 'A') return 14;
    if (rank === 'K') return 13;
    if (rank === 'Q') return 12;
    if (rank === 'J') return 11;
    return parseInt(rank);
  };

  const addToLog = (message, isHandStart = false) => {
    setGameLog(prev => {
      if (isHandStart) {
        // Start a new hand in the log
        return {
          ...prev,
          currentHand: [{ message, timestamp: Date.now() }],
          handHistory: prev.currentHand.length > 0 
            ? [...prev.handHistory, { 
                handNumber: gameState.handNumber, 
                log: prev.currentHand,
                completed: true 
              }]
            : prev.handHistory
        };
      } else {
        // Add to current hand
        return {
          ...prev,
          currentHand: [...prev.currentHand, { message, timestamp: Date.now() }]
        };
      }
    });
  };

  const toggleHandExpansion = (handNumber) => {
    setGameLog(prev => {
      const newExpanded = new Set(prev.expandedHands);
      if (newExpanded.has(handNumber)) {
        newExpanded.delete(handNumber);
      } else {
        newExpanded.add(handNumber);
      }
      return { ...prev, expandedHands: newExpanded };
    });
  };

  const updatePlayerName = (index, name) => {
    const updatedPlayers = [...playerSetup.aiPlayers];
    updatedPlayers[index] = { ...updatedPlayers[index], name };
    setPlayerSetup(prev => ({ ...prev, aiPlayers: updatedPlayers }));
  };

  const updatePlayerStrategy = (index, strategy) => {
    const updatedStrategies = [...playerSetup.aiPlayers];
    updatedStrategies[index] = { ...updatedStrategies[index], strategy };
    setPlayerSetup(prev => ({ ...prev, aiPlayers: updatedStrategies }));
  };

  const startGame = () => {
    // Randomly assign seat positions (0-8)
    const availableSeats = Array.from({length: 9}, (_, i) => i);
    const shuffledSeats = [];
    
    // Fisher-Yates shuffle for seats
    while (availableSeats.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableSeats.length);
      shuffledSeats.push(availableSeats.splice(randomIndex, 1)[0]);
    }

    const players = [
      {
        id: 0,
        name: playerSetup.humanPlayer.name,
        seat: shuffledSeats[0],
        chips: 60000,
        holeCards: [],
        isHuman: true,
        isActive: true,
        currentBet: 0,
        hasActed: false,
        isAllIn: false,
        strategy: null,
        actualStrategy: null
      },
      ...playerSetup.aiPlayers.map((ai, index) => {
        let actualStrategy = ai.strategy;
        if (ai.strategy === 'randomly-determined') {
          const availableStrategies = ['aggressive', 'tight', 'mathematical', 'random', 'positional', 'balanced'];
          actualStrategy = availableStrategies[Math.floor(Math.random() * availableStrategies.length)];
        }
        
        return {
          id: index + 1,
          name: ai.name,
          seat: shuffledSeats[index + 1],
          chips: 60000,
          holeCards: [],
          isHuman: false,
          isActive: true,
          currentBet: 0,
          hasActed: false,
          isAllIn: false,
          strategy: ai.strategy,
          actualStrategy: actualStrategy
        };
      })
    ];

    // Sort players by seat for consistent positioning
    players.sort((a, b) => a.seat - b.seat);
    
    // Randomly assign dealer button
    const dealerButton = Math.floor(Math.random() * 9);

    setGameState(prev => ({
      ...prev,
      phase: 'playing',
      players,
      dealerButton,
      handNumber: 1
    }));

    const memories = {};
    players.forEach(player => {
      if (!player.isHuman) {
        memories[player.id] = [];
      }
    });
    setAiMemories(memories);

    setTimeout(() => {
      startNewHand(players, dealerButton);
    }, 100);
  };

  const startNewHand = (players, dealerButton) => {
    const activePlayers = players.filter(p => p.chips > 0);
    if (activePlayers.length < 2) {
      setGameState(prev => ({ ...prev, phase: 'game-over' }));
      return;
    }

    const newDeck = createDeck();
    const burnCards = [];
    
    burnCards.push(newDeck.pop());

    activePlayers.forEach(player => {
      player.holeCards = [newDeck.pop(), newDeck.pop()];
      player.currentBet = 0;
      player.hasActed = false;
      player.isAllIn = false;
      player.isActive = true;
    });

    const sbIndex = (dealerButton + 1) % activePlayers.length;
    const bbIndex = (dealerButton + 2) % activePlayers.length;
    
    activePlayers[sbIndex].chips -= 100;
    activePlayers[sbIndex].currentBet = 100;
    activePlayers[bbIndex].chips -= 200;
    activePlayers[bbIndex].currentBet = 200;

    const firstToAct = (dealerButton + 3) % activePlayers.length;

    setGameState(prev => ({
      ...prev,
      players: activePlayers,
      deck: newDeck,
      burnCards,
      communityCards: [],
      pot: 300,
      sidePots: [],
      currentBet: 200,
      lastRaiseSize: 200,
      activePlayer: firstToAct,
      bettingRound: 'preflop',
      lastAction: null,
      processingPhase: false,
      showingSummary: false
    }));

    addToLog(`Hand ${gameState.handNumber} started. Blinds: ${activePlayers[sbIndex].name} (SB: 100), ${activePlayers[bbIndex].name} (BB: 200)`, true);
    addToLog(`Pre-flop burn card dealt face down`);
  };

  // Side pot calculation
  const calculateSidePots = (players) => {
    const activePlayers = players.filter(p => p.isActive);
    const allInPlayers = activePlayers.filter(p => p.isAllIn);
    
    if (allInPlayers.length === 0) {
      return [{ amount: gameState.pot, eligiblePlayers: activePlayers.map(p => p.id) }];
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

  // Evaluate hand strength (simplified - would need proper poker hand evaluation)
  const evaluateHand = (holeCards, communityCards) => {
    // This is a placeholder - in a real implementation, you'd want proper hand evaluation
    // For now, just return a random strength with the actual cards
    return {
      strength: Math.random() * 1000,
      description: "High Card", // Placeholder
      cards: [...holeCards]
    };
  };

  const showHandSummary = (winners, sidePots, showdownPlayers = []) => {
    const summary = {
      handNumber: gameState.handNumber,
      communityCards: [...gameState.communityCards],
      showdownPlayers: showdownPlayers.map(player => ({
        ...player,
        handEvaluation: evaluateHand(player.holeCards, gameState.communityCards)
      })),
      winners,
      sidePots,
      totalPot: sidePots.reduce((total, pot) => total + pot.amount, 0),
      endType: showdownPlayers.length > 1 ? 'showdown' : 'fold'
    };

    setHandSummary(summary);
    setGameState(prev => ({ ...prev, showingSummary: true }));

    // Auto-hide summary after 5 seconds
    setTimeout(() => {
      setHandSummary(null);
      setGameState(prev => ({ ...prev, showingSummary: false }));
      
      // Start next hand
      setTimeout(() => {
        const newDealerButton = (gameState.dealerButton + 1) % gameState.players.length;
        setGameState(prev => ({
          ...prev,
          handNumber: prev.handNumber + 1,
          dealerButton: newDealerButton
        }));
        startNewHand(gameState.players, newDealerButton);
      }, 1000);
    }, 5000);
  };

  useEffect(() => {
    if (gameState.players && gameState.players[gameState.activePlayer]) {
      const availableActions = getAvailableActions(gameState.players[gameState.activePlayer]);
      if (availableActions.includes('raise')) {
        const minRaiseSize = Math.max(gameState.lastRaiseSize, gameState.bigBlind);
        const minBet = gameState.currentBet + minRaiseSize;
        const maxBet = gameState.players[gameState.activePlayer].currentBet + gameState.players[gameState.activePlayer].chips;
        setBetAmount(Math.max(minBet, Math.min(betAmount, maxBet)));
      }
    }
  }, [gameState.currentBet, gameState.activePlayer, gameState.lastRaiseSize]);

  useEffect(() => {
    if (gameState.phase === 'playing' && gameState.players && gameState.players.length > 0 && !gameState.processingPhase && !gameState.showingSummary) {
      const currentPlayer = gameState.players[gameState.activePlayer];
      
      // Failsafe: If we've had too many actions in one betting round, force advance
      if (gameState.actionCount > 50) {
        console.warn('Too many actions detected, forcing phase advance');
        addToLog('System: Forcing advance due to excessive actions');
        setGameState(prev => ({ ...prev, actionCount: 0 }));
        setTimeout(() => {
          advanceToNextPhase();
        }, 1000);
        return;
      }
      
      // Check if we're in a situation where everyone is all-in
      const activePlayers = gameState.players.filter(p => p.isActive);
      const playersWhoCanAct = activePlayers.filter(p => !p.isAllIn);
      
      if (playersWhoCanAct.length === 0 && activePlayers.length > 1) {
        console.log('All players are all-in, advancing to next phase');
        addToLog('All remaining players are all-in - advancing automatically');
        setTimeout(() => {
          advanceToNextPhase();
        }, 1500);
        return;
      }
      
      if (currentPlayer && !currentPlayer.isHuman && currentPlayer.isActive && !currentPlayer.isAllIn) {
        const timer = setTimeout(async () => {
          try {
            await processAIAction(currentPlayer);
          } catch (error) {
            console.error('AI processing error:', error);
            await executePlayerAction('fold', 0);
          }
        }, 1500 + Math.random() * 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [gameState.activePlayer, gameState.phase, gameState.bettingRound, gameState.processingPhase, gameState.showingSummary, gameState.actionCount]);

  const processAIAction = async (player) => {
    if (!player || !player.isActive || player.isAllIn) return;
    
    try {
      const aiDecision = await getAIDecision(player);
      if (aiDecision && aiDecision.action) {
        await executePlayerAction(aiDecision.action, aiDecision.amount || 0);
      } else {
        await executePlayerAction('fold', 0);
      }
    } catch (error) {
      console.error('AI action error:', error);
      await executePlayerAction('fold', 0);
    }
  };

  const playerAction = async (action, amount = 0) => {
    await executePlayerAction(action, amount);
  };

  const executePlayerAction = async (action, amount) => {
    try {
      if (!gameState.players || gameState.players.length === 0 || gameState.activePlayer >= gameState.players.length) {
        return;
      }

      // Prevent multiple simultaneous actions
      if (gameState.processingPhase) {
        return;
      }

      setGameState(prev => ({ ...prev, processingPhase: true }));

      const newPlayers = [...gameState.players];
      const player = newPlayers[gameState.activePlayer];
      
      if (!player || !player.isActive) {
        setGameState(prev => ({ ...prev, processingPhase: false }));
        return;
      }
      
      let newPot = gameState.pot;
      let newCurrentBet = gameState.currentBet;
      let newLastRaiseSize = gameState.lastRaiseSize;
      let actionDescription = '';

      switch (action) {
        case 'fold':
          player.isActive = false;
          actionDescription = `${player.name} folds`;
          break;
          
        case 'check':
          if (gameState.currentBet === player.currentBet) {
            actionDescription = `${player.name} checks`;
          } else {
            player.isActive = false;
            actionDescription = `${player.name} folds (can't check)`;
          }
          break;
          
        case 'call':
          const callAmount = Math.min(gameState.currentBet - player.currentBet, player.chips);
          if (callAmount > 0) {
            player.chips -= callAmount;
            player.currentBet += callAmount;
            newPot += callAmount;
            if (player.chips === 0) {
              player.isAllIn = true;
              actionDescription = `${player.name} calls ${callAmount} and is all-in`;
            } else {
              actionDescription = `${player.name} calls ${callAmount}`;
            }
          } else {
            actionDescription = `${player.name} checks`;
          }
          break;
          
        case 'raise':
          const minRaiseSize = Math.max(newLastRaiseSize, gameState.bigBlind);
          const minTotalBet = gameState.currentBet + minRaiseSize;
          const maxPossibleBet = player.currentBet + player.chips;
          const totalBetSize = Math.min(Math.max(amount || minTotalBet, minTotalBet), maxPossibleBet);
          const additionalAmount = totalBetSize - player.currentBet;
          const actualRaiseSize = totalBetSize - gameState.currentBet;
          
          if (additionalAmount > 0 && additionalAmount <= player.chips) {
            player.chips -= additionalAmount;
            player.currentBet = totalBetSize;
            newPot += additionalAmount;
            newCurrentBet = totalBetSize;
            
            if (player.chips === 0) {
              player.isAllIn = true;
              if (actualRaiseSize >= minRaiseSize) {
                newLastRaiseSize = actualRaiseSize;
                actionDescription = `${player.name} goes all-in, raising to ${totalBetSize}`;
              } else {
                actionDescription = `${player.name} goes all-in for ${totalBetSize} (incomplete raise)`;
              }
            } else {
              newLastRaiseSize = actualRaiseSize;
              actionDescription = `${player.name} raises to ${totalBetSize}`;
            }
          } else {
            if (gameState.currentBet === player.currentBet) {
              actionDescription = `${player.name} checks`;
            } else {
              player.isActive = false;
              actionDescription = `${player.name} folds`;
            }
          }
          break;
          
        case 'all-in':
          const allInAmount = player.chips;
          if (allInAmount > 0) {
            const newTotalBet = player.currentBet + allInAmount;
            const raiseAmount = newTotalBet - gameState.currentBet;
            
            player.chips = 0;
            player.currentBet = newTotalBet;
            player.isAllIn = true;
            newPot += allInAmount;
            newCurrentBet = Math.max(newCurrentBet, newTotalBet);
            
            // Only update lastRaiseSize if this all-in constitutes a full raise
            const minRaiseSize = Math.max(newLastRaiseSize, gameState.bigBlind);
            if (raiseAmount >= minRaiseSize && newTotalBet > gameState.currentBet) {
              newLastRaiseSize = raiseAmount;
              actionDescription = `${player.name} goes all-in for ${allInAmount} (raises to ${newTotalBet})`;
            } else if (newTotalBet > gameState.currentBet) {
              actionDescription = `${player.name} goes all-in for ${allInAmount} (incomplete raise to ${newTotalBet})`;
            } else {
              actionDescription = `${player.name} goes all-in for ${allInAmount} (calls)`;
            }
          } else {
            actionDescription = `${player.name} checks (no chips)`;
          }
          break;
      }

      player.hasActed = true;
      addToLog(actionDescription);

      setGameState(prev => ({
        ...prev,
        players: newPlayers,
        pot: newPot,
        currentBet: newCurrentBet,
        lastRaiseSize: newLastRaiseSize,
        lastAction: { player: player.id, action, amount },
        processingPhase: false,
        actionCount: prev.actionCount + 1 // Increment action counter
      }));

      // Short delay before processing game flow
      setTimeout(() => {
        try {
          const activePlayers = newPlayers.filter(p => p.isActive);
          const playersWhoCanAct = activePlayers.filter(p => !p.isAllIn);
          
          // Check if betting round is complete
          if (isBettingRoundComplete(newPlayers, newCurrentBet)) {
            if (activePlayers.length <= 1) {
              endHandEarly(activePlayers[0], newPlayers);
            } else {
              setTimeout(() => {
                advanceToNextPhase();
              }, 1000);
            }
          } else if (playersWhoCanAct.length === 0) {
            // Everyone who can act is all-in - advance immediately
            addToLog("All remaining players are all-in - advancing to next phase");
            setTimeout(() => {
              advanceToNextPhase();
            }, 1000);
          } else {
            const nextPlayer = getNextActivePlayer(newPlayers);
            if (nextPlayer === -1) {
              // No more players can act, advance to next phase
              addToLog("No more players can act - advancing to next phase");
              setTimeout(() => {
                advanceToNextPhase();
              }, 1000);
            } else {
              setGameState(prev => ({ ...prev, activePlayer: nextPlayer }));
            }
          }
        } catch (error) {
          console.error('Error in game flow:', error);
          // Failsafe - advance to next phase if we're stuck
          setTimeout(() => {
            advanceToNextPhase();
          }, 2000);
        }
      }, 200);
      
    } catch (error) {
      console.error('Execute player action error:', error);
      setGameState(prev => ({ ...prev, processingPhase: false }));
    }
  };

  // FIXED: Proper betting round completion logic
  const isBettingRoundComplete = (players, currentBet) => {
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

  // FIXED: Better next player logic with loop prevention
  const getNextActivePlayer = (players) => {
    const activePlayers = players.filter(p => p.isActive);
    
    // If no active players or only one, return -1
    if (activePlayers.length <= 1) return -1;
    
    // Find players who can still act (active and not all-in)
    const playersWhoCanAct = activePlayers.filter(p => !p.isAllIn);
    
    // If no one can act, return -1 to advance to next phase
    if (playersWhoCanAct.length === 0) return -1;
    
    // Find the next player in sequence who can act
    let nextIndex = (gameState.activePlayer + 1) % players.length;
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

  const endHandEarly = (winner, allPlayers) => {
    const sidePots = calculateSidePots(allPlayers);
    const totalPot = sidePots.reduce((total, pot) => total + pot.amount, 0);
    
    const updatedPlayers = allPlayers.map(p => {
      if (p.id === winner?.id) {
        const newChipCount = p.chips + totalPot;
        addToLog(`${winner.name} wins ${totalPot} chips (all others folded) - Total: ${newChipCount}`);
        return { ...p, chips: newChipCount };
      }
      return p;
    });
    
    // Update state first
    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      pot: 0,
      sidePots: []
    }));
    
    if (winner) {
      // Use the updated winner object for the summary
      const updatedWinner = updatedPlayers.find(p => p.id === winner.id);
      showHandSummary([{
        player: updatedWinner,
        amount: totalPot,
        pots: sidePots
      }], sidePots, []);
    } else {
      showHandSummary([], sidePots, []);
    }
  };

  const advanceToNextPhase = () => {
    const activePlayers = gameState.players.filter(p => p.isActive);
    if (activePlayers.length <= 1) {
      endHandEarly(activePlayers[0], gameState.players);
      return;
    }

    // Prevent multiple phase changes
    if (gameState.processingPhase) {
      return;
    }

    setGameState(prev => ({ ...prev, processingPhase: true }));

    const newDeck = [...gameState.deck];
    const newBurnCards = [...gameState.burnCards];
    const newCommunityCards = [...gameState.communityCards];
    
    // Only burn a card if we haven't already burned for this phase
    const expectedBurnCards = gameState.bettingRound === 'preflop' ? 1 : 
                             gameState.bettingRound === 'flop' ? 2 :
                             gameState.bettingRound === 'turn' ? 3 : 4;
    
    if (newBurnCards.length < expectedBurnCards) {
      newBurnCards.push(newDeck.pop());
    }

    let nextPhase = '';
    let cardsToAdd = 0;

    switch (gameState.bettingRound) {
      case 'preflop':
        nextPhase = 'flop';
        cardsToAdd = 3;
        break;
      case 'flop':
        nextPhase = 'turn';
        cardsToAdd = 1;
        break;
      case 'turn':
        nextPhase = 'river';
        cardsToAdd = 1;
        break;
      case 'river':
        showdown();
        return;
    }

    // Only add community cards if we haven't already added them for this phase
    const expectedCommunityCards = nextPhase === 'flop' ? 3 :
                                  nextPhase === 'turn' ? 4 :
                                  nextPhase === 'river' ? 5 : 0;
    
    while (newCommunityCards.length < expectedCommunityCards && newDeck.length > 0) {
      newCommunityCards.push(newDeck.pop());
    }

    const newPlayers = gameState.players.map(p => ({
      ...p,
      currentBet: 0,
      hasActed: false
    }));

    const firstToActPlayer = getFirstToActPostFlop(newPlayers);
    
    setGameState(prev => ({
      ...prev,
      deck: newDeck,
      burnCards: newBurnCards,
      communityCards: newCommunityCards,
      bettingRound: nextPhase,
      currentBet: 0,
      lastRaiseSize: gameState.bigBlind, // Reset to big blind for new round
      players: newPlayers,
      activePlayer: firstToActPlayer,
      processingPhase: false,
      actionCount: 0 // Reset action counter for new betting round
    }));

    const newCards = newCommunityCards.slice(-cardsToAdd);
    if (newCards.length > 0) {
      addToLog(`${nextPhase.toUpperCase()} dealt: ${newCards.map(c => `${c.rank}${c.suit}`).join(' ')}`);
      addToLog(`${nextPhase} burn card dealt face down`);
    }
    
    // If no one can act (all all-in), immediately advance to next phase
    if (firstToActPlayer === -1) {
      setTimeout(() => {
        advanceToNextPhase();
      }, 1500);
    }
  };

  const getFirstToActPostFlop = (players) => {
    // If all players are all-in, return -1 to skip to next phase
    const playersWhoCanAct = players.filter(p => p.isActive && !p.isAllIn);
    if (playersWhoCanAct.length === 0) return -1;
    
    // Find first active player who can act, starting from left of dealer
    for (let i = 1; i < players.length; i++) {
      const playerIndex = (gameState.dealerButton + i) % players.length;
      if (players[playerIndex].isActive && !players[playerIndex].isAllIn) {
        return playerIndex;
      }
    }
    return -1;
  };

  const showdown = () => {
    const activePlayers = gameState.players.filter(p => p.isActive);
    const sidePots = calculateSidePots(gameState.players);
    
    addToLog('--- SHOWDOWN ---');
    
    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      const totalPot = sidePots.reduce((total, pot) => total + pot.amount, 0);
      
      // Update winner's chips immediately
      const updatedPlayers = gameState.players.map(p => {
        if (p.id === winner.id) {
          const newChipCount = p.chips + totalPot;
          addToLog(`${winner.name} wins ${totalPot} chips (only remaining player) - Total: ${newChipCount}`);
          return { ...p, chips: newChipCount };
        }
        return p;
      });
      
      // Update state first, then show summary
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        pot: 0,
        sidePots: []
      }));
      
      // Use the updated players in the summary
      const updatedWinner = updatedPlayers.find(p => p.id === winner.id);
      showHandSummary([{
        player: updatedWinner,
        amount: totalPot,
        pots: sidePots
      }], sidePots, [updatedWinner]);
      
    } else {
      // Multiple players - actual showdown
      activePlayers.forEach(player => {
        addToLog(`${player.name} shows: ${player.holeCards.map(c => `${c.rank}${c.suit}`).join(' ')}`);
      });
      
      // Evaluate all hands (simplified - random winner for now)
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
        // Find best hand among eligible players for this pot
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
              const newTotal = updatedPlayers[playerIndex].chips;
              
              winners.push({
                player: { ...updatedPlayers[playerIndex] }, // Use updated player object
                amount: amountPerWinner,
                hand: winnerEval.evaluation.description,
                potIndex
              });
              
              if (potWinners.length === 1) {
                addToLog(`${winnerEval.player.name} wins ${amountPerWinner} chips with ${winnerEval.evaluation.description} - Total: ${newTotal}`);
              } else {
                addToLog(`${winnerEval.player.name} ties and wins ${amountPerWinner} chips with ${winnerEval.evaluation.description} - Total: ${newTotal}`);
              }
            }
          });
        }
      });
      
      // Update state first
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        pot: 0,
        sidePots: []
      }));
      
      // Use updated players in summary
      const updatedActivePlayers = activePlayers.map(ap => 
        updatedPlayers.find(up => up.id === ap.id) || ap
      );
      
      showHandSummary(winners, sidePots, updatedActivePlayers);
    }
  };

  const getGameContextForPlayer = (player) => {
    const recentActions = [];
    
    // Get recent actions from this hand
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
      bettingRound: gameState.bettingRound
    };
  };

  const getAIDecision = async (player) => {
    if (typeof window !== 'undefined' && window.claude && window.claude.complete) {
      return await getClaudeAIDecision(player);
    } else {
      return getFallbackAIDecision(player);
    }
  };

  const getClaudeAIDecision = async (player) => {
    try {
      const gameContext = getGameContextForPlayer(player);
      const strategy = AI_STRATEGIES[player.actualStrategy || player.strategy];
      const memory = aiMemories[player.id] || [];
      
      const prompt = `${strategy}

Current game situation:
- Your hole cards: ${player.holeCards.map(c => `${c.rank}${c.suit}`).join(', ')}
- Community cards: ${gameState.communityCards.map(c => `${c.rank}${c.suit}`).join(', ')}
- Cards burned this hand: ${gameState.burnCards.length} (face down, unknown)
- Your chips: ${player.chips}
- Current bet to call: ${gameState.currentBet - player.currentBet}
- Pot size: ${gameState.pot}
- Betting round: ${gameState.bettingRound}
- Hand number: ${gameState.handNumber}

Recent opponent actions this hand:
${gameContext.recentActions.map(a => `${a.playerName}: ${a.action} ${a.amount || ''}`).join('\n')}

Your memory of opponents from previous hands:
${memory.slice(-20).map(m => `Hand ${m.hand} - Player ${m.player}: ${m.action} ${m.amount || ''}`).join('\n')}

Available actions: ${getAvailableActions(player).join(', ')}

Note: Burn cards are face down and unknown. Base your decisions on visible cards only.

Respond with a JSON object:
{
  "action": "fold|check|call|raise|all-in",
  "amount": number (only for raise),
  "reasoning": "brief explanation of your decision"
}

Your entire response must be valid JSON only.`;

      const response = await window.claude.complete(prompt);
      const decision = JSON.parse(response);
      
      const availableActions = getAvailableActions(player);
      if (!availableActions.includes(decision.action)) {
        return getFallbackAIDecision(player);
      }
      
      return decision;
    } catch (error) {
      console.error('Claude AI decision error:', error);
      return getFallbackAIDecision(player);
    }
  };

  const getFallbackAIDecision = (player) => {
    const availableActions = getAvailableActions(player);
    const callAmount = gameState.currentBet - player.currentBet;
    const strategy = player.actualStrategy || player.strategy;
    
    let decision = { action: 'fold', amount: 0 };
    
    switch (strategy) {
      case 'aggressive':
        if (Math.random() > 0.6) {
          if (availableActions.includes('raise')) {
            const minRaise = gameState.currentBet + Math.max(gameState.lastRaiseSize, gameState.bigBlind);
            decision = { action: 'raise', amount: Math.min(minRaise, player.currentBet + player.chips) };
          } else if (availableActions.includes('call')) {
            decision = { action: 'call', amount: callAmount };
          }
        }
        break;
        
      case 'tight':
        if (Math.random() > 0.8) {
          if (availableActions.includes('call')) {
            decision = { action: 'call', amount: callAmount };
          } else if (availableActions.includes('check')) {
            decision = { action: 'check', amount: 0 };
          }
        }
        break;
        
      case 'random':
        const randomAction = availableActions[Math.floor(Math.random() * availableActions.length)];
        if (randomAction === 'raise') {
          const minRaise = gameState.currentBet + Math.max(gameState.lastRaiseSize, gameState.bigBlind);
          decision = { action: randomAction, amount: Math.min(minRaise, player.currentBet + player.chips) };
        } else {
          decision = { action: randomAction, amount: randomAction === 'call' ? callAmount : 0 };
        }
        break;
        
      default:
        if (Math.random() > 0.7) {
          if (availableActions.includes('call')) {
            decision = { action: 'call', amount: callAmount };
          } else if (availableActions.includes('check')) {
            decision = { action: 'check', amount: 0 };
          }
        }
        break;
    }
    
    if (!availableActions.includes(decision.action)) {
      if (availableActions.includes('check')) {
        decision = { action: 'check', amount: 0 };
      } else {
        decision = { action: 'fold', amount: 0 };
      }
    }
    
    return decision;
  };

  // FIXED: Better available actions logic
  const getAvailableActions = (player) => {
    try {
      if (!player || !player.isActive || player.isAllIn) return [];
      
      const actions = [];
      const callAmount = gameState.currentBet - player.currentBet;
      
      // Check or Call
      if (callAmount === 0) {
        actions.push('check');
      } else if (callAmount <= player.chips && callAmount > 0) {
        actions.push('call');
      }
      
      // Always can fold (unless already checked)
      if (callAmount > 0) {
        actions.push('fold');
      }
      
      // Raise logic
      const minRaiseSize = Math.max(gameState.lastRaiseSize, gameState.bigBlind);
      const minRaiseTotal = gameState.currentBet + minRaiseSize;
      const additionalForFullRaise = minRaiseTotal - player.currentBet;
      
      // Can raise if player has enough chips for a full minimum raise
      if (player.chips >= additionalForFullRaise) {
        actions.push('raise');
      }
      
      // All-in (if player has chips)
      if (player.chips > 0) {
        actions.push('all-in');
      }
      
      return actions;
    } catch (error) {
      console.error('Error in getAvailableActions:', error);
      return ['fold'];
    }
  };

  const getPlayerPosition = (seatIndex) => {
    // Full circle positioning for 9 players (0-8)
    // Start from top and go clockwise
    const angleStart = -Math.PI / 2; // Start at top (12 o'clock)
    const angleStep = (2 * Math.PI) / 9; // 360 degrees / 9 players = 40 degrees each
    const angle = angleStart + (seatIndex * angleStep);
    
    // Increased radius to push players further from center and away from UI corners
    const radiusX = 42; // Increased horizontal radius
    const radiusY = 32; // Increased vertical radius
    const centerX = 50; // Center X percentage
    const centerY = 50; // Centered vertically
    
    const x = centerX + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);
    
    return { x, y };
  };

  const renderCard = (card, isHidden = false) => {
    if (isHidden) {
      return (
        <div className={`w-8 h-12 rounded-lg flex items-center justify-center shadow-lg ${
          darkMode 
            ? 'bg-gradient-to-br from-blue-900 to-purple-900 border border-blue-700' 
            : 'bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-400'
        }`}>
          <div className="text-white text-xs">🂠</div>
        </div>
      );
    }
    
    const isRed = card.suit === '♥' || card.suit === '♦';
    return (
      <div className={`w-8 h-12 rounded-lg flex flex-col items-center justify-center shadow-lg border ${
        darkMode
          ? 'bg-gray-100 border-gray-300'
          : 'bg-white border-gray-200'
      } ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        <div className="text-xs font-bold">{card.rank}</div>
        <div className="text-sm">{card.suit}</div>
      </div>
    );
  };

  const renderPlayer = (player, index) => {
    const position = getPlayerPosition(player.seat);
    const isCurrentPlayer = index === gameState.activePlayer;
    const isDealer = index === gameState.dealerButton;
    const isHuman = player.isHuman;
    
    return (
      <div 
        key={player.id}
        className="absolute transform -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
      >
        <div className={`p-2 rounded-lg border-2 transition-all duration-300 ${
          isCurrentPlayer 
            ? (darkMode ? 'border-yellow-400 bg-yellow-900/20' : 'border-yellow-400 bg-yellow-50')
            : (darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-white/90')
        } ${!player.isActive ? 'opacity-50' : ''} backdrop-blur-sm min-w-[120px] max-w-[140px]`}>
          
          <div className="flex items-center justify-between mb-1">
            <div className={`font-semibold text-xs ${
              isHuman 
                ? (darkMode ? 'text-blue-400' : 'text-blue-600')
                : (darkMode ? 'text-gray-300' : 'text-gray-700')
            } truncate max-w-[80px]`} title={player.name}>
              {player.name}
            </div>
            {isDealer && (
              <div className="bg-red-600 text-white px-1 py-0.5 rounded text-xs font-bold">D</div>
            )}
          </div>
          
          <div className={`text-xs mb-1 space-y-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <div>Chips: {player.chips.toLocaleString()}</div>
            {player.currentBet > 0 && <div>Bet: {player.currentBet.toLocaleString()}</div>}
            {player.isAllIn && <div className="text-red-500 font-bold text-xs">ALL-IN</div>}
          </div>
          
          <div className="flex gap-1 justify-center">
            {player.holeCards.map((card, i) => (
              <div key={i}>
                {renderCard(card, !player.isHuman)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Hand Summary Component
  const HandSummaryOverlay = () => {
    if (!handSummary) return null;

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className={`max-w-4xl w-full mx-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl overflow-hidden`}>
          <div className={`p-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-b`}>
            <h2 className={`text-2xl font-bold text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              🎰 Hand {handSummary.handNumber} Summary
            </h2>
            <p className={`text-center mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {handSummary.endType === 'showdown' ? 'Showdown Results' : 'Won by Fold'}
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Community Cards */}
            <div className="text-center">
              <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Community Cards
              </h3>
              <div className="flex justify-center gap-2">
                {handSummary.communityCards.map((card, index) => (
                  <div key={index} className="transform scale-125">
                    {renderCard(card)}
                  </div>
                ))}
              </div>
            </div>

            {/* Showdown Players (if any) */}
            {handSummary.showdownPlayers.length > 0 && (
              <div>
                <h3 className={`text-lg font-semibold mb-3 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Player Hands
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {handSummary.showdownPlayers.map((player, index) => (
                    <div key={player.id} className={`p-4 rounded-lg border ${
                      darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {player.name}
                      </div>
                      <div className="flex gap-1 mb-2">
                        {player.holeCards.map((card, i) => (
                          <div key={i}>
                            {renderCard(card)}
                          </div>
                        ))}
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {player.handEvaluation.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Winners */}
            <div>
              <h3 className={`text-lg font-semibold mb-3 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Winners
              </h3>
              <div className="space-y-2">
                {handSummary.winners.map((winner, index) => (
                  <div key={index} className={`p-3 rounded-lg ${
                    darkMode ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className={`font-semibold ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
                        🏆 {winner.player.name}
                      </span>
                      <span className={`font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                        +{winner.amount.toLocaleString()} chips
                      </span>
                    </div>
                    <div className={`text-sm mt-1 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                      Total chips: {winner.player.chips.toLocaleString()}
                    </div>
                    {winner.hand && (
                      <div className={`text-sm mt-1 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                        {winner.hand}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pot Information */}
            <div className={`text-center p-4 rounded-lg ${
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <div className={`text-lg font-semibold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                Total Pot: {handSummary.totalPot.toLocaleString()} chips
              </div>
              {handSummary.sidePots.length > 1 && (
                <div className={`text-sm mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Split across {handSummary.sidePots.length} side pots
                </div>
              )}
            </div>
          </div>
          
          <div className={`p-4 text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-t`}>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Next hand starting in a few seconds...
            </div>
          </div>
        </div>
      </div>
    );
  };

  const themeClasses = darkMode ? {
    bg: 'bg-gradient-to-br from-gray-900 via-green-900 to-gray-900',
    text: 'text-white',
    card: 'bg-gray-800 border-gray-700',
    button: 'bg-gray-800 hover:bg-gray-700 border-gray-600',
    input: 'bg-gray-800 border-gray-600 text-white'
  } : {
    bg: 'bg-gradient-to-br from-green-800 via-green-600 to-green-800',
    text: 'text-white',
    card: 'bg-white/90 border-gray-300',
    button: 'bg-white hover:bg-gray-50 border-gray-300 text-gray-900',
    input: 'bg-white border-gray-300 text-gray-900'
  };

  if (gameState.phase === 'setup') {
    return (
      <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} p-6`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold">🎰 WSOP Poker Tournament</h1>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-4 py-2 rounded-lg ${themeClasses.button} transition-colors`}
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
          
          <div className={`${themeClasses.card} rounded-xl p-6 shadow-2xl backdrop-blur-sm`}>
            <h2 className={`text-2xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Player Configuration
            </h2>
            
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Your Name:
              </label>
              <input 
                type="text" 
                value={playerSetup.humanPlayer.name}
                onChange={(e) => setPlayerSetup(prev => ({
                  ...prev,
                  humanPlayer: { ...prev.humanPlayer, name: e.target.value }
                }))}
                className={`${themeClasses.input} rounded-lg px-4 py-2 w-full border`}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {playerSetup.aiPlayers.map((ai, index) => (
                <div key={index} className={`${themeClasses.card} rounded-lg p-4 border`}>
                  <div className="mb-3">
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      AI Player {index + 1}:
                    </label>
                    <input 
                      type="text"
                      value={ai.name}
                      onChange={(e) => updatePlayerName(index, e.target.value)}
                      className={`${themeClasses.input} rounded px-3 py-2 w-full border text-sm`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Strategy:
                    </label>
                    <select 
                      value={ai.strategy}
                      onChange={(e) => updatePlayerStrategy(index, e.target.value)}
                      className={`${themeClasses.input} rounded px-3 py-2 w-full border text-sm`}
                    >
                      {Object.keys(AI_STRATEGIES).map(strategy => (
                        <option key={strategy} value={strategy}>
                          {strategy === 'randomly-determined' ? 'Randomly Determined' : strategy}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              onClick={startGame} 
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-4 text-xl font-bold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              🚀 Start Tournament
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} relative overflow-hidden flex flex-col`}>
      {/* Hand Summary Overlay */}
      <HandSummaryOverlay />
      
      {/* Header */}
      <div className="flex-shrink-0 p-3 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-bold">🎰 WSOP Tournament</h1>
            <div className={`${themeClasses.card} rounded-lg px-2 py-1 border backdrop-blur-sm`}>
              <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Hand #{gameState.handNumber} • {gameState.bettingRound.toUpperCase()}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-3 py-1 rounded-lg ${themeClasses.button} transition-colors backdrop-blur-sm text-sm`}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Casino Table - Takes remaining space above bottom UI */}
      <div className="flex-1 relative" style={{ minHeight: '400px' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full h-full max-w-4xl max-h-3xl" style={{ padding: '60px' }}>
            
            {/* Table Felt */}
            <div className="absolute inset-6 bg-gradient-to-br from-green-700 to-green-900 rounded-full border-8 border-amber-600 shadow-2xl">
              <div className="absolute inset-4 border-2 border-amber-400/30 rounded-full"></div>
            </div>

            {/* Dealer Position */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
              <div className={`${themeClasses.card} rounded-lg px-2 py-1 border backdrop-blur-sm shadow-lg`}>
                <div className={`text-center text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  🎩 Dealer
                </div>
              </div>
            </div>

            {/* Community Cards and Pot */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="text-center mb-3">
                <div className={`${themeClasses.card} rounded-lg px-3 py-2 border backdrop-blur-sm shadow-lg inline-block`}>
                  <div className={`text-lg font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    💰 {gameState.pot.toLocaleString()}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {gameState.currentBet > 0 ? `Pot • Bet: ${gameState.currentBet}` : 'Pot'}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center gap-2 mb-2">
                {gameState.communityCards.map((card, index) => (
                  <div key={index} className="transform hover:scale-110 transition-transform">
                    {renderCard(card)}
                  </div>
                ))}
                {Array(5 - gameState.communityCards.length).fill(null).map((_, index) => (
                  <div key={`placeholder-${index}`} className={`w-8 h-12 rounded-lg border-2 border-dashed ${
                    darkMode ? 'border-gray-600' : 'border-gray-400'
                  } opacity-30`}></div>
                ))}
              </div>
              
              {/* Burn Cards Display */}
              {gameState.burnCards && gameState.burnCards.length > 0 && (
                <div className="text-center">
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                    Burn Cards ({gameState.burnCards.length})
                  </div>
                  <div className="flex justify-center gap-1">
                    {gameState.burnCards.map((_, index) => (
                      <div key={`burn-${index}`} className="transform scale-75">
                        {renderCard(null, true)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* All 9 Players around the table */}
            {gameState.players.map((player, index) => renderPlayer(player, index))}

          </div>
        </div>
      </div>

      {/* Bottom UI Panel - Game Log and Action Panel Side by Side */}
      <div className="flex-shrink-0 p-3 border-t border-amber-600/30 bg-black/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex gap-4 h-64">
          
          {/* Enhanced Game Log - Left Side */}
          <div className="flex-1 max-w-md">
            <div className={`${themeClasses.card} rounded-xl p-3 border h-full flex flex-col`}>
              <h3 className={`font-bold mb-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                📝 Game Log
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-2">
                {/* Current Hand Log */}
                <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'} rounded p-2`}>
                  <div className={`text-xs font-semibold mb-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    Current Hand #{gameState.handNumber}
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {gameLog.currentHand.slice(-10).map((entry, index) => (
                      <div key={index} className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                        {entry.message}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Previous Hands */}
                {gameLog.handHistory.slice(-5).reverse().map((hand, index) => (
                  <div key={hand.handNumber} className={`border rounded ${
                    darkMode ? 'border-gray-600 bg-gray-800/30' : 'border-gray-300 bg-white/30'
                  }`}>
                    <button
                      onClick={() => toggleHandExpansion(hand.handNumber)}
                      className={`w-full p-2 text-left flex justify-between items-center hover:${
                        darkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'
                      } transition-colors`}
                    >
                      <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Hand #{hand.handNumber} ({hand.log.length} actions)
                      </span>
                      <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {gameLog.expandedHands.has(hand.handNumber) ? '▼' : '▶'}
                      </span>
                    </button>
                    
                    {gameLog.expandedHands.has(hand.handNumber) && (
                      <div className="p-2 border-t border-gray-600/30 max-h-32 overflow-y-auto">
                        <div className="space-y-1">
                          {hand.log.map((entry, entryIndex) => (
                            <div key={entryIndex} className={`text-xs ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            } leading-relaxed`}>
                              {entry.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Panel - Right Side */}
          <div className="flex-1 max-w-md">
            {gameState.players && gameState.players[gameState.activePlayer] && gameState.players[gameState.activePlayer].isHuman && !gameState.players[gameState.activePlayer].isAllIn && !gameState.showingSummary ? (
              <div className={`${themeClasses.card} rounded-xl p-3 border h-full flex flex-col`}>
                <h3 className={`text-lg font-bold mb-2 text-center ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  🎯 Your Turn
                </h3>
                
                {getAvailableActions(gameState.players[gameState.activePlayer]).includes('raise') && (
                  <div className="mb-3 flex-shrink-0">
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Raise Amount: {betAmount.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min={gameState.currentBet + Math.max(gameState.lastRaiseSize, gameState.bigBlind)}
                      max={gameState.players[gameState.activePlayer].currentBet + gameState.players[gameState.activePlayer].chips}
                      value={betAmount}
                      step={Math.max(gameState.lastRaiseSize, gameState.bigBlind)}
                      onChange={(e) => setBetAmount(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className={`flex justify-between text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <span>Min: {(gameState.currentBet + Math.max(gameState.lastRaiseSize, gameState.bigBlind)).toLocaleString()}</span>
                      <span>Max: {(gameState.players[gameState.activePlayer].currentBet + gameState.players[gameState.activePlayer].chips).toLocaleString()}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex-1 flex flex-col justify-end">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {getAvailableActions(gameState.players[gameState.activePlayer]).map(action => (
                      <button 
                        key={action} 
                        onClick={() => {
                          if (action === 'raise') {
                            playerAction(action, betAmount);
                          } else {
                            playerAction(action);
                          }
                        }}
                        className={`px-3 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 transform hover:scale-105 ${
                          action === 'fold' 
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : action === 'all-in'
                            ? 'bg-purple-600 hover:bg-purple-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        } shadow-lg`}
                      >
                        {action.toUpperCase()}
                        {action === 'raise' && <div className="text-xs">({betAmount.toLocaleString()})</div>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : gameState.players && gameState.players.find(p => p.isHuman && p.isAllIn) && !gameState.showingSummary ? (
              <div className={`${themeClasses.card} rounded-xl p-3 border h-full flex flex-col justify-center`}>
                <h3 className="text-lg font-bold text-center text-purple-500 mb-2">🎲 All-In!</h3>
                <p className={`text-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Waiting for other players...
                </p>
              </div>
            ) : gameState.showingSummary ? (
              <div className={`${themeClasses.card} rounded-xl p-3 border h-full flex flex-col justify-center`}>
                <h3 className={`text-lg font-bold text-center mb-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  🏆 Hand Complete
                </h3>
                <p className={`text-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Reviewing hand summary...
                </p>
              </div>
            ) : (
              <div className={`${themeClasses.card} rounded-xl p-3 border h-full flex flex-col justify-center`}>
                <h3 className={`text-lg font-bold text-center mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  ⏳ Waiting
                </h3>
                <p className={`text-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  AI players are making their moves...
                </p>
                {gameState.processingPhase && (
                  <p className={`text-center text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Processing game state...
                  </p>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default PokerApp;