import React, { useEffect, useRef, useState } from 'react';
import { useGameLog, useGameState, useGameStore } from '../../store/gameStore.js';

/**
 * Enhanced GameLog component with improved UX and hand selection
 * @param {Object} props
 * @param {boolean} props.darkMode - Dark mode flag
 * @param {number} props.maxHeight - Maximum height in pixels
 * @returns {JSX.Element}
 */
const GameLog = ({ darkMode = false, maxHeight = 300 }) => {
  const gameLog = useGameLog();
  const gameState = useGameState();
  const { toggleHandExpansion } = useGameStore();
  
  const [selectedHand, setSelectedHand] = useState('current');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  
  const logContainerRef = useRef(null);

  // Auto-scroll to bottom when new entries are added (only for current hand)
  useEffect(() => {
    if (autoScroll && selectedHand === 'current' && logContainerRef.current) {
      window.requestAnimationFrame(() => {
        if (logContainerRef.current) {
          logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
      });
    }
  }, [gameLog.currentHand, autoScroll, selectedHand]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
    setAutoScroll(isAtBottom);
  };

  const filterEntries = (entries) => {
    let filtered = [...entries];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (filter !== 'all') {
      filtered = filtered.filter(entry => {
        const message = entry.message.toLowerCase();
        switch (filter) {
          case 'actions':
            return message.includes('fold') || message.includes('call') || 
                   message.includes('raise') || message.includes('check') || 
                   message.includes('all-in') || message.includes('bet');
          case 'cards':
            return message.includes('dealt') || message.includes('flop') || 
                   message.includes('turn') || message.includes('river') || 
                   message.includes('burn') || message.includes('shows');
          case 'winners':
            return message.includes('wins') || message.includes('showdown') || 
                   message.includes('winner') || message.includes('pot');
          case 'system':
            return message.includes('hand') && message.includes('started') ||
                   message.includes('advancing') || message.includes('system') ||
                   message.includes('tournament');
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getMessageIcon = (message) => {
    const msg = message.toLowerCase();
    if (msg.includes('fold')) return '🚫';
    if (msg.includes('call')) return '📞';
    if (msg.includes('raise') || msg.includes('bet')) return '📈';
    if (msg.includes('check')) return '✅';
    if (msg.includes('all-in')) return '🎰';
    if (msg.includes('wins')) return '🏆';
    if (msg.includes('dealt') || msg.includes('flop') || msg.includes('turn') || msg.includes('river')) return '🃏';
    if (msg.includes('shows')) return '👁️';
    if (msg.includes('burn')) return '🔥';
    if (msg.includes('started')) return '🎯';
    if (msg.includes('showdown')) return '👀';
    if (msg.includes('tournament')) return '🏁';
    return '📝';
  };

  const getMessageClass = (message) => {
    const msg = message.toLowerCase();
    if (msg.includes('wins') || msg.includes('winner')) {
      return darkMode ? 'text-green-400' : 'text-green-600';
    }
    if (msg.includes('fold')) {
      return darkMode ? 'text-red-400' : 'text-red-600';
    }
    if (msg.includes('raise') || msg.includes('all-in') || msg.includes('bet')) {
      return darkMode ? 'text-yellow-400' : 'text-yellow-600';
    }
    if (msg.includes('dealt') || msg.includes('flop') || msg.includes('turn') || msg.includes('river') || msg.includes('shows')) {
      return darkMode ? 'text-blue-400' : 'text-blue-600';
    }
    if (msg.includes('showdown')) {
      return darkMode ? 'text-purple-400' : 'text-purple-600';
    }
    return darkMode ? 'text-gray-300' : 'text-gray-700';
  };

  // Get entries for selected hand
  const getSelectedEntries = () => {
    if (selectedHand === 'current') {
      return gameLog.currentHand;
    }
    if (selectedHand === 'all') {
      // Combine all hands
      const allEntries = [];
      gameLog.handHistory.forEach(hand => {
        allEntries.push({ 
          message: `--- Hand #${hand.handNumber} ---`, 
          timestamp: hand.log[0]?.timestamp || Date.now(),
          isHandSeparator: true 
        });
        allEntries.push(...hand.log);
      });
      if (gameLog.currentHand.length > 0) {
        allEntries.push({ 
          message: `--- Current Hand #${gameState.handNumber} ---`, 
          timestamp: gameLog.currentHand[0]?.timestamp || Date.now(),
          isHandSeparator: true 
        });
        allEntries.push(...gameLog.currentHand);
      }
      return allEntries;
    }
    // Specific hand - extract hand number from the value
    if (selectedHand.startsWith('hand_')) {
      const handNum = parseInt(selectedHand.split('_')[1]);
      if (handNum === gameState.handNumber) {
        return gameLog.currentHand;
      }
      const hand = gameLog.handHistory.find(h => h.handNumber === handNum);
      return hand ? hand.log : [];
    }
    // Fallback for old format
    const handNum = parseInt(selectedHand);
    if (!isNaN(handNum)) {
      if (handNum === gameState.handNumber) {
        return gameLog.currentHand;
      }
      const hand = gameLog.handHistory.find(h => h.handNumber === handNum);
      return hand ? hand.log : [];
    }
    return [];
  };

  // Get available hands for dropdown
  const getAvailableHands = () => {
    const hands = [
      { value: 'current', label: `Current Hand #${gameState.handNumber}` },
      { value: 'all', label: 'All Hands' }
    ];
    
    // Add previous hands in reverse order (most recent first)
    // Use a Set to avoid duplicates and ensure unique keys
    const seenHandNumbers = new Set();
    gameLog.handHistory.slice().reverse().forEach((hand, index) => {
      if (!seenHandNumbers.has(hand.handNumber)) {
        seenHandNumbers.add(hand.handNumber);
        hands.push({
          value: `hand_${hand.handNumber}_${index}`, // Make key unique
          handNumber: hand.handNumber, // Keep original for lookup
          label: `Hand #${hand.handNumber}`
        });
      }
    });

    return hands;
  };

  const themeClasses = darkMode ? {
    card: 'bg-gray-800 border-gray-700',
    text: 'text-white',
    subText: 'text-gray-300',
    input: 'bg-gray-700 border-gray-600 text-white placeholder-gray-400',
    select: 'bg-gray-700 border-gray-600 text-white',
    button: 'bg-gray-700 hover:bg-gray-600 text-gray-300',
    activeButton: 'bg-blue-600 hover:bg-blue-700 text-white',
    separator: 'text-yellow-400 bg-gray-700/50'
  } : {
    card: 'bg-white/90 border-gray-300',
    text: 'text-gray-900',
    subText: 'text-gray-700',
    input: 'bg-white border-gray-300 text-gray-900 placeholder-gray-500',
    select: 'bg-white border-gray-300 text-gray-900',
    button: 'bg-gray-200 hover:bg-gray-300 text-gray-700',
    activeButton: 'bg-blue-500 hover:bg-blue-600 text-white',
    separator: 'text-yellow-600 bg-yellow-100/50'
  };

  return (
    <div className={`${themeClasses.card} rounded-xl p-3 border h-full flex flex-col`}>
      {/* Header with Hand Selector */}
      <div className="flex justify-between items-center mb-2">
        <h3 className={`font-bold text-sm ${themeClasses.text}`}>
          📝 Game Log
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              autoScroll ? themeClasses.activeButton : themeClasses.button
            }`}
            title="Toggle auto-scroll"
          >
            {autoScroll ? '🔒' : '🔓'}
          </button>
        </div>
      </div>

      {/* Hand Selector Dropdown */}
      <div className="mb-2">
        <select
          value={selectedHand}
          onChange={(e) => setSelectedHand(e.target.value)}
          className={`w-full px-2 py-1 text-xs rounded border ${themeClasses.select}`}
        >
          {getAvailableHands().map((hand, index) => (
            <option key={`${hand.value}_${index}`} value={hand.value}>
              {hand.label}
            </option>
          ))}
        </select>
      </div>

      {/* Controls */}
      <div className="mb-2 space-y-2">
        {/* Search */}
        <input
          type="text"
          placeholder="Search log..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full px-2 py-1 text-xs rounded border ${themeClasses.input}`}
        />

        {/* Filter Buttons */}
        <div className="flex gap-1 flex-wrap">
          {[
            { key: 'all', label: 'All', icon: '📋' },
            { key: 'actions', label: 'Actions', icon: '🎮' },
            { key: 'cards', label: 'Cards', icon: '🃏' },
            { key: 'winners', label: 'Winners', icon: '🏆' },
            { key: 'system', label: 'System', icon: '⚙️' }
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-2 py-1 text-xs rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                filter === key ? themeClasses.activeButton : themeClasses.button
              }`}
            >
              <span className="md:hidden">{icon}</span>
              <span className="hidden md:inline">{icon} {label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Log Content */}
      <div 
        ref={logContainerRef}
        className="flex-1 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
        style={{ maxHeight: `${maxHeight}px` }}
        onScroll={handleScroll}
      >
        {filterEntries(getSelectedEntries()).map((entry, index) => (
          <div 
            key={`${selectedHand}-${index}-${entry.timestamp || index}`} 
            className={`text-xs leading-relaxed ${
              entry.isHandSeparator 
                ? `font-semibold text-center py-1 px-2 rounded ${themeClasses.separator}`
                : getMessageClass(entry.message)
            }`}
          >
            {!entry.isHandSeparator && (
              <>
                <span className="inline-block w-4 text-center mr-1">
                  {getMessageIcon(entry.message)}
                </span>
                <span className={`text-xs opacity-70 mr-2`}>
                  {formatTimestamp(entry.timestamp)}
                </span>
              </>
            )}
            {entry.message}
          </div>
        ))}
        
        {getSelectedEntries().length === 0 && (
          <div className={`text-center text-sm ${themeClasses.subText} py-8`}>
            {selectedHand === 'current' 
              ? '🎲 No actions yet this hand...'
              : '📝 No log entries found'
            }
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'} text-xs ${themeClasses.subText}`}>
        <div className="flex justify-between">
          <span>Hands: {gameLog.handHistory.length + (gameLog.currentHand.length > 0 ? 1 : 0)}</span>
          <span>
            Viewing: {filterEntries(getSelectedEntries()).length} entries
          </span>
          <span className={autoScroll ? 'text-green-500' : 'text-yellow-500'}>
            {autoScroll ? '🔒 Auto' : '🔓 Manual'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GameLog;