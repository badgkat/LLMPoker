import React, { useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { AI_PERSONALITY_PROFILES, AI_STRATEGIES, AI_STRATEGY_DESCRIPTIONS } from '../../constants/aiConstants.js';
import { llmService } from '../../services/llmService.js';
import ThemeToggle from './ThemeToggle.jsx';
import LLMSettings from '../settings/LLMSettings.jsx';

/**
 * SetupScreen component for game initialization
 * @param {Object} props
 * @param {boolean} props.darkMode - Dark mode flag
 * @param {Function} props.onGameStart - Callback when game starts
 * @param {Function} props.onToggleTheme - Callback when theme is toggled
 * @returns {JSX.Element}
 */
const SetupScreen = ({ darkMode = false, onGameStart, onToggleTheme }) => {
  const { playerSetup, setPlayerSetup } = useGameStore();
  
  const [isStarting, setIsStarting] = useState(false);
  const [selectedAI, setSelectedAI] = useState(null);
  const [showLLMSettings, setShowLLMSettings] = useState(false);
  const [llmConfig, setLLMConfig] = useState(llmService.getConfig());

  const updatePlayerName = useCallback((index, name) => {
    if (!playerSetup?.aiPlayers) return;
    const updatedPlayers = [...playerSetup.aiPlayers];
    updatedPlayers[index] = { ...updatedPlayers[index], name };
    setPlayerSetup({ ...playerSetup, aiPlayers: updatedPlayers });
  }, [playerSetup, setPlayerSetup]);

  const updatePlayerPersonality = useCallback((index, personalityKey) => {
    if (!playerSetup?.aiPlayers) return;
    const updatedPlayers = [...playerSetup.aiPlayers];
    updatedPlayers[index] = { ...updatedPlayers[index], personality: personalityKey };
    setPlayerSetup({ ...playerSetup, aiPlayers: updatedPlayers });
  }, [playerSetup, setPlayerSetup]);

  const updateHumanPlayerName = useCallback((name) => {
    if (!playerSetup?.humanPlayer) return;
    setPlayerSetup({
      ...playerSetup,
      humanPlayer: { ...playerSetup.humanPlayer, name }
    });
  }, [playerSetup, setPlayerSetup]);

  const startGame = useCallback(async () => {
    setIsStarting(true);
    
    try {      
      // Strict validation - no fallbacks that hide errors
      if (!playerSetup) {
        throw new Error('SETUP ERROR: playerSetup is null or undefined');
      }
      
      if (!playerSetup.humanPlayer) {
        throw new Error('SETUP ERROR: humanPlayer is missing from playerSetup');
      }
      
      if (!playerSetup.humanPlayer.name || typeof playerSetup.humanPlayer.name !== 'string') {
        throw new Error('SETUP ERROR: humanPlayer.name is invalid or missing');
      }
      
      if (!playerSetup.aiPlayers || !Array.isArray(playerSetup.aiPlayers)) {
        throw new Error('SETUP ERROR: aiPlayers is not an array');
      }
      
      if (playerSetup.aiPlayers.length === 0) {
        throw new Error('SETUP ERROR: aiPlayers array is empty');
      }
      
      // Validate each AI player
      playerSetup.aiPlayers.forEach((ai, index) => {
        if (!ai || typeof ai !== 'object') {
          throw new Error(`SETUP ERROR: AI player ${index} is invalid`);
        }
        if (!ai.name || typeof ai.name !== 'string') {
          throw new Error(`SETUP ERROR: AI player ${index} has invalid name`);
        }
        if (!ai.personality || typeof ai.personality !== 'string') {
          throw new Error(`SETUP ERROR: AI player ${index} has invalid personality`);
        }
      });
      
      // Let the parent component handle the game initialization
      // SetupScreen should only validate and pass the playerSetup
      if (onGameStart) {
        await onGameStart(playerSetup);
      }
      
    } catch (error) {
      console.error('GAME START ERROR:', error);
      console.error('Error stack:', error.stack);
      setIsStarting(false);
      // Re-throw the error so it's not hidden
      throw error;
    }
  }, [playerSetup, onGameStart]);

  const getPersonalityColor = (personalityKey) => {
    const profile = AI_PERSONALITY_PROFILES[personalityKey];
    if (!profile) return darkMode ? 'text-gray-300' : 'text-gray-700';
    
    // Color based on aggression and tightness
    if (profile.aggression > 0.7) {
      return darkMode ? 'text-red-400' : 'text-red-600';
    } else if (profile.tightness > 0.7) {
      return darkMode ? 'text-blue-400' : 'text-blue-600';
    } else if (profile.adaptability > 0.7) {
      return darkMode ? 'text-purple-400' : 'text-purple-600';
    } else if (profile.riskTolerance > 0.7) {
      return darkMode ? 'text-yellow-400' : 'text-yellow-600';
    } else {
      return darkMode ? 'text-green-400' : 'text-green-600';
    }
  };

  const getPersonalityIcon = (personalityKey) => {
    switch (personalityKey) {
      case 'NITS': return '🐌';
      case 'ROCK': return '🪨';
      case 'TAG': return '🎯';
      case 'LAG': return '🔥';
      case 'CALLING_STATION': return '📞';
      case 'MANIAC': return '🌪️';
      case 'FISH': return '🐟';
      case 'SHARK': return '🦈';
      case 'PROFESSOR': return '🧮';
      case 'GAMBLER': return '🎲';
      case 'RANDOM': return '🎰';
      default: return '🤖';
    }
  };

  const themeClasses = darkMode ? {
    bg: 'bg-gradient-to-br from-gray-900 via-green-900 to-gray-900',
    text: 'text-white',
    card: 'bg-gray-800 border-gray-700',
    input: 'bg-gray-700 border-gray-600 text-white',
    button: 'bg-gray-700 hover:bg-gray-600 border-gray-600',
    playerCard: 'bg-gray-700 border-gray-600',
    subText: 'text-gray-300'
  } : {
    bg: 'bg-gradient-to-br from-green-800 via-green-600 to-green-800',
    text: 'text-white',
    card: 'bg-white/90 border-gray-300',
    input: 'bg-white border-gray-300 text-gray-900',
    button: 'bg-white hover:bg-gray-50 border-gray-300 text-gray-900',
    playerCard: 'bg-white border-gray-300',
    subText: 'text-gray-700'
  };

  // Don't render if playerSetup is not properly initialized
  if (!playerSetup || !playerSetup.humanPlayer || !playerSetup.aiPlayers) {
    console.error('SetupScreen: playerSetup is not properly initialized');
    console.error('playerSetup:', playerSetup);
    console.error('humanPlayer:', playerSetup?.humanPlayer);
    console.error('aiPlayers:', playerSetup?.aiPlayers);
    
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-green-800 to-green-600 text-white'} p-6 flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading game setup...</p>
          <p className="text-sm mt-2">Check console for details</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} p-6`}>
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">🎰 WSOP Poker Tournament</h1>
            <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-green-100'}`}>
              Configure your players and start the game
            </p>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3">
            <button
              onClick={() => setShowLLMSettings(true)}
              className={`px-2 md:px-3 py-2 rounded-lg text-xs md:text-sm font-medium ${themeClasses.button} border flex items-center space-x-1 md:space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <span>🧠</span>
              <span className="hidden sm:inline">AI Config</span>
              <span className={`text-xs px-2 py-1 rounded ${
                llmConfig.provider === 'mock' 
                  ? 'bg-yellow-500 text-yellow-900' 
                  : llmConfig.hasApiKey 
                    ? 'bg-green-500 text-green-900'
                    : 'bg-red-500 text-red-900'
              }`}>
                {llmConfig.provider.toUpperCase()}
              </span>
            </button>
            <ThemeToggle 
              darkMode={darkMode}
              onToggle={onToggleTheme}
              size="md"
            />
          </div>
        </div>
        
        <div className={`${themeClasses.card} rounded-xl p-6 shadow-2xl backdrop-blur-sm`}>
          
          {/* Human Player Section */}
          <div className="mb-8">
            <h2 className={`text-2xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              👤 Your Player
            </h2>
            
            <div className={`${themeClasses.playerCard} rounded-lg p-4 border`}>
              <label className={`block text-sm font-medium mb-2 ${themeClasses.subText}`}>
                Your Name:
              </label>
              <input 
                type="text" 
                value={playerSetup.humanPlayer.name}
                onChange={(e) => {
                  updateHumanPlayerName(e.target.value);
                }}
                className={`${themeClasses.input} rounded-lg px-4 py-2 w-full border text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Enter your name"
                maxLength={20}
              />
              <div className={`mt-2 text-sm ${themeClasses.subText}`}>
                Starting chips: 60,000 • You will be dealt face-up cards
              </div>
            </div>
          </div>

          {/* AI Players Section */}
          <div className="mb-8">
            <h2 className={`text-2xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              🤖 AI Opponents
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {playerSetup.aiPlayers.map((ai, index) => (
                <div 
                  key={index} 
                  className={`${themeClasses.playerCard} rounded-lg p-3 md:p-4 border transition-all duration-200 hover:shadow-lg`}
                >
                  <div className="mb-3">
                    <label className={`block text-sm font-medium mb-1 ${themeClasses.subText}`}>
                      AI Player {index + 1}:
                    </label>
                    <input 
                      type="text"
                      value={ai.name}
                      onChange={(e) => updatePlayerName(index, e.target.value)}
                      className={`${themeClasses.input} rounded px-3 py-2 w-full border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      maxLength={15}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${themeClasses.subText}`}>
                      Personality:
                    </label>
                    <select 
                      value={ai.personality || 'RANDOM'}
                      onChange={(e) => updatePlayerPersonality(index, e.target.value)}
                      className={`${themeClasses.input} rounded px-3 py-2 w-full border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      onMouseEnter={() => setSelectedAI(index)}
                      onMouseLeave={() => setSelectedAI(null)}
                    >
                      <option value="RANDOM">🎰 Random Personality</option>
                      {Object.entries(AI_PERSONALITY_PROFILES).map(([key, profile]) => (
                        <option key={key} value={key}>
                          {getPersonalityIcon(key)} {profile.name}
                        </option>
                      ))}
                    </select>
                    
                    {/* Personality Description with 4D Ratings */}
                    <div className={`mt-2 text-xs min-h-[3rem]`}>
                      {selectedAI === index && ai.personality && ai.personality !== 'RANDOM' ? (
                        <div>
                          <div className={`${getPersonalityColor(ai.personality)} font-medium mb-1`}>
                            {AI_PERSONALITY_PROFILES[ai.personality]?.description}
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <div className={themeClasses.subText}>
                              T: {(AI_PERSONALITY_PROFILES[ai.personality]?.tightness * 100).toFixed(0)}%
                            </div>
                            <div className={themeClasses.subText}>
                              A: {(AI_PERSONALITY_PROFILES[ai.personality]?.aggression * 100).toFixed(0)}%
                            </div>
                            <div className={themeClasses.subText}>
                              Ad: {(AI_PERSONALITY_PROFILES[ai.personality]?.adaptability * 100).toFixed(0)}%
                            </div>
                            <div className={themeClasses.subText}>
                              R: {(AI_PERSONALITY_PROFILES[ai.personality]?.riskTolerance * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className={`flex items-center gap-1 ${themeClasses.subText}`}>
                          <span>{getPersonalityIcon(ai.personality || 'RANDOM')}</span>
                          <span>{ai.personality === 'RANDOM' ? 'Will be assigned randomly' : 'Hover to see 4D ratings'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Personality Guide */}
          <div className="mb-8">
            <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              📚 AI Personality Guide
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
              {Object.entries(AI_PERSONALITY_PROFILES).map(([key, profile]) => (
                <div key={key} className={`p-2 md:p-3 rounded border ${darkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50'}`}>
                  <div className={`font-medium text-xs md:text-sm flex items-center gap-2 mb-1 ${getPersonalityColor(key)}`}>
                    <span>{getPersonalityIcon(key)}</span>
                    <span>{profile.name}</span>
                  </div>
                  <div className={`text-xs ${themeClasses.subText} mb-2`}>
                    {profile.description}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className={`${themeClasses.subText} flex justify-between`}>
                      <span>Tight:</span><span>{(profile.tightness * 100).toFixed(0)}%</span>
                    </div>
                    <div className={`${themeClasses.subText} flex justify-between`}>
                      <span>Aggr:</span><span>{(profile.aggression * 100).toFixed(0)}%</span>
                    </div>
                    <div className={`${themeClasses.subText} flex justify-between`}>
                      <span>Adapt:</span><span>{(profile.adaptability * 100).toFixed(0)}%</span>
                    </div>
                    <div className={`${themeClasses.subText} flex justify-between`}>
                      <span>Risk:</span><span>{(profile.riskTolerance * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Game Rules Summary */}
          <div className="mb-8">
            <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              🎮 Game Rules
            </h3>
            <div className={`p-3 md:p-4 rounded-lg ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm ${themeClasses.subText}`}>
                <div>
                  <div className="font-medium mb-2">💰 Betting Structure</div>
                  <ul className="space-y-1 text-xs">
                    <li>• Small Blind: 100 chips</li>
                    <li>• Big Blind: 200 chips</li>
                    <li>• Starting Stack: 60,000 chips</li>
                    <li>• No-Limit Texas Hold'em</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium mb-2">🎯 Gameplay</div>
                  <ul className="space-y-1 text-xs">
                    <li>• 9-player maximum</li>
                    <li>• AI players with different strategies</li>
                    <li>• Automatic hand progression</li>
                    <li>• Detailed game log and statistics</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Start Game Button */}
          <div className="text-center">
            <button 
              onClick={startGame} 
              disabled={isStarting || !playerSetup.humanPlayer.name.trim()}
              className={`px-6 md:px-8 py-3 md:py-4 text-lg md:text-xl font-bold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isStarting 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
              }`}
            >
              {isStarting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Starting Tournament...
                </span>
              ) : (
                '🚀 Start Tournament'
              )}
            </button>
            
            {!playerSetup.humanPlayer.name.trim() && (
              <p className={`mt-2 text-sm ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                Please enter your name to start the game
              </p>
            )}
            
            <p className={`mt-3 text-sm ${themeClasses.subText}`}>
              Seats will be randomly assigned • Dealer button will be randomly placed
            </p>
          </div>
        </div>
      </div>
      
      {/* LLM Settings Modal */}
      <LLMSettings
        isOpen={showLLMSettings}
        onClose={() => setShowLLMSettings(false)}
        onSave={(newConfig) => {
          setLLMConfig(newConfig);
          setShowLLMSettings(false);
        }}
      />
    </div>
  );
};

export default SetupScreen;