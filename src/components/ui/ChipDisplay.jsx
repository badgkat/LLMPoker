import React from 'react';
import { 
  getActiveChipDenominations, 
  CHIP_DENOMINATIONS,
  getTournamentPhase 
} from '../../constants/tournamentConstants.js';

/**
 * ChipDisplay component shows active chip denominations
 * @param {Object} props
 * @param {number} props.tournamentLevel - Current tournament level
 * @param {boolean} props.darkMode - Dark mode flag
 * @param {boolean} props.compact - Compact display mode
 * @returns {JSX.Element}
 */
const ChipDisplay = ({ tournamentLevel, darkMode = false, compact = false }) => {
  const activeChips = getActiveChipDenominations(tournamentLevel);
  const phase = getTournamentPhase(tournamentLevel);
  
  const getChipColor = (value) => {
    const chip = CHIP_DENOMINATIONS[value];
    if (!chip) return 'bg-gray-500';
    
    const colorMap = {
      'Green': 'bg-green-500',
      'Black': 'bg-gray-900',
      'Purple': 'bg-purple-500',
      'Yellow': 'bg-yellow-500',
      'Orange': 'bg-orange-500',
      'Pink': 'bg-pink-500',
      'Gray': 'bg-gray-600',
      'Brown': 'bg-yellow-800'
    };
    
    return colorMap[chip.color] || 'bg-gray-500';
  };
  
  const themeClasses = darkMode ? {
    container: 'bg-gray-800 border-gray-700 text-white',
    text: 'text-gray-300'
  } : {
    container: 'bg-white border-gray-300 text-gray-900',
    text: 'text-gray-600'
  };
  
  if (compact) {
    return (
      <div className={`${themeClasses.container} rounded-lg border p-2`}>
        <div className={`text-xs font-medium mb-1 ${themeClasses.text}`}>
          Level {tournamentLevel} • {phase}
        </div>
        <div className="flex gap-1">
          {activeChips.map(value => (
            <div 
              key={value}
              className={`${getChipColor(value)} rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm`}
              title={`${CHIP_DENOMINATIONS[value].code} - ${value.toLocaleString()}`}
            >
              {value >= 1000 ? `${value/1000}K` : value}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`${themeClasses.container} rounded-lg border p-3`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">Active Chips</h3>
        <span className={`text-xs ${themeClasses.text}`}>
          Level {tournamentLevel}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {activeChips.map(value => {
          const chip = CHIP_DENOMINATIONS[value];
          return (
            <div key={value} className="flex items-center gap-2">
              <div 
                className={`${getChipColor(value)} rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm`}
              >
                {value >= 1000 ? `${value/1000}K` : value}
              </div>
              <div>
                <div className="text-sm font-medium">{chip.code}</div>
                <div className={`text-xs ${themeClasses.text}`}>
                  {value.toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className={`text-xs ${themeClasses.text} mt-2 pt-2 border-t`}>
        Phase: {phase}
      </div>
    </div>
  );
};

export default ChipDisplay;