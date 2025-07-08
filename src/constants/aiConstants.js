export const AI_STRATEGIES = {
  AGGRESSIVE: 'aggressive',
  TIGHT: 'tight',
  MATHEMATICAL: 'mathematical',
  RANDOM: 'random',
  POSITIONAL: 'positional',
  BALANCED: 'balanced',
  RANDOMLY_DETERMINED: 'randomly-determined'
};

export const AI_STRATEGY_DESCRIPTIONS = {
  [AI_STRATEGIES.AGGRESSIVE]: "You are an aggressive poker player who likes to bluff, apply pressure, and play many hands.",
  [AI_STRATEGIES.TIGHT]: "You are a tight, conservative poker player who only plays strong hands.",
  [AI_STRATEGIES.MATHEMATICAL]: "You are a mathematical poker player who focuses on pot odds and expected value.",
  [AI_STRATEGIES.RANDOM]: "You play with high randomness and unpredictable patterns.",
  [AI_STRATEGIES.POSITIONAL]: "You adjust your strategy based on your seat position.",
  [AI_STRATEGIES.BALANCED]: "You play a balanced strategy, mixing aggressive and conservative play.",
  [AI_STRATEGIES.RANDOMLY_DETERMINED]: "Random strategy assigned automatically"
};

export const AI_BEHAVIOR_THRESHOLDS = {
  [AI_STRATEGIES.AGGRESSIVE]: {
    ACTION_THRESHOLD: 0.6,
    RAISE_PROBABILITY: 0.4,
    BLUFF_PROBABILITY: 0.3
  },
  [AI_STRATEGIES.TIGHT]: {
    ACTION_THRESHOLD: 0.8,
    RAISE_PROBABILITY: 0.1,
    BLUFF_PROBABILITY: 0.05
  },
  [AI_STRATEGIES.MATHEMATICAL]: {
    ACTION_THRESHOLD: 0.7,
    RAISE_PROBABILITY: 0.25,
    BLUFF_PROBABILITY: 0.15
  },
  [AI_STRATEGIES.RANDOM]: {
    ACTION_THRESHOLD: 0.5,
    RAISE_PROBABILITY: 0.33,
    BLUFF_PROBABILITY: 0.25
  },
  [AI_STRATEGIES.BALANCED]: {
    ACTION_THRESHOLD: 0.7,
    RAISE_PROBABILITY: 0.25,
    BLUFF_PROBABILITY: 0.2
  }
};