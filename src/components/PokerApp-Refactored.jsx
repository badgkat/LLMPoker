import React from 'react';
import { useGameStore, useDarkMode } from '../store/gameStore.js';
import Card from './ui/Card.jsx';
import PlayerSeat from './game/PlayerSeat.jsx';
import CommunityCards from './game/CommunityCards.jsx';
import ThemeToggle from './ui/ThemeToggle.jsx';
import { createDeck } from '../utils/deckUtils.js';

/**
 * Refactored PokerApp component demonstrating the new architecture
 * This is a simplified version showing how the components work together
 */
const PokerAppRefactored = () => {
  const darkMode = useDarkMode();
  const { setDarkMode } = useGameStore();

  // Example data to demonstrate components
  const exampleCommunityCards = createDeck().slice(0, 5);
  const examplePlayers = [
    {
      id: 1,
      name: 'You',
      seat: 0,
      chips: 50000,
      holeCards: createDeck().slice(5, 7),
      isHuman: true,
      isActive: true,
      currentBet: 200,
      hasActed: false,
      isAllIn: false
    },
    {
      id: 2,
      name: 'AI Player 1',
      seat: 2,
      chips: 45000,
      holeCards: createDeck().slice(7, 9),
      isHuman: false,
      isActive: true,
      currentBet: 200,
      hasActed: true,
      isAllIn: false
    }
  ];

  const themeClasses = darkMode ? {
    bg: 'bg-gradient-to-br from-gray-900 via-green-900 to-gray-900',
    text: 'text-white',
    card: 'bg-gray-800 border-gray-700'
  } : {
    bg: 'bg-gradient-to-br from-green-800 via-green-600 to-green-800',
    text: 'text-white',
    card: 'bg-white/90 border-gray-300'
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} relative overflow-hidden flex flex-col`}>
      
      {/* Header */}
      <div className="flex-shrink-0 p-3 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-bold">🎰 WSOP Tournament (Refactored)</h1>
            <div className={`${themeClasses.card} rounded-lg px-2 py-1 border backdrop-blur-sm`}>
              <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Demo of New Architecture
              </div>
            </div>
          </div>
          
          <ThemeToggle 
            darkMode={darkMode}
            onToggle={() => setDarkMode(!darkMode)}
            size="sm"
          />
        </div>
      </div>

      {/* Casino Table */}
      <div className="flex-1 relative" style={{ minHeight: '400px' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full h-full max-w-4xl max-h-3xl" style={{ padding: '60px' }}>
            
            {/* Table Felt */}
            <div className="absolute inset-6 bg-gradient-to-br from-green-700 to-green-900 rounded-full border-8 border-amber-600 shadow-2xl">
              <div className="absolute inset-4 border-2 border-amber-400/30 rounded-full"></div>
            </div>

            {/* Dealer Position */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
              <div className={`${themeClasses.card} rounded-lg px-2 py-1 border backdrop-blur-sm shadow-lg`}>
                <div className={`text-center text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  🎩 Dealer
                </div>
              </div>
            </div>

            {/* Community Cards Component */}
            <CommunityCards
              communityCards={exampleCommunityCards.slice(0, 3)}
              burnCards={[{}, {}]}
              pot={1500}
              currentBet={200}
              darkMode={darkMode}
            />

            {/* Player Components */}
            {examplePlayers.map((player, index) => (
              <PlayerSeat
                key={player.id}
                player={player}
                index={index}
                isCurrentPlayer={index === 0}
                isDealer={index === 1}
                darkMode={darkMode}
              />
            ))}

          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="flex-shrink-0 p-3 border-t border-amber-600/30 bg-black/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className={`${themeClasses.card} rounded-xl p-4 border`}>
            <h3 className={`font-bold mb-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
              ✅ Refactoring Progress - Phase 1 Complete!
            </h3>
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <div>
                <div className="font-semibold mb-1">Structure</div>
                <div className="text-xs">✅ Organized folders</div>
                <div className="text-xs">✅ Constants extracted</div>
                <div className="text-xs">✅ Type definitions</div>
              </div>
              <div>
                <div className="font-semibold mb-1">State Management</div>
                <div className="text-xs">✅ Zustand store</div>
                <div className="text-xs">✅ Centralized state</div>
                <div className="text-xs">✅ Action methods</div>
              </div>
              <div>
                <div className="font-semibold mb-1">Utilities</div>
                <div className="text-xs">✅ Deck utilities</div>
                <div className="text-xs">✅ Poker logic</div>
                <div className="text-xs">✅ Validation</div>
              </div>
              <div>
                <div className="font-semibold mb-1">Components</div>
                <div className="text-xs">✅ Card component</div>
                <div className="text-xs">✅ PlayerSeat</div>
                <div className="text-xs">✅ CommunityCards</div>
              </div>
            </div>
            <div className={`mt-3 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Next: Extract AI system, create game engine, add custom hooks
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PokerAppRefactored;