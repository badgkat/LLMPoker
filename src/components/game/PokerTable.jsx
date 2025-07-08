import React, { useEffect } from 'react';
import { useGameState, useGameStore } from '../../store/gameStore.js';
import { usePlayerActions } from '../../hooks/usePlayerActions.js';
import PlayerSeat from './PlayerSeat.jsx';
import CommunityCards from './CommunityCards.jsx';
import ActionPanel from './ActionPanel.jsx';
import GameLog from '../ui/GameLog.jsx';
import HandSummary from './HandSummary.jsx';
import ThemeToggle from '../ui/ThemeToggle.jsx';

/**
 * PokerTable component that orchestrates the entire game
 * @param {Object} props
 * @param {boolean} props.darkMode - Dark mode flag
 * @param {Function} props.onToggleTheme - Theme toggle callback
 * @returns {JSX.Element}
 */
const PokerTable = ({ darkMode = false, onToggleTheme }) => {
  const gameState = useGameState();
  const { setHandSummary } = useGameStore();
  const { processAIAction, currentPlayer } = usePlayerActions();

  // Handle AI player actions
  useEffect(() => {
    const handleAITurn = async () => {
      if (currentPlayer && !currentPlayer.isHuman && currentPlayer.isActive && !currentPlayer.isAllIn && !gameState.processingPhase) {
        const delay = 1500 + Math.random() * 1000; // Random delay for realism
        
        const timer = setTimeout(async () => {
          await processAIAction(currentPlayer);
        }, delay);

        return () => clearTimeout(timer);
      }
    };

    if (gameState.phase === 'playing') {
      return handleAITurn();
    }
  }, [gameState.activePlayer, gameState.phase, gameState.bettingRound, gameState.processingPhase, currentPlayer, processAIAction]);

  const themeClasses = darkMode ? {
    bg: 'bg-gradient-to-br from-gray-900 via-green-900 to-gray-900',
    text: 'text-white',
    card: 'bg-gray-800 border-gray-700'
  } : {
    bg: 'bg-gradient-to-br from-green-800 via-green-600 to-green-800',
    text: 'text-white',
    card: 'bg-white/90 border-gray-300'
  };

  // Don't render if no game state
  if (!gameState || !gameState.players || gameState.players.length === 0) {
    return (
      <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-4xl mb-4">🎰</div>
          <div className="text-xl">Loading game...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} relative overflow-hidden flex flex-col`}>
      
      {/* Hand Summary Overlay */}
      <HandSummary 
        handSummary={gameState.handSummary}
        darkMode={darkMode}
        onClose={() => setHandSummary(null)}
      />
      
      {/* Header */}
      <header className="flex-shrink-0 p-3 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-bold">🎰 WSOP Tournament</h1>
            
            {/* Game Status */}
            <div className={`${themeClasses.card} rounded-lg px-2 py-1 border backdrop-blur-sm`}>
              <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Hand #{gameState.handNumber} • {gameState.bettingRound.toUpperCase()}
              </div>
            </div>

            {/* Active Player Indicator */}
            {currentPlayer && (
              <div className={`${themeClasses.card} rounded-lg px-2 py-1 border backdrop-blur-sm`}>
                <div className={`text-xs ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  {currentPlayer.isHuman ? '👤 Your Turn' : `🤖 ${currentPlayer.name}`}
                </div>
              </div>
            )}

            {/* Processing Indicator */}
            {gameState.processingPhase && (
              <div className={`${themeClasses.card} rounded-lg px-2 py-1 border backdrop-blur-sm`}>
                <div className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'} animate-pulse`}>
                  ⚙️ Processing...
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Game Stats */}
            <div className={`${themeClasses.card} rounded-lg px-2 py-1 border backdrop-blur-sm`}>
              <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {gameState.players.filter(p => p.isActive).length} players active
              </div>
            </div>

            <ThemeToggle 
              darkMode={darkMode}
              onToggle={onToggleTheme}
              size="sm"
            />
          </div>
        </div>
      </header>

      {/* Main Game Area - Takes remaining space above bottom UI */}
      <main className="flex-1 relative" style={{ minHeight: '400px' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full h-full max-w-5xl max-h-4xl" style={{ padding: '60px' }}>
            
            {/* Table Felt */}
            <div className="absolute inset-6 bg-gradient-to-br from-green-700 to-green-900 rounded-full border-8 border-amber-600 shadow-2xl">
              <div className="absolute inset-4 border-2 border-amber-400/30 rounded-full"></div>
              
              {/* Table Logo */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-10">
                <div className="text-6xl">🎰</div>
              </div>
            </div>

            {/* Dealer Position */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
              <div className={`${themeClasses.card} rounded-lg px-2 py-1 border backdrop-blur-sm shadow-lg`}>
                <div className={`text-center text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  🎩 Dealer
                </div>
              </div>
            </div>

            {/* Community Cards and Pot Display */}
            <CommunityCards
              communityCards={gameState.communityCards}
              burnCards={gameState.burnCards}
              pot={gameState.pot}
              currentBet={gameState.currentBet}
              darkMode={darkMode}
            />

            {/* Player Seats around the table */}
            {gameState.players.map((player, index) => (
              <PlayerSeat
                key={player.id}
                player={player}
                index={index}
                isCurrentPlayer={index === gameState.activePlayer}
                isDealer={index === gameState.dealerButton}
                darkMode={darkMode}
              />
            ))}

            {/* Side Pot Display (if applicable) */}
            {gameState.sidePots && gameState.sidePots.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className={`${themeClasses.card} rounded-lg px-3 py-2 border backdrop-blur-sm shadow-lg`}>
                  <div className={`text-xs font-bold text-center mb-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    Side Pots
                  </div>
                  <div className="space-y-1">
                    {gameState.sidePots.map((pot, index) => (
                      <div key={index} className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Pot {index + 1}: {pot.amount.toLocaleString()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Betting Round Indicator */}
            <div className="absolute top-4 right-4">
              <div className={`${themeClasses.card} rounded-lg px-3 py-2 border backdrop-blur-sm shadow-lg`}>
                <div className={`text-sm font-bold text-center ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {gameState.bettingRound.toUpperCase()}
                </div>
                <div className={`text-xs text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {gameState.bettingRound === 'preflop' && 'Pre-Flop'}
                  {gameState.bettingRound === 'flop' && '3 Cards'}
                  {gameState.bettingRound === 'turn' && '4th Card'}
                  {gameState.bettingRound === 'river' && '5th Card'}
                </div>
              </div>
            </div>

            {/* Blinds Indicator */}
            <div className="absolute bottom-4 right-4">
              <div className={`${themeClasses.card} rounded-lg px-3 py-2 border backdrop-blur-sm shadow-lg`}>
                <div className={`text-xs font-bold text-center mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Blinds
                </div>
                <div className={`text-xs text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  SB: {gameState.smallBlind} / BB: {gameState.bigBlind}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Bottom UI Panel - Game Log and Action Panel Side by Side */}
      <footer className="flex-shrink-0 p-3 border-t border-amber-600/30 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex gap-4 h-64">
          
          {/* Game Log - Left Side */}
          <div className="flex-1 max-w-md">
            <GameLog 
              darkMode={darkMode}
              maxHeight={240}
            />
          </div>

          {/* Action Panel - Right Side */}
          <div className="flex-1 max-w-md">
            <ActionPanel 
              darkMode={darkMode}
            />
          </div>

        </div>
      </footer>
    </div>
  );
};

export default PokerTable;