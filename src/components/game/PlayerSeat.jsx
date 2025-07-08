import React from 'react';
import Card from '../ui/Card.jsx';

/**
 * @typedef {import('../../store/types.js').Player} Player
 */

/**
 * Get player position coordinates for circular table layout
 * @param {number} seatIndex - Seat index (0-8)
 * @returns {{x: number, y: number}} Position coordinates as percentages
 */
const getPlayerPosition = (seatIndex) => {
  const angleStart = -Math.PI / 2; // Start at top (12 o'clock)
  const angleStep = (2 * Math.PI) / 9; // 360 degrees / 9 players = 40 degrees each
  const angle = angleStart + (seatIndex * angleStep);
  
  const radiusX = 42; // Horizontal radius
  const radiusY = 32; // Vertical radius
  const centerX = 50; // Center X percentage
  const centerY = 50; // Centered vertically
  
  const x = centerX + radiusX * Math.cos(angle);
  const y = centerY + radiusY * Math.sin(angle);
  
  return { x, y };
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
  darkMode = false 
}) => {
  const position = getPlayerPosition(player.seat);
  const isHuman = player.isHuman;
  
  return (
    <div 
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      <div className={`p-2 rounded-lg border-2 transition-all duration-300 ${
        isCurrentPlayer 
          ? (darkMode ? 'border-yellow-400 bg-yellow-900/20' : 'border-yellow-400 bg-yellow-50')
          : (darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-white/90')
      } ${!player.isActive ? 'opacity-50' : ''} backdrop-blur-sm min-w-[120px] max-w-[140px]`}>
        
        {/* Player Info Header */}
        <div className="flex items-center justify-between mb-1">
          <div className={`font-semibold text-xs ${
            isHuman 
              ? (darkMode ? 'text-blue-400' : 'text-blue-600')
              : (darkMode ? 'text-gray-300' : 'text-gray-700')
          } truncate max-w-[80px]`} title={player.name}>
            {player.name}
          </div>
          {isDealer && (
            <div className="bg-red-600 text-white px-1 py-0.5 rounded text-xs font-bold">D</div>
          )}
        </div>
        
        {/* Player Stats */}
        <div className={`text-xs mb-1 space-y-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div>Chips: {player.chips.toLocaleString()}</div>
          {player.currentBet > 0 && <div>Bet: {player.currentBet.toLocaleString()}</div>}
          {player.isAllIn && <div className="text-red-500 font-bold text-xs">ALL-IN</div>}
        </div>
        
        {/* Player Cards */}
        <div className="flex gap-1 justify-center">
          {player.holeCards.map((card, i) => (
            <Card 
              key={i}
              card={card}
              isHidden={!player.isHuman}
              size="sm"
              darkMode={darkMode}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerSeat;