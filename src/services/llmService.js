/**
 * Multi-provider LLM Service for AI poker decisions
 * Supports multiple AI providers including OpenAI, Anthropic, and local models
 */

/**
 * @typedef {Object} LLMConfig
 * @property {'openai'|'anthropic'|'local'|'mock'} provider - The LLM provider to use
 * @property {string} apiKey - API key for the provider
 * @property {string} model - Model name to use
 * @property {string} baseURL - Base URL for API calls
 * @property {number} maxTokens - Maximum tokens for responses
 * @property {number} temperature - Temperature for randomness
 */

/**
 * @typedef {Object} LLMResponse
 * @property {string} action - The poker action to take
 * @property {number} amount - The amount for raises/bets
 * @property {string} reasoning - The AI's reasoning for the decision
 */

export class LLMService {
  constructor() {
    this.config = this.loadConfig();
    this.initialized = false;
  }

  /**
   * Load configuration from environment or defaults
   * @returns {LLMConfig}
   */
  loadConfig() {
    // Try to load from environment variables or localStorage
    const provider = import.meta.env.VITE_LLM_PROVIDER || 
                    localStorage.getItem('llm_provider') || 
                    'mock';
    
    return {
      provider,
      apiKey: import.meta.env.VITE_LLM_API_KEY || 
              localStorage.getItem('llm_api_key') || '',
      model: this.getDefaultModel(provider),
      baseURL: this.getDefaultBaseURL(provider),
      maxTokens: 500,
      temperature: 0.7
    };
  }

  /**
   * Get default model for provider
   * @param {string} provider - The provider name
   * @returns {string}
   */
  getDefaultModel(provider) {
    switch (provider) {
      case 'openai':
        return 'gpt-4o-mini';
      case 'anthropic':
        return 'claude-3-haiku-20240307';
      case 'local':
        return 'llama3.1:8b';
      default:
        return 'mock';
    }
  }

  /**
   * Get default base URL for provider
   * @param {string} provider - The provider name
   * @returns {string}
   */
  getDefaultBaseURL(provider) {
    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'local':
        return 'http://localhost:11434/v1'; // Ollama default
      default:
        return '';
    }
  }

  /**
   * Initialize the LLM service
   * @param {Partial<LLMConfig>} config - Optional configuration override
   */
  async initialize(config = {}) {
    this.config = { ...this.config, ...config };
    
    try {
      await this.testConnection();
      this.initialized = true;
    } catch (error) {
      console.warn(`Failed to initialize ${this.config.provider}, falling back to mock:`, error.message);
      this.config.provider = 'mock';
      this.initialized = true;
    }
  }

  /**
   * Test connection to the LLM provider
   */
  async testConnection() {
    if (this.config.provider === 'mock') {
      return; // Mock provider always works
    }

    const testPrompt = "Test connection. Respond with just 'OK'.";
    
    try {
      await this.makeRequest(testPrompt);
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  /**
   * Get AI decision for poker action
   * @param {string} prompt - The formatted prompt for the AI
   * @returns {Promise<LLMResponse>}
   */
  async getAIDecision(prompt) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const response = await this.makeRequest(prompt);
      const decision = this.parseResponse(response);
      return decision;
    } catch (error) {
      console.error('LLM request failed:', error);
      const fallback = this.getFallbackResponse();
      console.warn('LLM Service returning fallback:', fallback);
      return fallback;
    }
  }

  /**
   * Make request to the configured LLM provider
   * @param {string} prompt - The prompt to send
   * @returns {Promise<string>}
   */
  async makeRequest(prompt) {
    switch (this.config.provider) {
      case 'openai':
        return this.makeOpenAIRequest(prompt);
      case 'anthropic':
        return this.makeAnthropicRequest(prompt);
      case 'local':
        return this.makeLocalRequest(prompt);
      default:
        return this.makeMockRequest(prompt);
    }
  }

  /**
   * Make request to OpenAI API
   * @param {string} prompt - The prompt to send
   * @returns {Promise<string>}
   */
  async makeOpenAIRequest(prompt) {
    const response = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a poker AI. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Make request to Anthropic API
   * @param {string} prompt - The prompt to send
   * @returns {Promise<string>}
   */
  async makeAnthropicRequest(prompt) {
    const response = await fetch(`${this.config.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  /**
   * Make request to local LLM (e.g., Ollama)
   * @param {string} prompt - The prompt to send
   * @returns {Promise<string>}
   */
  async makeLocalRequest(prompt) {
    const response = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a poker AI. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Local LLM error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Mock request for testing/fallback - improved with mathematical decision tree
   * @param {string} prompt - The prompt containing game state
   * @returns {Promise<string>}
   */
  async makeMockRequest(prompt) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Extract game context from prompt
    const gameContext = this.extractGameContext(prompt);
    
    // Get hand strength evaluation
    const handStrength = this.evaluateHandFromPrompt(prompt);
    
    // Make decision based on mathematical decision tree
    const decision = this.makeMathematicalDecision(gameContext, handStrength);
    
    return JSON.stringify(decision);
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
      stackSize: playerChips // chips remaining
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
    
    // Use fallback evaluation for now (can be improved later with proper async handling)
    return this.fallbackHandEvaluation(holeCards, communityCards);
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
   * Fallback hand evaluation if main evaluation fails
   * @param {Array} holeCards - Hole cards
   * @param {Array} communityCards - Community cards
   * @returns {number} Hand strength estimate
   */
  fallbackHandEvaluation(holeCards, communityCards) {
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
    
    // Post-flop fallback - more realistic evaluation
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
   * @param {Object} context - Game context
   * @param {number} handStrength - Hand strength (0-1000)
   * @returns {Object} Decision object
   */
  makeMathematicalDecision(context, handStrength) {
    const { availableActions, callAmount, potSize, potOdds, position, round, stackSize } = context;
    
    // Position multipliers (early position plays tighter)
    const positionMultiplier = this.getPositionMultiplier(position);
    const adjustedHandStrength = handStrength * positionMultiplier;
    
    // Stack size considerations
    const stackRatio = stackSize / potSize;
    const isShortStack = stackRatio < 10;
    const isDeepStack = stackRatio > 50;
    
    // Decision thresholds based on hand strength (lowered to be more aggressive)
    const foldThreshold = round === 'preflop' ? 180 : 150;
    const callThreshold = round === 'preflop' ? 300 : 250;
    const raiseThreshold = round === 'preflop' ? 500 : 450;
    const allInThreshold = round === 'preflop' ? 750 : 700;
    
    // Check if we're getting good pot odds (more lenient)
    const hasGoodPotOdds = potOdds >= 2.5; // 2.5:1 or better
    const hasGreatPotOdds = potOdds >= 4.0; // 4:1 or better
    
    
    // Add some semi-bluffing and position-based aggression
    const shouldBluff = Math.random() < 0.15 && position === 'Button' && round !== 'preflop';
    const shouldSemiBluff = Math.random() < 0.1 && adjustedHandStrength >= 200 && round === 'flop';
    
    // Decision logic with improved aggression
    if (adjustedHandStrength >= allInThreshold || (isShortStack && adjustedHandStrength >= raiseThreshold)) {
      // Very strong hand or short stack with good hand
      if (availableActions.includes('all-in')) {
        return { action: 'all-in', amount: 0, reasoning: 'Very strong hand - all-in' };
      } else if (availableActions.includes('raise')) {
        const raiseAmount = this.calculateRaiseAmount(context, 'aggressive');
        return { action: 'raise', amount: raiseAmount, reasoning: 'Strong hand - aggressive raise' };
      } else if (availableActions.includes('call')) {
        return { action: 'call', amount: 0, reasoning: 'Strong hand - call' };
      }
    } else if (adjustedHandStrength >= raiseThreshold || shouldBluff || shouldSemiBluff) {
      // Strong hand, bluff, or semi-bluff - raise for value or as bluff
      if (availableActions.includes('raise')) {
        const strategy = shouldBluff ? 'bluff' : (shouldSemiBluff ? 'aggressive' : 'value');
        const raiseAmount = this.calculateRaiseAmount(context, strategy);
        const reasoning = shouldBluff ? 'Position bluff' : (shouldSemiBluff ? 'Semi-bluff with draws' : 'Strong hand - value raise');
        return { action: 'raise', amount: raiseAmount, reasoning };
      } else if (availableActions.includes('call')) {
        return { action: 'call', amount: 0, reasoning: 'Strong hand - call' };
      }
    } else if (adjustedHandStrength >= callThreshold || (hasGoodPotOdds && adjustedHandStrength >= 200) || hasGreatPotOdds) {
      // Decent hand, good pot odds, or great pot odds - call
      if (availableActions.includes('call')) {
        const reasoning = hasGreatPotOdds ? 'Great pot odds - call' : (hasGoodPotOdds ? 'Good pot odds - call' : 'Decent hand - call');
        return { action: 'call', amount: 0, reasoning };
      } else if (availableActions.includes('check')) {
        return { action: 'check', amount: 0, reasoning: 'Decent hand - check' };
      }
    } else if (adjustedHandStrength >= foldThreshold && callAmount === 0) {
      // Weak hand but free to see more cards
      if (availableActions.includes('check')) {
        return { action: 'check', amount: 0, reasoning: 'Weak hand - check for free card' };
      }
    } else if (hasGreatPotOdds && adjustedHandStrength >= 100) {
      // Great pot odds with any hand - call
      if (availableActions.includes('call')) {
        return { action: 'call', amount: 0, reasoning: 'Great pot odds - speculative call' };
      }
    }
    
    // Default to fold
    if (availableActions.includes('fold')) {
      return { action: 'fold', amount: 0, reasoning: 'Weak hand - fold' };
    }
    
    // Emergency fallback
    return { action: availableActions[0], amount: 0, reasoning: 'Emergency fallback decision' };
  }

  /**
   * Get position multiplier for hand strength
   * @param {string} position - Player position
   * @returns {number} Multiplier (0.8 to 1.2)
   */
  getPositionMultiplier(position) {
    switch (position.toLowerCase()) {
      case 'button': return 1.15;
      case 'cutoff': return 1.05;
      case 'small blind': return 0.95;
      case 'big blind': return 1.0; // BB gets to see flop cheap
      case 'under the gun': return 0.85;
      default: return 0.95;
    }
  }

  /**
   * Calculate raise amount based on context and strategy
   * @param {Object} context - Game context
   * @param {string} strategy - 'value', 'aggressive', 'bluff'
   * @returns {number} Raise amount
   */
  calculateRaiseAmount(context, strategy = 'value') {
    const { potSize, minRaise, playerChips, callAmount } = context;
    const currentGameBet = callAmount; // Estimate current bet level
    
    let raiseMultiplier;
    switch (strategy) {
      case 'aggressive':
        raiseMultiplier = 0.8 + Math.random() * 0.4; // 80-120% pot
        break;
      case 'value':
        raiseMultiplier = 0.5 + Math.random() * 0.3; // 50-80% pot
        break;
      case 'bluff':
        raiseMultiplier = 0.6 + Math.random() * 0.2; // 60-80% pot
        break;
      default:
        raiseMultiplier = 0.6; // 60% pot
    }
    
    const targetRaise = Math.floor(potSize * raiseMultiplier);
    const minRaiseTotal = currentGameBet + Math.max(minRaise, 200);
    const maxRaiseTotal = Math.min(playerChips, currentGameBet + Math.floor(potSize * 1.5));
    
    // Ensure raise is within valid bounds
    const raiseAmount = Math.max(minRaiseTotal, Math.min(targetRaise, maxRaiseTotal));
    return raiseAmount;
  }

  /**
   * Parse LLM response into structured format
   * @param {string} response - Raw LLM response
   * @returns {LLMResponse}
   */
  parseResponse(response) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response.trim());
      
      // Validate required fields
      if (!parsed.action) {
        throw new Error('Missing action field');
      }
      
      return {
        action: parsed.action,
        amount: parsed.amount || 0,
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch (error) {
      console.warn('Failed to parse LLM response as JSON:', error);
      
      // Try to extract action from text response
      const lowerResponse = response.toLowerCase();
      let action = 'fold';
      
      if (lowerResponse.includes('raise')) action = 'raise';
      else if (lowerResponse.includes('call')) action = 'call';
      else if (lowerResponse.includes('check')) action = 'check';
      else if (lowerResponse.includes('all-in') || lowerResponse.includes('allin')) action = 'all-in';
      
      return {
        action,
        amount: 0,
        reasoning: 'Parsed from text response'
      };
    }
  }

  /**
   * Get fallback response when LLM fails
   * @returns {LLMResponse}
   */
  getFallbackResponse() {
    return {
      action: 'fold',
      amount: 0,
      reasoning: 'Fallback decision due to LLM error'
    };
  }

  /**
   * Update configuration
   * @param {Partial<LLMConfig>} newConfig - New configuration values
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.initialized = false;
    
    // Save to localStorage for persistence
    if (newConfig.provider) {
      localStorage.setItem('llm_provider', newConfig.provider);
    }
    if (newConfig.apiKey) {
      localStorage.setItem('llm_api_key', newConfig.apiKey);
    }
  }

  /**
   * Get current configuration (without sensitive data)
   * @returns {Object}
   */
  getConfig() {
    return {
      provider: this.config.provider,
      model: this.config.model,
      baseURL: this.config.baseURL,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      hasApiKey: !!this.config.apiKey
    };
  }

  /**
   * Get available providers
   * @returns {Array<{id: string, name: string, description: string}>}
   */
  getAvailableProviders() {
    return [
      {
        id: 'openai',
        name: 'OpenAI',
        description: 'GPT models from OpenAI (requires API key)'
      },
      {
        id: 'anthropic',
        name: 'Anthropic',
        description: 'Claude models from Anthropic (requires API key)'
      },
      {
        id: 'local',
        name: 'Local LLM',
        description: 'Local model via Ollama or similar (no API key required)'
      },
      {
        id: 'mock',
        name: 'Mock AI',
        description: 'Simple mock AI for testing (no setup required)'
      }
    ];
  }

  /**
   * Test if provider is accessible
   * @param {string} provider - Provider to test
   * @param {string} apiKey - API key to test (optional)
   * @returns {Promise<boolean>}
   */
  async testProvider(provider, apiKey = '') {
    const tempConfig = { ...this.config, provider, apiKey };
    const tempService = new LLMService();
    tempService.config = tempConfig;
    
    try {
      await tempService.testConnection();
      return true;
    } catch (error) {
      console.warn(`Provider ${provider} test failed:`, error.message);
      return false;
    }
  }
}

// Export singleton instance
export const llmService = new LLMService();

// Auto-initialize with default config
llmService.initialize().catch(console.warn);