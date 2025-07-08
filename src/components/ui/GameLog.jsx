import React, { useEffect, useRef, useState } from 'react';
import { useGameLog, useGameState, useGameStore } from '../../store/gameStore.js';

/**
 * Enhanced GameLog component with hand history and filtering
 * @param {Object} props
 * @param {boolean} props.darkMode - Dark mode flag
 * @param {number} props.maxHeight - Maximum height in pixels
 * @returns {JSX.Element}
 */
const GameLog = ({ darkMode = false, maxHeight = 300 }) => {
  const gameLog = useGameLog();
  const gameState = useGameState();
  const { toggleHandExpansion } = useGameStore();
  
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  
  const currentHandRef = useRef(null);
  const logContainerRef = useRef(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (autoScroll && currentHandRef.current) {
      currentHandRef.current.scrollTop = currentHandRef.current.scrollHeight;
    }
  }, [gameLog.currentHand, autoScroll]);

  // Auto-scroll main container when switching hands
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [gameLog.handHistory, autoScroll]);

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
                   message.includes('all-in');
          case 'cards':
            return message.includes('dealt') || message.includes('flop') || 
                   message.includes('turn') || message.includes('river') || 
                   message.includes('burn');
          case 'winners':
            return message.includes('wins') || message.includes('showdown') || 
                   message.includes('winner');
          case 'system':
            return message.includes('hand') && message.includes('started') ||
                   message.includes('advancing') || message.includes('system');
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
    if (msg.includes('raise')) return '📈';
    if (msg.includes('check')) return '✅';
    if (msg.includes('all-in')) return '🎰';
    if (msg.includes('wins')) return '🏆';
    if (msg.includes('dealt') || msg.includes('flop') || msg.includes('turn') || msg.includes('river')) return '🃏';
    if (msg.includes('burn')) return '🔥';
    if (msg.includes('started')) return '🎯';
    if (msg.includes('showdown')) return '👀';
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
    if (msg.includes('raise') || msg.includes('all-in')) {
      return darkMode ? 'text-yellow-400' : 'text-yellow-600';
    }
    if (msg.includes('dealt') || msg.includes('flop') || msg.includes('turn') || msg.includes('river')) {
      return darkMode ? 'text-blue-400' : 'text-blue-600';
    }
    return darkMode ? 'text-gray-300' : 'text-gray-700';
  };

  const themeClasses = darkMode ? {
    card: 'bg-gray-800 border-gray-700',
    text: 'text-white',
    subText: 'text-gray-300',
    input: 'bg-gray-700 border-gray-600 text-white placeholder-gray-400',
    button: 'bg-gray-700 hover:bg-gray-600 text-gray-300',
    activeButton: 'bg-blue-600 hover:bg-blue-700 text-white',
    handBg: 'bg-gray-700/50',
    expandedBg: 'bg-gray-800/30'
  } : {
    card: 'bg-white/90 border-gray-300',
    text: 'text-gray-900',
    subText: 'text-gray-700',
    input: 'bg-white border-gray-300 text-gray-900 placeholder-gray-500',
    button: 'bg-gray-200 hover:bg-gray-300 text-gray-700',
    activeButton: 'bg-blue-500 hover:bg-blue-600 text-white',
    handBg: 'bg-gray-100/50',
    expandedBg: 'bg-white/30'
  };

  return (
    <div className={`${themeClasses.card} rounded-xl p-3 border h-full flex flex-col`}>
      {/* Header */}
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
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filter === key ? themeClasses.activeButton : themeClasses.button
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Log Content */}
      <div 
        ref={logContainerRef}
        className="flex-1 overflow-y-auto space-y-2"
        style={{ maxHeight: `${maxHeight}px` }}
        onScroll={handleScroll}
      >
        {/* Current Hand Log */}
        <div className={`${themeClasses.handBg} rounded p-2`}>
          <div className={`text-xs font-semibold mb-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
            🎯 Current Hand #{gameState.handNumber}
          </div>
          <div 
            ref={currentHandRef}
            className="space-y-1 max-h-32 overflow-y-auto"
          >
            {filterEntries(gameLog.currentHand).slice(-10).map((entry, index) => (
              <div key={`current-${gameState.handNumber}-${index}-${entry.timestamp || index}`} className={`text-xs leading-relaxed ${getMessageClass(entry.message)}`}>
                <span className="inline-block w-4 text-center mr-1">
                  {getMessageIcon(entry.message)}
                </span>
                <span className={`text-xs opacity-70 mr-2`}>
                  {formatTimestamp(entry.timestamp)}
                </span>
                {entry.message}
              </div>
            ))}
            {gameLog.currentHand.length === 0 && (
              <div className={`text-xs italic ${themeClasses.subText}`}>
                No actions yet this hand...
              </div>
            )}
          </div>
        </div>

        {/* Previous Hands */}
        {gameLog.handHistory.slice(-5).reverse().map((hand, index) => (
          <div key={`hand-history-${hand.handNumber}-${index}`} className={`border rounded ${
            darkMode ? 'border-gray-600 bg-gray-800/30' : 'border-gray-300 bg-white/30'
          }`}>
            <button
              onClick={() => toggleHandExpansion(hand.handNumber)}
              className={`w-full p-2 text-left flex justify-between items-center hover:${
                darkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'
              } transition-colors`}
            >
              <span className={`text-xs font-medium ${themeClasses.subText}`}>
                🎲 Hand #{hand.handNumber} ({filterEntries(hand.log).length} entries)
              </span>
              <span className={`text-xs ${themeClasses.subText}`}>
                {gameLog.expandedHands.has(hand.handNumber) ? '▼' : '▶'}
              </span>
            </button>
            
            {gameLog.expandedHands.has(hand.handNumber) && (
              <div className="p-2 border-t border-gray-600/30 max-h-32 overflow-y-auto">
                <div className="space-y-1">
                  {filterEntries(hand.log).map((entry, entryIndex) => (
                    <div key={`history-${hand.handNumber}-${entryIndex}-${entry.timestamp || entryIndex}`} className={`text-xs leading-relaxed ${getMessageClass(entry.message)}`}>
                      <span className="inline-block w-4 text-center mr-1">
                        {getMessageIcon(entry.message)}
                      </span>
                      <span className={`text-xs opacity-70 mr-2`}>
                        {formatTimestamp(entry.timestamp)}
                      </span>
                      {entry.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {gameLog.handHistory.length === 0 && gameLog.currentHand.length === 0 && (
          <div className={`text-center text-sm ${themeClasses.subText} py-8`}>
            🎲 Game log will appear here once play begins
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'} text-xs ${themeClasses.subText}`}>
        <div className="flex justify-between">
          <span>Hands: {gameLog.handHistory.length + (gameLog.currentHand.length > 0 ? 1 : 0)}</span>
          <span>
            Actions: {gameLog.currentHand.length + gameLog.handHistory.reduce((total, hand) => total + hand.log.length, 0)}
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