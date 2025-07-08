import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore, useGameState, useDarkMode } from '../store/gameStore.js';
import { useGameFlow } from '../hooks/useGameFlow.js';
import SetupScreen from './ui/SetupScreen.jsx';
import PokerTable from './game/PokerTable.jsx';
import { GAME_PHASES } from '../constants/gameConstants.js';

/**
 * Main PokerApp component - the refactored version of the original monolith
 * This component orchestrates the entire application flow
 * @returns {JSX.Element}
 */
const PokerApp = () => {
  const gameState = useGameState();
  const darkMode = useDarkMode();
  const { setDarkMode } = useGameStore();
  const { startNewGame, isGameActive, isGameOver } = useGameFlow();
  
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Handle theme toggle
   */
  const handleToggleTheme = useCallback(() => {
    setDarkMode(!darkMode);
  }, [darkMode, setDarkMode]);

  /**
   * Handle game start from setup screen
   * @param {Object} playerSetup - Player configuration
   */
  const handleGameStart = useCallback(async (playerSetup) => {
    setIsInitializing(true);
    setError(null);
    
    try {
      await startNewGame(playerSetup);
    } catch (err) {
      setError(err.message || 'Failed to start game');
      console.error('Game start error:', err);
    } finally {
      setIsInitializing(false);
    }
  }, [startNewGame]);

  /**
   * Handle returning to setup (new game)
   */
  const handleNewGame = useCallback(() => {
    const { resetGame } = useGameStore.getState();
    resetGame();
    setError(null);
  }, []);

  /**
   * Error boundary effect
   */
  useEffect(() => {
    const handleError = (event) => {
      console.error('Unhandled error:', event.error);
      setError('An unexpected error occurred. Please refresh the page.');
    };

    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      setError('An unexpected error occurred. Please refresh the page.');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Determine what to render based on game state
  const renderContent = () => {
    // Show error state
    if (error) {
      return (
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} flex items-center justify-center`}>
          <div className={`max-w-md p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
            <h2 className="text-xl font-bold mb-4 text-red-600">⚠️ Error</h2>
            <p className="mb-4">{error}</p>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Show loading state during initialization
    if (isInitializing) {
      return (
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} flex items-center justify-center`}>
          <div className="text-center">
            <div className="text-6xl mb-4 animate-pulse">🎰</div>
            <div className={`text-xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Starting Tournament...
            </div>
            <div className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Shuffling cards and seating players
            </div>
          </div>
        </div>
      );
    }

    // Show setup screen
    if (!gameState || gameState.phase === GAME_PHASES.SETUP) {
      return (
        <SetupScreen
          darkMode={darkMode}
          onGameStart={handleGameStart}
          onToggleTheme={handleToggleTheme}
        />
      );
    }

    // Show game over screen
    if (isGameOver) {
      const winner = gameState.players?.find(p => p.chips > 0);
      const stats = {
        totalHands: gameState.handNumber,
        winner: winner,
        finalChips: winner?.chips || 0,
        playersEliminated: gameState.players?.filter(p => p.chips === 0).length || 0
      };

      return (
        <div className={`min-h-screen ${darkMode ? 'bg-gradient-to-br from-gray-900 via-green-900 to-gray-900' : 'bg-gradient-to-br from-green-800 via-green-600 to-green-800'} text-white flex items-center justify-center`}>
          <div className="text-center max-w-2xl p-8">
            <h1 className="text-6xl mb-6">🏆</h1>
            <h2 className="text-4xl font-bold mb-4">Tournament Complete!</h2>
            
            {winner && (
              <div className="mb-6">
                <div className="text-2xl mb-2">
                  🎉 {winner.name} Wins! 🎉
                </div>
                <div className="text-xl text-yellow-300">
                  Final Chips: {stats.finalChips.toLocaleString()}
                </div>
              </div>
            )}

            <div className={`${darkMode ? 'bg-gray-800/50' : 'bg-black/20'} rounded-lg p-6 mb-6 backdrop-blur-sm`}>
              <h3 className="text-lg font-semibold mb-3">Tournament Statistics</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Total Hands Played</div>
                  <div className="text-yellow-300">{stats.totalHands}</div>
                </div>
                <div>
                  <div className="font-medium">Players Eliminated</div>
                  <div className="text-red-300">{stats.playersEliminated}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleNewGame}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors transform hover:scale-105"
              >
                🎰 New Tournament
              </button>
              <button
                onClick={handleToggleTheme}
                className={`px-6 py-3 rounded-lg font-bold transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-100 text-gray-900'}`}
              >
                {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Show main game
    if (isGameActive) {
      return (
        <PokerTable
          darkMode={darkMode}
          onToggleTheme={handleToggleTheme}
        />
      );
    }

    // Fallback - should not happen
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-4xl mb-4">🎰</div>
          <div className={`text-xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Loading...
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {renderContent()}
    </div>
  );
};

export default PokerApp;