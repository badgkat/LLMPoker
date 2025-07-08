import React from 'react';
import Card from '../ui/Card.jsx';

/**
 * @typedef {import('../../store/types.js').Card} Card
 */

/**
 * CommunityCards component for displaying the community cards and pot
 * @param {Object} props
 * @param {Card[]} props.communityCards - Array of community cards
 * @param {Card[]} props.burnCards - Array of burn cards
 * @param {number} props.pot - Current pot size
 * @param {number} props.currentBet - Current bet amount
 * @param {boolean} props.darkMode - Dark mode flag
 * @returns {JSX.Element}
 */
const CommunityCards = ({ 
  communityCards = [], 
  burnCards = [], 
  pot = 0, 
  currentBet = 0, 
  darkMode = false 
}) => {
  const themeClasses = darkMode ? {
    card: 'bg-gray-800 border-gray-700',
    text: 'text-gray-300',
    potText: 'text-yellow-400',
    burnText: 'text-gray-400'
  } : {
    card: 'bg-white/90 border-gray-300',
    text: 'text-gray-600',
    potText: 'text-yellow-600',
    burnText: 'text-gray-600'
  };

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      {/* Pot Display */}
      <div className="text-center mb-3">
        <div className={`${themeClasses.card} rounded-lg px-3 py-2 border backdrop-blur-sm shadow-lg inline-block`}>
          <div className={`text-lg font-bold ${themeClasses.potText}`}>
            💰 {pot.toLocaleString()}
          </div>
          <div className={`text-xs ${themeClasses.text}`}>
            {currentBet > 0 ? `Pot • Bet: ${currentBet}` : 'Pot'}
          </div>
        </div>
      </div>
      
      {/* Community Cards */}
      <div className="flex justify-center gap-2 mb-2">
        {communityCards.map((card, index) => (
          <div key={index} className="transform hover:scale-110 transition-transform">
            <Card 
              card={card}
              size="md"
              darkMode={darkMode}
            />
          </div>
        ))}
        {/* Placeholder cards */}
        {Array(5 - communityCards.length).fill(null).map((_, index) => (
          <Card 
            key={`placeholder-${index}`}
            card={null}
            size="md"
            darkMode={darkMode}
          />
        ))}
      </div>
      
      {/* Burn Cards Display */}
      {burnCards && burnCards.length > 0 && (
        <div className="text-center">
          <div className={`text-xs ${themeClasses.burnText} mb-1`}>
            Burn Cards ({burnCards.length})
          </div>
          <div className="flex justify-center gap-1">
            {burnCards.map((_, index) => (
              <div key={`burn-${index}`} className="transform scale-75">
                <Card 
                  card={null}
                  isHidden={true}
                  size="sm"
                  darkMode={darkMode}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityCards;