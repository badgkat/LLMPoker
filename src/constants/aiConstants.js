/**
 * 4-Dimensional AI Strategy Rating System
 * Based on how real poker players analyze opponents and adjust their play
 * Each dimension is rated from 0.0 to 1.0
 */

/**
 * @typedef {Object} AI4DStrategy
 * @property {number} tightness - 0.0 (Loose - plays many hands) to 1.0 (Tight - plays few hands)
 * @property {number} aggression - 0.0 (Passive - calls/checks) to 1.0 (Aggressive - bets/raises)
 * @property {number} adaptability - 0.0 (Consistent - same strategy) to 1.0 (Adaptable - changes based on situation)
 * @property {number} riskTolerance - 0.0 (Risk Adverse - avoids variance) to 1.0 (Risk Tolerant - embraces variance)
 */

// Pre-defined AI personality profiles using 4D ratings
export const AI_PERSONALITY_PROFILES = {
  NITS: {
    name: 'Nit',
    tightness: 0.9,
    aggression: 0.2,
    adaptability: 0.1,
    riskTolerance: 0.1,
    description: 'Extremely tight-passive player who only plays premium hands'
  },
  ROCK: {
    name: 'Rock',
    tightness: 0.8,
    aggression: 0.4,
    adaptability: 0.2,
    riskTolerance: 0.3,
    description: 'Solid, tight-aggressive player who plays ABC poker'
  },
  TAG: {
    name: 'TAG (Tight-Aggressive)',
    tightness: 0.7,
    aggression: 0.8,
    adaptability: 0.6,
    riskTolerance: 0.5,
    description: 'Classic tight-aggressive player with good fundamentals'
  },
  LAG: {
    name: 'LAG (Loose-Aggressive)',
    tightness: 0.3,
    aggression: 0.9,
    adaptability: 0.8,
    riskTolerance: 0.8,
    description: 'Loose-aggressive player who applies constant pressure'
  },
  CALLING_STATION: {
    name: 'Calling Station',
    tightness: 0.2,
    aggression: 0.1,
    adaptability: 0.1,
    riskTolerance: 0.6,
    description: 'Loose-passive player who calls too much and rarely folds'
  },
  MANIAC: {
    name: 'Maniac',
    tightness: 0.1,
    aggression: 0.95,
    adaptability: 0.3,
    riskTolerance: 0.95,
    description: 'Extremely loose-aggressive player who plays almost every hand aggressively'
  },
  FISH: {
    name: 'Fish',
    tightness: 0.4,
    aggression: 0.3,
    adaptability: 0.1,
    riskTolerance: 0.7,
    description: 'Recreational player with poor fundamentals and high variance'
  },
  SHARK: {
    name: 'Shark',
    tightness: 0.6,
    aggression: 0.7,
    adaptability: 0.9,
    riskTolerance: 0.4,
    description: 'Highly skilled player who adapts to opponents and situations'
  },
  PROFESSOR: {
    name: 'Professor',
    tightness: 0.8,
    aggression: 0.5,
    adaptability: 0.8,
    riskTolerance: 0.2,
    description: 'Mathematical player who makes calculated decisions based on odds'
  },
  GAMBLER: {
    name: 'Gambler',
    tightness: 0.3,
    aggression: 0.6,
    adaptability: 0.4,
    riskTolerance: 0.9,
    description: 'Action-seeking player who loves big pots and high variance'
  }
};

// Legacy strategy constants for backward compatibility
export const AI_STRATEGIES = {
  AGGRESSIVE: 'aggressive',
  TIGHT: 'tight',
  MATHEMATICAL: 'mathematical',
  RANDOM: 'random',
  POSITIONAL: 'positional',
  BALANCED: 'balanced',
  RANDOMLY_DETERMINED: 'randomly-determined'
};

// Map legacy strategies to 4D profiles
export const LEGACY_TO_4D_MAPPING = {
  [AI_STRATEGIES.AGGRESSIVE]: AI_PERSONALITY_PROFILES.LAG,
  [AI_STRATEGIES.TIGHT]: AI_PERSONALITY_PROFILES.ROCK,
  [AI_STRATEGIES.MATHEMATICAL]: AI_PERSONALITY_PROFILES.PROFESSOR,
  [AI_STRATEGIES.RANDOM]: AI_PERSONALITY_PROFILES.FISH,
  [AI_STRATEGIES.POSITIONAL]: AI_PERSONALITY_PROFILES.TAG,
  [AI_STRATEGIES.BALANCED]: AI_PERSONALITY_PROFILES.SHARK,
  [AI_STRATEGIES.RANDOMLY_DETERMINED]: AI_PERSONALITY_PROFILES.FISH
};

/**
 * Generate a random 4D strategy profile
 * @returns {AI4DStrategy} Random strategy profile
 */
export function generateRandom4DStrategy() {
  return {
    tightness: Math.random(),
    aggression: Math.random(),
    adaptability: Math.random(),
    riskTolerance: Math.random()
  };
}

/**
 * Convert 4D strategy to behavior thresholds for mathematical calculations
 * @param {AI4DStrategy} strategy - 4D strategy profile
 * @returns {Object} Behavior thresholds
 */
export function calculate4DBehaviorThresholds(strategy) {
  const { tightness, aggression, adaptability, riskTolerance } = strategy;
  
  // Convert 4D ratings to actionable thresholds (more aggressive ranges)
  const handSelectionThreshold = 0.15 + (tightness * 0.4); // 0.15-0.55 range (looser)
  const raiseFrequency = 0.2 + (aggression * 0.6); // 0.2-0.8 range (more raises)
  const bluffFrequency = (aggression * 0.25) + (riskTolerance * 0.20); // 0.0-0.45 range (much more bluffing)
  const foldThreshold = 0.25 + (tightness * 0.35); // 0.25-0.6 range (less folding)
  const adaptabilityFactor = 0.5 + (adaptability * 0.5); // 0.5-1.0 range
  
  return {
    HAND_SELECTION_THRESHOLD: handSelectionThreshold,
    RAISE_FREQUENCY: raiseFrequency,
    BLUFF_FREQUENCY: bluffFrequency,
    FOLD_THRESHOLD: foldThreshold,
    ADAPTABILITY_FACTOR: adaptabilityFactor,
    POSITION_SENSITIVITY: adaptability * 0.3, // How much position affects decisions
    VARIANCE_TOLERANCE: riskTolerance,
    BETTING_SIZE_MULTIPLIER: 0.5 + (aggression * 0.5) // 0.5-1.0x pot sizing
  };
}

/**
 * Generate LLM prompt personality description from 4D strategy
 * @param {AI4DStrategy} strategy - 4D strategy profile
 * @param {string} playerName - Name of the AI player
 * @returns {string} Personality description for LLM prompt
 */
export function generate4DPersonalityPrompt(strategy, playerName = 'AI') {
  const { tightness, aggression, adaptability, riskTolerance } = strategy;
  
  // Create descriptive text based on ratings
  const tightnessDesc = tightness > 0.7 ? 'very tight' : 
                       tightness > 0.5 ? 'somewhat tight' : 
                       tightness > 0.3 ? 'somewhat loose' : 'very loose';
  
  const aggressionDesc = aggression > 0.7 ? 'very aggressive' : 
                        aggression > 0.5 ? 'somewhat aggressive' : 
                        aggression > 0.3 ? 'somewhat passive' : 'very passive';
  
  const adaptabilityDesc = adaptability > 0.7 ? 'highly adaptable' : 
                          adaptability > 0.5 ? 'somewhat adaptable' : 
                          adaptability > 0.3 ? 'somewhat consistent' : 'very consistent';
  
  const riskDesc = riskTolerance > 0.7 ? 'loves high variance plays' : 
                  riskTolerance > 0.5 ? 'comfortable with moderate risk' : 
                  riskTolerance > 0.3 ? 'prefers low risk' : 'very risk adverse';
  
  return `You are ${playerName}, a poker player with the following characteristics:
- Playing Style: ${tightnessDesc} and ${aggressionDesc}
- Adaptability: ${adaptabilityDesc} in response to opponents and situations
- Risk Tolerance: ${riskDesc}
- Hand Selection: You play ${tightness > 0.6 ? 'few' : tightness > 0.4 ? 'moderate' : 'many'} hands
- Betting Style: You ${aggression > 0.6 ? 'frequently bet and raise' : aggression > 0.4 ? 'bet moderately' : 'prefer to call and check'}
- Decision Making: You ${adaptability > 0.6 ? 'adjust your strategy based on opponents' : 'stick to consistent patterns'}
- Variance: You ${riskTolerance > 0.6 ? 'embrace high variance situations' : 'prefer predictable outcomes'}`;
}

// Keep legacy strategy descriptions for backward compatibility
export const AI_STRATEGY_DESCRIPTIONS = {
  [AI_STRATEGIES.AGGRESSIVE]: AI_PERSONALITY_PROFILES.LAG.description,
  [AI_STRATEGIES.TIGHT]: AI_PERSONALITY_PROFILES.ROCK.description,
  [AI_STRATEGIES.MATHEMATICAL]: AI_PERSONALITY_PROFILES.PROFESSOR.description,
  [AI_STRATEGIES.RANDOM]: AI_PERSONALITY_PROFILES.FISH.description,
  [AI_STRATEGIES.POSITIONAL]: AI_PERSONALITY_PROFILES.TAG.description,
  [AI_STRATEGIES.BALANCED]: AI_PERSONALITY_PROFILES.SHARK.description,
  [AI_STRATEGIES.RANDOMLY_DETERMINED]: AI_PERSONALITY_PROFILES.FISH.description
};

// Keep legacy behavior thresholds for backward compatibility
export const AI_BEHAVIOR_THRESHOLDS = {
  [AI_STRATEGIES.AGGRESSIVE]: calculate4DBehaviorThresholds(AI_PERSONALITY_PROFILES.LAG),
  [AI_STRATEGIES.TIGHT]: calculate4DBehaviorThresholds(AI_PERSONALITY_PROFILES.ROCK),
  [AI_STRATEGIES.MATHEMATICAL]: calculate4DBehaviorThresholds(AI_PERSONALITY_PROFILES.PROFESSOR),
  [AI_STRATEGIES.RANDOM]: calculate4DBehaviorThresholds(AI_PERSONALITY_PROFILES.FISH),
  [AI_STRATEGIES.BALANCED]: calculate4DBehaviorThresholds(AI_PERSONALITY_PROFILES.SHARK)
};

/**
 * Tournament Strategy Guidance by Level
 * Provides strategic context for AI decision making based on tournament stage
 */
export const TOURNAMENT_STRATEGY = {
  LEVEL_1: {
    stackDepth: 300, // Big blinds
    phase: 'Ultra-patient play',
    keyFocus: ['Table dynamics', 'Player identification', 'Avoid unnecessary risks'],
    strategy: {
      preflop: {
        earlyPosition: 'Extremely tight - only premium hands (AA-JJ, AK)',
        middlePosition: 'Tight - add AQ, KQs',
        latePosition: 'Slightly looser - add suited connectors in favorable spots'
      },
      postflop: {
        general: 'Play fit-or-fold poker with deep stacks',
        betting: 'Value bet thin, avoid big bluffs',
        potControl: 'Keep pots small with marginal hands'
      },
      notes: [
        'With 300 BB effective stacks, there is enormous room to maneuver',
        'Focus on table dynamics and identifying weak players',
        'Avoid unnecessary risks - preservation is key',
        'Build image for later levels when stacks get shorter'
      ]
    }
  }
};

/**
 * Get tournament strategy guidance for current level
 * @param {number} level - Tournament level
 * @returns {Object} Strategy guidance object
 */
export function getTournamentStrategy(_level) {
  // For now, return Level 1 strategy for all levels
  // Future expansion: add LEVEL_2, LEVEL_3, etc.
  return TOURNAMENT_STRATEGY.LEVEL_1;
}