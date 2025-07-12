import React from 'react';
import Card from '../ui/Card.jsx';

/**
 * @typedef {import('../../store/types.js').Player} Player
 */

/**
 * Get player position coordinates for semi-circle table layout
 * @param {number} seatIndex - Seat index (0-8) 
 * @param {number} totalPlayers - Total number of players
 * @returns {{x: number, y: number}} Position coordinates as percentages
 */
const getPlayerPosition = (seatIndex, totalPlayers = 9) => {
  // Define well-spaced positions around the table to prevent overlap
  // Increased spacing and moved positions further apart
  const positions = [
    { x: 88, y: 30 }, // Position 0 - Right top
    { x: 94, y: 50 }, // Position 1 - Right middle  
    { x: 88, y: 70 }, // Position 2 - Right bottom
    { x: 72, y: 82 }, // Position 3 - Bottom right
    { x: 50, y: 85 }, // Position 4 - Bottom center
    { x: 28, y: 82 }, // Position 5 - Bottom left
    { x: 12, y: 70 }, // Position 6 - Left bottom
    { x: 6, y: 50 },  // Position 7 - Left middle
    { x: 12, y: 30 }  // Position 8 - Left top
  ];
  
  // For fewer players, use well-distributed positions with maximum spacing
  const positionSets = {
    1: [4], // Bottom center only
    2: [3, 5], // Bottom corners only  
    3: [1, 4, 7], // Right, Bottom center, Left
    4: [0, 3, 5, 8], // Four corners spread out
    5: [0, 2, 4, 6, 8], // Five well-spaced positions
    6: [0, 1, 3, 5, 7, 8], // Six positions with good spacing
    7: [0, 1, 2, 4, 6, 7, 8], // Seven positions
    8: [0, 1, 2, 3, 5, 6, 7, 8], // Eight positions (skip center)
    9: [0, 1, 2, 3, 4, 5, 6, 7, 8] // All nine positions
  };
  
  const selectedPositions = positionSets[totalPlayers] || positionSets[9];
  const positionIndex = selectedPositions[seatIndex];
  
  return positions[positionIndex] || positions[0];
};

/**
 * PlayerSeat component for displaying individual players
 * @param {Object} props
 * @param {Player} props.player - Player object
 * @param {number} props.index - Player index in array
 * @param {boolean} props.isCurrentPlayer - Whether this is the active player
 * @param {boolean} props.isDealer - Whether this player has dealer button
 * @param {boolean} props.darkMode - Dark mode flag
 * @returns {JSX.Element}
 */
const PlayerSeat = ({ 
  player, 
  index, 
  isCurrentPlayer = false, 
  isDealer = false, 
  darkMode = false,
  totalPlayers = 9
}) => {
  const position = getPlayerPosition(player.seat, totalPlayers);
  const isHuman = player.isHuman;
  
  return (
    <div 
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      <div className={`p-1 rounded-lg border-2 transition-all duration-300 ${
        isCurrentPlayer 
          ? (darkMode ? 'border-yellow-400 bg-yellow-900/20' : 'border-yellow-400 bg-yellow-50')
          : (darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-white/90')
      } ${!player.isActive ? 'opacity-50' : ''} backdrop-blur-sm min-w-[80px] max-w-[100px]`}>
        
        {/* Player Info Header */}
        <div className="flex items-center justify-between mb-0.5">
          <div className={`font-semibold text-xs ${
            isHuman 
              ? (darkMode ? 'text-blue-400' : 'text-blue-600')
              : (darkMode ? 'text-gray-300' : 'text-gray-700')
          } truncate max-w-[70px]`} title={player.name}>
            {isHuman ? 'You' : player.name.split(' ')[0]}
          </div>
          {isDealer && (
            <div className="bg-red-600 text-white px-1 py-0.5 rounded text-xs font-bold">D</div>
          )}
        </div>
        
        {/* Player Stats - More Compact */}
        <div className={`text-xs mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="flex justify-between">
            <span>💰{(player.chips / 1000).toFixed(0)}K</span>
            {player.currentBet > 0 && <span>🎯{player.currentBet.toLocaleString()}</span>}
          </div>
          {player.isAllIn && <div className="text-red-500 font-bold text-center">ALL-IN</div>}
        </div>
        
        {/* Player Cards */}
        <div className="flex gap-0.5 justify-center">
          {player.holeCards.map((card, i) => (
            <Card 
              key={i}
              card={card}
              isHidden={!player.isHuman}
              size="xs"
              darkMode={darkMode}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerSeat;