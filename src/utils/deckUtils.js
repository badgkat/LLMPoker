import { SUITS, RANKS } from '../constants/gameConstants.js';

/**
 * @typedef {import('../store/types.js').Card} Card
 */

/**
 * Get the numeric value of a card rank
 * @param {string} rank - Card rank (2-10, J, Q, K, A)
 * @returns {number} Numeric value (2-14)
 */
export const getRankValue = (rank) => {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return parseInt(rank);
};

/**
 * Create a standard 52-card deck
 * @returns {Card[]} Array of card objects
 */
export const createDeck = () => {
  const deck = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({ 
        suit, 
        rank, 
        value: getRankValue(rank) 
      });
    });
  });
  return shuffleDeck(deck);
};

/**
 * Shuffle a deck using Fisher-Yates algorithm
 * @param {Card[]} deck - Deck to shuffle
 * @returns {Card[]} Shuffled deck
 */
export const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Deal cards from a deck
 * @param {Card[]} deck - Deck to deal from
 * @param {number} count - Number of cards to deal
 * @returns {{cards: Card[], remainingDeck: Card[]}} Dealt cards and remaining deck
 */
export const dealCards = (deck, count) => {
  if (count > deck.length) {
    throw new Error('Not enough cards in deck');
  }
  
  const cards = [];
  const remainingDeck = [...deck];
  
  for (let i = 0; i < count; i++) {
    cards.push(remainingDeck.pop());
  }
  
  return { cards, remainingDeck };
};

/**
 * Burn a card from the deck
 * @param {Card[]} deck - Deck to burn from
 * @returns {{burnCard: Card, remainingDeck: Card[]}} Burned card and remaining deck
 */
export const burnCard = (deck) => {
  if (deck.length === 0) {
    throw new Error('Cannot burn from empty deck');
  }
  
  const remainingDeck = [...deck];
  const burnCard = remainingDeck.pop();
  
  return { burnCard, remainingDeck };
};

/**
 * Check if a card is red (hearts or diamonds)
 * @param {Card} card - Card to check
 * @returns {boolean} True if card is red
 */
export const isRedCard = (card) => {
  return card.suit === '♥' || card.suit === '♦';
};

/**
 * Format a card for display
 * @param {Card} card - Card to format
 * @returns {string} Formatted card string
 */
export const formatCard = (card) => {
  return `${card.rank}${card.suit}`;
};

/**
 * Format multiple cards for display
 * @param {Card[]} cards - Cards to format
 * @returns {string} Formatted cards string
 */
export const formatCards = (cards) => {
  return cards.map(formatCard).join(' ');
};

/**
 * Validate if a card is valid
 * @param {Card} card - Card to validate
 * @returns {boolean} True if card is valid
 */
export const isValidCard = (card) => {
  return (
    card &&
    typeof card === 'object' &&
    SUITS.includes(card.suit) &&
    RANKS.includes(card.rank) &&
    card.value === getRankValue(card.rank)
  );
};

/**
 * Validate if a deck is complete (52 cards)
 * @param {Card[]} deck - Deck to validate
 * @returns {boolean} True if deck is complete
 */
export const isCompleteDeck = (deck) => {
  if (deck.length !== 52) return false;
  
  const cardStrings = deck.map(formatCard);
  const uniqueCards = new Set(cardStrings);
  
  return uniqueCards.size === 52;
};