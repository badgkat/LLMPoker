/**
 * Detailed Backend Logging System for LLM Poker
 * 
 * This module provides comprehensive logging for:
 * - Game state changes
 * - Player actions with context
 * - AI decision reasoning
 * - Hand evaluations and showdowns
 * - Performance metrics
 * 
 * Designed for future LLM integration where AI reasoning and prompts
 * can be logged for evaluation and improvement.
 */

/**
 * @typedef {Object} LogEntry
 * @property {string} id - Unique log entry ID
 * @property {number} timestamp - Unix timestamp
 * @property {string} level - Log level (debug, info, warn, error)
 * @property {string} category - Log category (game, player, ai, system)
 * @property {string} event - Specific event type
 * @property {Object} data - Event-specific data
 * @property {Object} context - Game context at time of log
 */

/**
 * @typedef {Object} AIReasoningLog
 * @property {string} playerId - AI player ID
 * @property {string} playerName - AI player name
 * @property {string} strategy - AI strategy being used
 * @property {Object} gameContext - Game state context
 * @property {string} prompt - LLM prompt (when applicable)
 * @property {string} reasoning - AI reasoning/thought process
 * @property {Object} decision - Final decision made
 * @property {number} thinkingTime - Time taken to make decision (ms)
 * @property {Object} alternatives - Alternative actions considered
 */

class DetailedLogger {
  constructor() {
    this.logs = [];
    this.aiLogs = [];
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.isEnabled = true;
    this.maxLogs = 10000; // Prevent memory issues
  }

  /**
   * Generate a unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `poker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**s
   * @param {string} level - Log level
   * @param {string} category - Log category  
   * @param {string} event - Event type
   * @param {Object} data - Event data
   * @param {Object} gameContext - Game context
   */
  log(level, category, event, data = {}, gameContext = {}) {
    if (!this.isEnabled) return;

    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      category,
      event,
      data: this.sanitizeData(data),
      context: this.extractGameContext(gameContext),
      sessionId: this.sessionId
    };

    this.logs.push(entry);
    this.trimLogs();

  }

  /**
   * Log AI reasoning and decision making
   * @param {AIReasoningLog} aiLog - AI reasoning log
   */
  logAIReasoning(aiLog) {
    if (!this.isEnabled) return;

    const entry = {
      id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      ...aiLog
    };

    this.aiLogs.push(entry);
    this.trimAILogs();

    // Also log as regular entry for unified viewing
    this.log('info', 'ai', 'reasoning', {
      player: aiLog.playerName,
      strategy: aiLog.strategy,
      decision: aiLog.decision,
      reasoning: aiLog.reasoning?.substring(0, 100) + '...'
    }, aiLog.gameContext);

  }

  /**
   * Log player action with full context
   * @param {Object} player - Player object
   * @param {string} action - Action taken
   * @param {number} amount - Amount (if applicable)
   * @param {Object} gameState - Current game state
   * @param {Object} additionalData - Additional context
   */
  logPlayerAction(player, action, amount, gameState, additionalData = {}) {
    this.log('info', 'player', 'action', {
      playerId: player.id,
      playerName: player.name,
      isHuman: player.isHuman,
      action,
      amount,
      playerChips: player.chips,
      playerCurrentBet: player.currentBet,
      ...additionalData
    }, gameState);
  }

  /**
   * Log showdown details with hand evaluations
   * @param {Array} players - Players in showdown
   * @param {Array} winners - Winning players with hand details
   * @param {Array} sidePots - Side pot information
   * @param {Object} gameState - Game state
   */
  logShowdown(players, winners, sidePots, gameState) {
    const showdownData = {
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        holeCards: p.holeCards,
        handEvaluation: p.handEvaluation
      })),
      winners: winners.map(w => ({
        playerId: w.player.id,
        playerName: w.player.name,
        handDescription: w.hand,
        amountWon: w.amount,
        potIndex: w.potIndex
      })),
      sidePots,
      communityCards: gameState.communityCards,
      totalPot: gameState.pot
    };

    this.log('info', 'game', 'showdown', showdownData, gameState);
  }

  /**
   * Log game state change
   * @param {Object} oldState - Previous game state
   * @param {Object} newState - New game state
   * @param {string} trigger - What triggered the change
   */
  logGameStateChange(oldState, newState, trigger) {
    const changes = this.detectStateChanges(oldState, newState);
    
    if (Object.keys(changes).length > 0) {
      this.log('debug', 'game', 'state_change', {
        trigger,
        changes,
        handNumber: newState.handNumber,
        bettingRound: newState.bettingRound,
        activePlayer: newState.activePlayer
      }, newState);
    }
  }

  /**
   * Log error with full context
   * @param {Error} error - Error object
   * @param {string} context - Context where error occurred
   * @param {Object} gameState - Game state when error occurred
   */
  logError(error, context, gameState = {}) {
    this.log('error', 'system', 'error', {
      message: error.message,
      stack: error.stack,
      context,
      errorType: error.constructor.name
    }, gameState);
  }

  /**
   * Sanitize data for logging (remove circular references, limit size)
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  sanitizeData(data) {
    try {
      // Convert to JSON and back to remove circular references
      const jsonString = JSON.stringify(data, this.getCircularReplacer(), 2);
      const parsed = JSON.parse(jsonString);
      
      // Limit string length
      return this.limitStringLengths(parsed, 1000);
    } catch (error) {
      return { error: 'Failed to sanitize data', original: String(data) };
    }
  }

  /**
   * Extract relevant game context for logging
   * @param {Object} gameState - Full game state
   * @returns {Object} Relevant context
   */
  extractGameContext(gameState) {
    if (!gameState || typeof gameState !== 'object') return {};
    
    return {
      handNumber: gameState.handNumber,
      bettingRound: gameState.bettingRound,
      activePlayer: gameState.activePlayer,
      currentBet: gameState.currentBet,
      pot: gameState.pot,
      phase: gameState.phase,
      activePlayers: gameState.players?.filter(p => p.isActive).length || 0,
      communityCardCount: gameState.communityCards?.length || 0
    };
  }

  /**
   * Detect changes between two game states
   * @param {Object} oldState - Previous state
   * @param {Object} newState - New state
   * @returns {Object} Changes detected
   */
  detectStateChanges(oldState, newState) {
    const changes = {};
    
    if (!oldState || !newState) return changes;
    
    const keysToWatch = [
      'handNumber', 'bettingRound', 'activePlayer', 'currentBet', 
      'pot', 'phase', 'processingPhase', 'showingSummary'
    ];
    
    keysToWatch.forEach(key => {
      if (oldState[key] !== newState[key]) {
        changes[key] = { from: oldState[key], to: newState[key] };
      }
    });
    
    return changes;
  }

  /**
   * Helper to handle circular references in JSON.stringify
   * @returns {Function} Replacer function
   */
  getCircularReplacer() {
    const seen = new WeakSet();
    return (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    };
  }

  /**
   * Limit string lengths in nested objects
   * @param {any} obj - Object to process
   * @param {number} maxLength - Maximum string length
   * @returns {any} Processed object
   */
  limitStringLengths(obj, maxLength) {
    if (typeof obj === 'string') {
      return obj.length > maxLength ? obj.substring(0, maxLength) + '...' : obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.limitStringLengths(item, maxLength));
    }
    
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.limitStringLengths(value, maxLength);
      }
      return result;
    }
    
    return obj;
  }

  /**
   * Trim logs to prevent memory issues
   */
  trimLogs() {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Trim AI logs to prevent memory issues
   */
  trimAILogs() {
    if (this.aiLogs.length > this.maxLogs) {
      this.aiLogs = this.aiLogs.slice(-this.maxLogs);
    }
  }

  /**
   * Get logs filtered by criteria
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered logs
   */
  getLogs(filters = {}) {
    let filtered = [...this.logs];
    
    if (filters.level) {
      filtered = filtered.filter(log => log.level === filters.level);
    }
    
    if (filters.category) {
      filtered = filtered.filter(log => log.category === filters.category);
    }
    
    if (filters.event) {
      filtered = filtered.filter(log => log.event === filters.event);
    }
    
    if (filters.handNumber) {
      filtered = filtered.filter(log => log.context.handNumber === filters.handNumber);
    }
    
    if (filters.since) {
      filtered = filtered.filter(log => log.timestamp >= filters.since);
    }
    
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get AI reasoning logs with filters
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered AI logs
   */
  getAILogs(filters = {}) {
    let filtered = [...this.aiLogs];
    
    if (filters.playerId) {
      filtered = filtered.filter(log => log.playerId === filters.playerId);
    }
    
    if (filters.strategy) {
      filtered = filtered.filter(log => log.strategy === filters.strategy);
    }
    
    if (filters.handNumber) {
      filtered = filtered.filter(log => log.gameContext?.handNumber === filters.handNumber);
    }
    
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Export logs for analysis
   * @param {string} format - Export format ('json' or 'csv')
   * @returns {string} Exported data
   */
  exportLogs(format = 'json') {
    if (format === 'json') {
      return JSON.stringify({
        sessionId: this.sessionId,
        startTime: this.startTime,
        endTime: Date.now(),
        logs: this.logs,
        aiLogs: this.aiLogs
      }, null, 2);
    }
    
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'category', 'event', 'data', 'context'];
      const rows = this.logs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.level,
        log.category,
        log.event,
        JSON.stringify(log.data),
        JSON.stringify(log.context)
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    this.aiLogs = [];
  }

  /**
   * Enable/disable logging
   * @param {boolean} enabled - Whether to enable logging
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Get logging statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const now = Date.now();
    const sessionDuration = now - this.startTime;
    
    const logsByCategory = {};
    this.logs.forEach(log => {
      logsByCategory[log.category] = (logsByCategory[log.category] || 0) + 1;
    });
    
    const logsByLevel = {};
    this.logs.forEach(log => {
      logsByLevel[log.level] = (logsByLevel[log.level] || 0) + 1;
    });
    
    return {
      sessionId: this.sessionId,
      sessionDuration,
      totalLogs: this.logs.length,
      totalAILogs: this.aiLogs.length,
      logsByCategory,
      logsByLevel,
      memoryUsage: {
        logs: this.logs.length,
        aiLogs: this.aiLogs.length,
        maxLogs: this.maxLogs
      }
    };
  }
}

// Create singleton instance
export const detailedLogger = new DetailedLogger();

// Convenience functions
export const logPlayerAction = (player, action, amount, gameState, additionalData) => 
  detailedLogger.logPlayerAction(player, action, amount, gameState, additionalData);

export const logAIReasoning = (aiLog) => 
  detailedLogger.logAIReasoning(aiLog);

export const logShowdown = (players, winners, sidePots, gameState) => 
  detailedLogger.logShowdown(players, winners, sidePots, gameState);

export const logGameStateChange = (oldState, newState, trigger) => 
  detailedLogger.logGameStateChange(oldState, newState, trigger);

export const logError = (error, context, gameState) => 
  detailedLogger.logError(error, context, gameState);

export default detailedLogger;