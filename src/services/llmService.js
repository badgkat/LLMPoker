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
      console.log(`LLM Service initialized with ${this.config.provider} provider`);
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
      return this.parseResponse(response);
    } catch (error) {
      console.error('LLM request failed:', error);
      return this.getFallbackResponse();
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
   * Mock request for testing/fallback
   * @param {string} prompt - The prompt (ignored in mock)
   * @returns {Promise<string>}
   */
  async makeMockRequest(prompt) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Return mock poker decisions
    const mockDecisions = [
      { action: 'fold', amount: 0, reasoning: 'Mock: Weak hand, folding' },
      { action: 'call', amount: 0, reasoning: 'Mock: Calling to see more cards' },
      { action: 'check', amount: 0, reasoning: 'Mock: Checking for free card' },
      { action: 'raise', amount: 400, reasoning: 'Mock: Strong hand, raising for value' }
    ];
    
    const decision = mockDecisions[Math.floor(Math.random() * mockDecisions.length)];
    return JSON.stringify(decision);
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