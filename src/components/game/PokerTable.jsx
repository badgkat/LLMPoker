import React, { useEffect } from 'react';
import { useGameState, useGameStore } from '../../store/gameStore.js';
import { usePlayerActions } from '../../hooks/usePlayerActions.js';
import { useGameFlow } from '../../hooks/useGameFlow.js';
import PlayerSeat from './PlayerSeat.jsx';
import CommunityCards from './CommunityCards.jsx';
import ActionPanel from './ActionPanel.jsx';
import GameLog from '../ui/GameLog.jsx';
import HandSummary from './HandSummary.jsx';
import ShowdownSequence from './ShowdownSequence.jsx';
import ThemeToggle from '../ui/ThemeToggle.jsx';

/**
 * PokerTable component that orchestrates the entire game
 * @param {Object} props
 * @param {boolean} props.darkMode - Dark mode flag
 * @param {Function} props.onToggleTheme - Theme toggle callback
 * @returns {JSX.Element}
 */
const PokerTable = ({ darkMode = false, onToggleTheme }) => {
  const { gameState, setHandSummary, showdownData, handSummary } = useGameStore();
  const { processAIAction, currentPlayer } = usePlayerActions();
  const { handleShowdownComplete } = useGameFlow();

  // Handle AI player actions
  useEffect(() => {
    if (gameState.phase === 'playing' && currentPlayer && !currentPlayer.isHuman && currentPlayer.isActive && !currentPlayer.isAllIn && !gameState.processingPhase) {
      const delay = 1500 + Math.random() * 1000; // Random delay for realism
      
      const timer = setTimeout(async () => {
        try {
          await processAIAction(currentPlayer);
        } catch (error) {
          console.error('AI ACTION PROCESSING ERROR:', error);
          console.error('Error stack:', error.stack);
          console.error('Current player:', currentPlayer);
          console.error('Game state:', gameState);
          
          // Let the error bubble up to be handled by error boundary
          throw error;
        }
      }, delay);

      return () => clearTimeout(timer);
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
      
      {/* Showdown Sequence Overlay */}
      {showdownData && gameState.showingShowdown && (
        <ShowdownSequence 
          showdownData={showdownData}
          darkMode={darkMode}
          onComplete={() => handleShowdownComplete(showdownData)}
        />
      )}
      

      {/* Hand Summary Overlay */}
      <HandSummary 
        handSummary={handSummary}
        darkMode={darkMode}
        onClose={() => setHandSummary(null)}
      />
      
      {/* Compact Header */}
      <header className="flex-shrink-0 p-2 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold">🎰 WSOP</h1>
            
            {/* Compact Game Status */}
            <div className={`${themeClasses.card} rounded px-2 py-0.5 border backdrop-blur-sm`}>
              <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                H{gameState.handNumber} • {gameState.bettingRound.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Active Player Indicator */}
            {currentPlayer && (
              <div className={`${themeClasses.card} rounded px-2 py-0.5 border backdrop-blur-sm`}>
                <div className={`text-xs ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  {currentPlayer.isHuman ? '👤' : `🤖 ${currentPlayer.name.split(' ')[0]}`}
                </div>
              </div>
            )}

            {/* Processing Indicator */}
            {gameState.processingPhase && (
              <div className={`${themeClasses.card} rounded px-2 py-0.5 border backdrop-blur-sm`}>
                <div className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'} animate-pulse`}>
                  ⚙️
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Compact Game Stats */}
            <div className={`${themeClasses.card} rounded px-2 py-0.5 border backdrop-blur-sm`}>
              <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {gameState.players.filter(p => p.isActive).length}P
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
      <main className="flex-1 relative min-h-[300px] md:min-h-[400px]">
        <div className="absolute inset-0 flex items-center justify-center p-2 md:p-4">
          <div className="relative w-full h-full max-w-5xl max-h-4xl">
            
            {/* Table Felt */}
            <div className="absolute inset-4 md:inset-6 bg-gradient-to-br from-green-700 to-green-900 rounded-full border-4 md:border-8 border-amber-600 shadow-2xl">
              <div className="absolute inset-2 md:inset-4 border-2 border-amber-400/30 rounded-full"></div>
              
              {/* Table Logo */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-10">
                <div className="text-2xl md:text-4xl lg:text-6xl">🎰</div>
              </div>
            </div>

            {/* Dealer Position */}
            <div className="absolute top-1 md:top-2 left-1/2 transform -translate-x-1/2">
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
                totalPlayers={gameState.players.length}
              />
            ))}

            {/* Side Pot Display (if applicable) */}
            {gameState.sidePots && gameState.sidePots.length > 1 && (
              <div className="absolute bottom-2 md:bottom-4 left-1/2 transform -translate-x-1/2">
                <div className={`${themeClasses.card} rounded-lg px-2 md:px-3 py-1 md:py-2 border backdrop-blur-sm shadow-lg`}>
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
            <div className="absolute top-2 md:top-4 right-2 md:right-4">
              <div className={`${themeClasses.card} rounded-lg px-2 md:px-3 py-1 md:py-2 border backdrop-blur-sm shadow-lg`}>
                <div className={`text-xs md:text-sm font-bold text-center ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
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
            <div className="absolute bottom-2 md:bottom-4 right-2 md:right-4">
              <div className={`${themeClasses.card} rounded-lg px-2 md:px-3 py-1 md:py-2 border backdrop-blur-sm shadow-lg`}>
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
      <footer className="flex-shrink-0 p-2 border-t border-amber-600/30 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-2 h-auto">
            
            {/* Game Log - Left Side or Top on mobile */}
            <div className="flex-1 lg:max-w-md">
              <GameLog 
                darkMode={darkMode}
                maxHeight={200}
              />
            </div>

            {/* Action Panel - Right Side or Bottom on mobile */}
            <div className="flex-1 lg:max-w-md">
              <ActionPanel 
                darkMode={darkMode}
              />
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
};

export default PokerTable;