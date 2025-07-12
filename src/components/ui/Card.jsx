import React from 'react';
import { isRedCard } from '../../utils/deckUtils.js';

/**
 * @typedef {import('../../store/types.js').Card} Card
 */

/**
 * Card component for displaying poker cards
 * @param {Object} props
 * @param {Card} props.card - Card object to display
 * @param {boolean} props.isHidden - Whether to show card back
 * @param {boolean} props.faceDown - Alternative prop for hiding card
 * @param {string} props.size - Size of the card (xs, sm, md, lg)
 * @param {boolean} props.darkMode - Dark mode flag
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
const Card = ({ 
  card, 
  isHidden = false, 
  faceDown = false,
  size = 'md', 
  darkMode = false, 
  className = '' 
}) => {
  const sizeClasses = {
    xs: 'w-5 h-7 text-xs',
    sm: 'w-6 h-9 text-xs',
    md: 'w-8 h-12 text-xs',
    lg: 'w-10 h-14 text-sm'
  };

  if (isHidden || faceDown) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg flex items-center justify-center shadow-lg ${
        darkMode 
          ? 'bg-gradient-to-br from-blue-900 to-purple-900 border border-blue-700' 
          : 'bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-400'
      } ${className}`}>
        <div className="text-white text-xs">🂠</div>
      </div>
    );
  }
  
  if (!card) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg border-2 border-dashed ${
        darkMode ? 'border-gray-600' : 'border-gray-400'
      } opacity-30 ${className}`}></div>
    );
  }
  
  const isRed = isRedCard(card);
  
  return (
    <div className={`${sizeClasses[size]} rounded-lg flex flex-col items-center justify-center shadow-lg border ${
      darkMode
        ? 'bg-gray-100 border-gray-300'
        : 'bg-white border-gray-200'
    } ${isRed ? 'text-red-600' : 'text-gray-900'} ${className}`}>
      <div className="font-bold leading-none">{card.rank}</div>
      <div className="leading-none">{card.suit}</div>
    </div>
  );
};

export default Card;