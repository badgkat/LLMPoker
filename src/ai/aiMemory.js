/**
 * AI Memory System for learning and adaptation
 * Tracks opponent behavior patterns and adjusts strategy accordingly
 */
export class AIMemory {
  constructor() {
    this.playerMemories = new Map();
    this.globalStats = {
      totalHands: 0,
      totalActions: 0,
      behaviorPatterns: new Map()
    };
  }

  /**
   * Initialize memory for a player
   * @param {number} playerId - Player ID
   * @param {string} playerName - Player name
   */
  initializePlayer(playerId, playerName) {
    if (!this.playerMemories.has(playerId)) {
      this.playerMemories.set(playerId, {
        id: playerId,
        name: playerName,
        actions: [],
        patterns: {
          aggression: 0.5,        // How aggressive they are (0-1)
          tightness: 0.5,         // How tight they play (0-1)
          bluffFrequency: 0.1,    // How often they bluff (0-1)
          foldToBet: 0.6,         // How often they fold to bets (0-1)
          raiseFrequency: 0.2,    // How often they raise (0-1)
          callFrequency: 0.3,     // How often they call (0-1)
        },
        stats: {
          handsPlayed: 0,
          totalActions: 0,
          showdowns: 0,
          wins: 0,
          biggestPot: 0,
          averageBet: 0
        },
        tendencies: {
          positionalPlay: 0.5,    // How much position affects their play
          potOddsAwareness: 0.5,  // How much they consider pot odds
          adaptability: 0.5       // How much they adapt to opponents
        }
      });
    }
  }

  /**
   * Record a player action
   * @param {number} playerId - Player ID
   * @param {Object} actionData - Action data to record
   */
  recordAction(playerId, actionData) {
    const memory = this.playerMemories.get(playerId);
    if (!memory) return;

    const actionEntry = {
      handNumber: actionData.handNumber,
      bettingRound: actionData.bettingRound,
      action: actionData.action,
      amount: actionData.amount,
      position: actionData.position,
      potSize: actionData.potSize,
      stackSize: actionData.stackSize,
      opponentsInHand: actionData.opponentsInHand,
      timestamp: Date.now(),
      context: {
        potOdds: actionData.potOdds,
        wasRaised: actionData.wasRaised,
        isBluff: actionData.isBluff || false
      }
    };

    memory.actions.push(actionEntry);
    memory.stats.totalActions++;

    // Keep only last 200 actions per player
    if (memory.actions.length > 200) {
      memory.actions.splice(0, memory.actions.length - 200);
    }

    // Update patterns based on this action
    this.updatePatterns(playerId, actionEntry);
    
    // Update global stats
    this.globalStats.totalActions++;
  }

  /**
   * Update behavior patterns based on recent actions
   * @param {number} playerId - Player ID
   * @param {Object} actionEntry - Recent action entry
   */
  updatePatterns(playerId, actionEntry) {
    const memory = this.playerMemories.get(playerId);
    if (!memory) return;

    const recentActions = memory.actions.slice(-20); // Last 20 actions
    const patterns = memory.patterns;

    // Calculate aggression (raise/bet frequency)
    const aggressiveActions = recentActions.filter(a => 
      a.action === 'raise' || a.action === 'all-in'
    ).length;
    patterns.aggression = this.smoothUpdate(
      patterns.aggression, 
      aggressiveActions / recentActions.length, 
      0.1
    );

    // Calculate tightness (fold frequency)
    const foldActions = recentActions.filter(a => a.action === 'fold').length;
    patterns.tightness = this.smoothUpdate(
      patterns.tightness,
      foldActions / recentActions.length,
      0.1
    );

    // Update action frequencies
    const raiseActions = recentActions.filter(a => a.action === 'raise').length;
    const callActions = recentActions.filter(a => a.action === 'call').length;
    
    patterns.raiseFrequency = this.smoothUpdate(
      patterns.raiseFrequency,
      raiseActions / recentActions.length,
      0.08
    );
    
    patterns.callFrequency = this.smoothUpdate(
      patterns.callFrequency,
      callActions / recentActions.length,
      0.08
    );

    // Analyze positional play
    const positionData = this.analyzePositionalPlay(recentActions);
    patterns.positionalPlay = this.smoothUpdate(
      patterns.positionalPlay,
      positionData.positionAwareness,
      0.05
    );

    // Update pot odds awareness
    const potOddsAwareness = this.analyzePotOddsAwareness(recentActions);
    memory.tendencies.potOddsAwareness = this.smoothUpdate(
      memory.tendencies.potOddsAwareness,
      potOddsAwareness,
      0.05
    );
  }

  /**
   * Analyze positional play patterns
   * @param {Array} actions - Recent actions
   * @returns {Object} Position analysis
   */
  analyzePositionalPlay(actions) {
    const positionActions = {};
    
    actions.forEach(action => {
      const pos = action.position;
      if (!positionActions[pos]) {
        positionActions[pos] = { total: 0, aggressive: 0 };
      }
      positionActions[pos].total++;
      if (action.action === 'raise' || action.action === 'all-in') {
        positionActions[pos].aggressive++;
      }
    });

    // Calculate position awareness (more aggressive in late position)
    let positionAwareness = 0.5;
    const latePositions = ['Button', 'Cutoff'];
    const earlyPositions = ['Under the Gun', 'Early Position'];

    let lateAggression = 0, earlyAggression = 0;
    let lateTotal = 0, earlyTotal = 0;

    Object.entries(positionActions).forEach(([pos, data]) => {
      if (latePositions.includes(pos)) {
        lateAggression += data.aggressive;
        lateTotal += data.total;
      } else if (earlyPositions.includes(pos)) {
        earlyAggression += data.aggressive;
        earlyTotal += data.total;
      }
    });

    if (lateTotal > 0 && earlyTotal > 0) {
      const lateAggressionRate = lateAggression / lateTotal;
      const earlyAggressionRate = earlyAggression / earlyTotal;
      positionAwareness = Math.min(1, lateAggressionRate - earlyAggressionRate + 0.5);
    }

    return { positionAwareness };
  }

  /**
   * Analyze pot odds awareness
   * @param {Array} actions - Recent actions
   * @returns {number} Pot odds awareness score
   */
  analyzePotOddsAwareness(actions) {
    let goodDecisions = 0;
    let totalDecisions = 0;

    actions.forEach(action => {
      if (action.context && action.context.potOdds) {
        totalDecisions++;
        
        // Simple heuristic: calling with good pot odds is good
        if (action.action === 'call' && action.context.potOdds > 3) {
          goodDecisions++;
        }
        // Folding with bad pot odds is good
        else if (action.action === 'fold' && action.context.potOdds < 2) {
          goodDecisions++;
        }
      }
    });

    return totalDecisions > 0 ? goodDecisions / totalDecisions : 0.5;
  }

  /**
   * Smooth update for pattern values
   * @param {number} oldValue - Previous value
   * @param {number} newValue - New observed value
   * @param {number} learningRate - Learning rate (0-1)
   * @returns {number} Updated value
   */
  smoothUpdate(oldValue, newValue, learningRate) {
    return oldValue * (1 - learningRate) + newValue * learningRate;
  }

  /**
   * Record hand result for a player
   * @param {number} playerId - Player ID
   * @param {Object} result - Hand result data
   */
  recordHandResult(playerId, result) {
    const memory = this.playerMemories.get(playerId);
    if (!memory) return;

    memory.stats.handsPlayed++;
    
    if (result.showdown) {
      memory.stats.showdowns++;
    }
    
    if (result.won) {
      memory.stats.wins++;
      memory.stats.biggestPot = Math.max(memory.stats.biggestPot, result.potWon || 0);
    }

    // Update bluff detection
    if (result.wasBluff) {
      const recentBluffs = memory.actions.filter(a => 
        a.handNumber === result.handNumber && a.context.isBluff
      ).length;
      
      memory.patterns.bluffFrequency = this.smoothUpdate(
        memory.patterns.bluffFrequency,
        recentBluffs > 0 ? 1 : 0,
        0.1
      );
    }
  }

  /**
   * Get player tendencies
   * @param {number} playerId - Player ID
   * @returns {Object} Player tendencies and patterns
   */
  getPlayerTendencies(playerId) {
    const memory = this.playerMemories.get(playerId);
    if (!memory) return null;

    return {
      patterns: { ...memory.patterns },
      tendencies: { ...memory.tendencies },
      stats: { ...memory.stats },
      reliability: Math.min(1, memory.stats.totalActions / 50) // More reliable with more data
    };
  }

  /**
   * Get strategic advice based on opponent memory
   * @param {number} opponentId - Opponent player ID
   * @param {string} situation - Current situation
   * @returns {Object} Strategic advice
   */
  getStrategicAdvice(opponentId, situation) {
    const tendencies = this.getPlayerTendencies(opponentId);
    if (!tendencies || tendencies.reliability < 0.3) {
      return { advice: 'Insufficient data', confidence: 0 };
    }

    const patterns = tendencies.patterns;
    let advice = '';
    let confidence = tendencies.reliability;

    // Generate advice based on patterns
    if (patterns.aggression > 0.7) {
      advice = 'Opponent is very aggressive - consider tighter play and trap with strong hands';
    } else if (patterns.aggression < 0.3) {
      advice = 'Opponent is passive - you can be more aggressive and bluff more often';
    }

    if (patterns.tightness > 0.7) {
      advice += '. Very tight player - their bets usually indicate strong hands';
    } else if (patterns.tightness < 0.3) {
      advice += '. Loose player - they play many hands, value bet more thinly';
    }

    if (patterns.bluffFrequency > 0.3) {
      advice += '. High bluff frequency - call down lighter';
    }

    if (tendencies.tendencies.positionalPlay > 0.6) {
      advice += '. Position-aware player - expect more aggression in late position';
    }

    return { advice, confidence, patterns };
  }

  /**
   * Export memory data for persistence
   * @returns {Object} Serializable memory data
   */
  exportMemory() {
    const exportData = {
      players: {},
      globalStats: this.globalStats,
      timestamp: Date.now()
    };

    this.playerMemories.forEach((memory, playerId) => {
      exportData.players[playerId] = {
        ...memory,
        actions: memory.actions.slice(-50) // Keep only recent actions for export
      };
    });

    return exportData;
  }

  /**
   * Import memory data
   * @param {Object} data - Memory data to import
   */
  importMemory(data) {
    if (!data || !data.players) return;

    this.globalStats = data.globalStats || this.globalStats;
    
    Object.entries(data.players).forEach(([playerId, memory]) => {
      this.playerMemories.set(parseInt(playerId), memory);
    });
  }

  /**
   * Clear all memory data
   */
  clearMemory() {
    this.playerMemories.clear();
    this.globalStats = {
      totalHands: 0,
      totalActions: 0,
      behaviorPatterns: new Map()
    };
  }

  /**
   * Get memory statistics
   * @returns {Object} Memory statistics
   */
  getMemoryStats() {
    const stats = {
      totalPlayers: this.playerMemories.size,
      globalStats: this.globalStats,
      playerSummaries: []
    };

    this.playerMemories.forEach((memory, playerId) => {
      stats.playerSummaries.push({
        id: playerId,
        name: memory.name,
        totalActions: memory.stats.totalActions,
        handsPlayed: memory.stats.handsPlayed,
        reliability: Math.min(1, memory.stats.totalActions / 50),
        patterns: {
          aggression: memory.patterns.aggression.toFixed(2),
          tightness: memory.patterns.tightness.toFixed(2),
          bluffFrequency: memory.patterns.bluffFrequency.toFixed(2)
        }
      });
    });

    return stats;
  }
}

// Export singleton instance
export const aiMemory = new AIMemory();