/**
 * WSOP Tournament Structure Constants
 * Defines chip denominations, blind levels, and tournament phases
 */

/**
 * @typedef {Object} ChipDenomination
 * @property {number} value - Chip value
 * @property {string} color - Chip color name
 * @property {string} code - Short code (e.g., "T-25")
 */

/**
 * @typedef {Object} BlindLevel
 * @property {number} level - Level number
 * @property {number} smallBlind - Small blind amount
 * @property {number} bigBlind - Big blind amount
 * @property {number} ante - Ante amount (0 if no ante)
 * @property {number} duration - Duration in minutes
 * @property {number[]} chipDenominations - Active chip denominations for this level
 * @property {number} minBettingIncrement - Minimum betting increment
 */

/**
 * WSOP Standard Chip Denominations
 */
export const CHIP_DENOMINATIONS = {
  25: { value: 25, color: 'Green', code: 'T-25' },
  100: { value: 100, color: 'Black', code: 'T-100' },
  500: { value: 500, color: 'Purple', code: 'T-500' },
  1000: { value: 1000, color: 'Yellow', code: 'T-1000' },
  5000: { value: 5000, color: 'Orange', code: 'T-5000' },
  25000: { value: 25000, color: 'Pink', code: 'T-25000' },
  100000: { value: 100000, color: 'Gray', code: 'T-100000' },
  500000: { value: 500000, color: 'Brown', code: 'T-500000' }
};

/**
 * WSOP Main Event Style Tournament Structure
 * Early levels use smaller denominations, later levels phase out smaller chips
 */
export const TOURNAMENT_BLIND_LEVELS = [
  // Early Stage (T-25 base) - Level 1: 100/200 (200 ante) - Ultra-patient play with 300 BB starting stack
  { level: 1, smallBlind: 100, bigBlind: 200, ante: 200, duration: 60, chipDenominations: [25, 100, 500, 1000], minBettingIncrement: 25 },
  { level: 2, smallBlind: 50, bigBlind: 100, ante: 0, duration: 60, chipDenominations: [25, 100, 500, 1000], minBettingIncrement: 25 },
  { level: 3, smallBlind: 75, bigBlind: 150, ante: 0, duration: 60, chipDenominations: [25, 100, 500, 1000], minBettingIncrement: 25 },
  { level: 4, smallBlind: 100, bigBlind: 200, ante: 0, duration: 60, chipDenominations: [25, 100, 500, 1000], minBettingIncrement: 25 },
  { level: 5, smallBlind: 150, bigBlind: 300, ante: 0, duration: 60, chipDenominations: [25, 100, 500, 1000], minBettingIncrement: 25 },
  
  // T-25 Chip Race-off (Level 6+)
  { level: 6, smallBlind: 200, bigBlind: 400, ante: 0, duration: 60, chipDenominations: [100, 500, 1000, 5000], minBettingIncrement: 100 },
  { level: 7, smallBlind: 250, bigBlind: 500, ante: 0, duration: 60, chipDenominations: [100, 500, 1000, 5000], minBettingIncrement: 100 },
  { level: 8, smallBlind: 300, bigBlind: 600, ante: 75, duration: 60, chipDenominations: [100, 500, 1000, 5000], minBettingIncrement: 100 },
  { level: 9, smallBlind: 400, bigBlind: 800, ante: 100, duration: 60, chipDenominations: [100, 500, 1000, 5000], minBettingIncrement: 100 },
  { level: 10, smallBlind: 500, bigBlind: 1000, ante: 100, duration: 60, chipDenominations: [100, 500, 1000, 5000], minBettingIncrement: 100 },
  
  // Mid-Stage - Antes introduced
  { level: 11, smallBlind: 600, bigBlind: 1200, ante: 200, duration: 60, chipDenominations: [500, 1000, 5000, 25000], minBettingIncrement: 100 },
  { level: 12, smallBlind: 800, bigBlind: 1600, ante: 200, duration: 60, chipDenominations: [500, 1000, 5000, 25000], minBettingIncrement: 100 },
  { level: 13, smallBlind: 1000, bigBlind: 2000, ante: 300, duration: 60, chipDenominations: [500, 1000, 5000, 25000], minBettingIncrement: 500 },
  { level: 14, smallBlind: 1200, bigBlind: 2400, ante: 400, duration: 60, chipDenominations: [500, 1000, 5000, 25000], minBettingIncrement: 500 },
  { level: 15, smallBlind: 1500, bigBlind: 3000, ante: 500, duration: 60, chipDenominations: [500, 1000, 5000, 25000], minBettingIncrement: 500 },
  
  // T-100 and T-500 Chip Race-off (Level 16+)
  { level: 16, smallBlind: 2000, bigBlind: 4000, ante: 500, duration: 60, chipDenominations: [1000, 5000, 25000, 100000], minBettingIncrement: 1000 },
  { level: 17, smallBlind: 2500, bigBlind: 5000, ante: 1000, duration: 60, chipDenominations: [1000, 5000, 25000, 100000], minBettingIncrement: 1000 },
  { level: 18, smallBlind: 3000, bigBlind: 6000, ante: 1000, duration: 60, chipDenominations: [1000, 5000, 25000, 100000], minBettingIncrement: 1000 },
  { level: 19, smallBlind: 4000, bigBlind: 8000, ante: 1000, duration: 60, chipDenominations: [1000, 5000, 25000, 100000], minBettingIncrement: 1000 },
  { level: 20, smallBlind: 5000, bigBlind: 10000, ante: 2000, duration: 60, chipDenominations: [1000, 5000, 25000, 100000], minBettingIncrement: 1000 },
  
  // Late Stage - Big chip denominations
  { level: 21, smallBlind: 6000, bigBlind: 12000, ante: 2000, duration: 60, chipDenominations: [5000, 25000, 100000, 500000], minBettingIncrement: 5000 },
  { level: 22, smallBlind: 8000, bigBlind: 16000, ante: 2000, duration: 60, chipDenominations: [5000, 25000, 100000, 500000], minBettingIncrement: 5000 },
  { level: 23, smallBlind: 10000, bigBlind: 20000, ante: 3000, duration: 60, chipDenominations: [5000, 25000, 100000, 500000], minBettingIncrement: 5000 },
  { level: 24, smallBlind: 12000, bigBlind: 24000, ante: 4000, duration: 60, chipDenominations: [5000, 25000, 100000, 500000], minBettingIncrement: 5000 },
  { level: 25, smallBlind: 15000, bigBlind: 30000, ante: 5000, duration: 60, chipDenominations: [5000, 25000, 100000, 500000], minBettingIncrement: 5000 }
];

/**
 * Tournament phases based on blind levels
 */
export const TOURNAMENT_PHASES = {
  EARLY: { levels: [1, 2, 3, 4, 5], description: 'Early Stage - Deep stacks, T-25 chips' },
  EARLY_MID: { levels: [6, 7, 8, 9, 10], description: 'Early-Mid Stage - T-25 chips removed' },
  MID: { levels: [11, 12, 13, 14, 15], description: 'Mid Stage - Antes introduced' },
  MID_LATE: { levels: [16, 17, 18, 19, 20], description: 'Mid-Late Stage - T-100/T-500 chips removed' },
  LATE: { levels: [21, 22, 23, 24, 25], description: 'Late Stage - High denomination chips' },
  FINAL_TABLE: { levels: [26, 27, 28, 29, 30], description: 'Final Table - Maximum pressure' }
};

/**
 * Get tournament phase for a given level
 * @param {number} level - Tournament level
 * @returns {string} Phase name
 */
export function getTournamentPhase(level) {
  for (const [phaseName, phaseData] of Object.entries(TOURNAMENT_PHASES)) {
    if (phaseData.levels.includes(level)) {
      return phaseName;
    }
  }
  return 'LATE'; // Default to late stage for levels beyond defined phases
}

/**
 * Get blind level configuration
 * @param {number} level - Tournament level
 * @returns {BlindLevel|null} Blind level configuration
 */
export function getBlindLevel(level) {
  return TOURNAMENT_BLIND_LEVELS.find(bl => bl.level === level) || null;
}

/**
 * Get minimum betting increment for current level
 * @param {number} level - Tournament level
 * @returns {number} Minimum betting increment
 */
export function getMinBettingIncrement(level) {
  const blindLevel = getBlindLevel(level);
  return blindLevel?.minBettingIncrement || 100; // Default fallback
}

/**
 * Get active chip denominations for current level
 * @param {number} level - Tournament level
 * @returns {number[]} Array of active chip values
 */
export function getActiveChipDenominations(level) {
  const blindLevel = getBlindLevel(level);
  return blindLevel?.chipDenominations || [100, 500, 1000, 5000]; // Default fallback
}

/**
 * Round betting amount to valid chip increment
 * @param {number} amount - Desired betting amount
 * @param {number} level - Tournament level
 * @returns {number} Rounded amount that can be made with available chips
 */
export function roundToChipIncrement(amount, level) {
  const increment = getMinBettingIncrement(level);
  return Math.round(amount / increment) * increment;
}

/**
 * Validate betting amount against chip denominations
 * @param {number} amount - Betting amount to validate
 * @param {number} level - Tournament level
 * @returns {boolean} True if amount can be made with available chips
 */
export function validateChipAmount(amount, level) {
  const increment = getMinBettingIncrement(level);
  return amount % increment === 0;
}

/**
 * Get next level configuration
 * @param {number} currentLevel - Current tournament level
 * @returns {BlindLevel|null} Next level configuration
 */
export function getNextBlindLevel(currentLevel) {
  return getBlindLevel(currentLevel + 1);
}

/**
 * Check if level requires chip race-off
 * @param {number} level - Tournament level
 * @returns {Object|null} Race-off information if needed
 */
export function getChipRaceOffInfo(level) {
  const currentLevel = getBlindLevel(level);
  const previousLevel = getBlindLevel(level - 1);
  
  if (!currentLevel || !previousLevel) return null;
  
  const removedChips = previousLevel.chipDenominations.filter(
    chip => !currentLevel.chipDenominations.includes(chip)
  );
  
  if (removedChips.length > 0) {
    return {
      level,
      removedChips,
      newMinIncrement: currentLevel.minBettingIncrement,
      description: `Chip race-off: ${removedChips.map(c => CHIP_DENOMINATIONS[c].code).join(', ')} chips removed`
    };
  }
  
  return null;
}