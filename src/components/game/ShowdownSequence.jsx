import React, { useState, useEffect, useCallback } from 'react';
import Card from '../ui/Card.jsx';

/**
 * ShowdownSequence component for displaying hands sequentially with pauses
 * @param {Object} props
 * @param {Object} props.showdownData - Showdown data from game engine
 * @param {boolean} props.darkMode - Dark mode flag
 * @param {Function} props.onComplete - Callback when sequence is complete
 * @returns {JSX.Element}
 */
const ShowdownSequence = ({ showdownData, darkMode = false, onComplete }) => {
  const [currentPhase, setCurrentPhase] = useState('starting'); // 'starting', 'revealing', 'showing-results', 'completed'
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [revealedPlayers, setRevealedPlayers] = useState(new Set());
  const [showResults, setShowResults] = useState(false);

  const { handEvaluations, winners, sidePots, gameState } = showdownData;
  const activePlayers = handEvaluations?.map(he => he.player) || [];

  // Debug log the showdown data
  console.log('ShowdownSequence render:', {
    handEvaluations: handEvaluations?.length || 0,
    winners: winners?.length || 0,
    activePlayers: activePlayers.length,
    gameState: gameState?.handNumber
  });

  const themeClasses = darkMode ? {
    overlay: 'bg-black/80',
    card: 'bg-gray-800 border-gray-700',
    text: 'text-white',
    subText: 'text-gray-300',
    playerCard: 'bg-gray-700 border-gray-600',
    winnerCard: 'bg-green-900/50 border-green-600',
    resultCard: 'bg-blue-900/50 border-blue-600',
    button: 'bg-gray-600 hover:bg-gray-500 text-gray-200'
  } : {
    overlay: 'bg-black/80',
    card: 'bg-white border-gray-300',
    text: 'text-gray-900',
    subText: 'text-gray-600',
    playerCard: 'bg-gray-50 border-gray-200',
    winnerCard: 'bg-green-50 border-green-300',
    resultCard: 'bg-blue-50 border-blue-300',
    button: 'bg-gray-200 hover:bg-gray-300 text-gray-700'
  };

  const getHandTypeIcon = (description) => {
    const type = description.toLowerCase();
    if (type.includes('royal flush')) return '👑';
    if (type.includes('straight flush')) return '🌟';
    if (type.includes('four of a kind')) return '🎰';
    if (type.includes('full house')) return '🏠';
    if (type.includes('flush')) return '💧';
    if (type.includes('straight')) return '📈';
    if (type.includes('three of a kind')) return '🎲';
    if (type.includes('two pair')) return '👥';
    if (type.includes('pair')) return '👫';
    return '🃏';
  };

  const isPlayerWinner = useCallback((playerId) => {
    return winners.some(w => w.player.id === playerId);
  }, [winners]);

  const getPlayerWinAmount = useCallback((playerId) => {
    const winner = winners.find(w => w.player.id === playerId);
    return winner?.amount || 0;
  }, [winners]);

  // Auto-advance through the sequence
  useEffect(() => {
    if (!showdownData) return;

    const timer = setTimeout(() => {
      if (currentPhase === 'starting') {
        setCurrentPhase('revealing');
      } else if (currentPhase === 'revealing') {
        if (currentPlayerIndex < activePlayers.length) {
          // Reveal current player
          setRevealedPlayers(prev => new Set([...prev, activePlayers[currentPlayerIndex].id]));
          setCurrentPlayerIndex(prev => prev + 1);
        } else {
          // All players revealed, show results
          setCurrentPhase('showing-results');
          setShowResults(true);
        }
      } else if (currentPhase === 'showing-results') {
        setCurrentPhase('completed');
        // Wait a bit more before calling onComplete
        setTimeout(() => {
          onComplete?.();
        }, 2000);
      }
    }, currentPhase === 'starting' ? 500 : currentPhase === 'revealing' ? 1500 : 3000);

    return () => clearTimeout(timer);
  }, [currentPhase, currentPlayerIndex, activePlayers.length, showdownData, onComplete]);

  if (!showdownData || !handEvaluations || handEvaluations.length === 0) {
    console.log('ShowdownSequence early return:', { showdownData: !!showdownData, handEvaluations: handEvaluations?.length });
    return null;
  }

  return (
    <div className={`fixed inset-0 ${themeClasses.overlay} flex items-center justify-center z-50 backdrop-blur-sm`}>
      <div className={`max-w-6xl w-full mx-4 ${themeClasses.card} rounded-xl shadow-2xl overflow-hidden border-2`}>
        
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">
              🎰 Showdown - Hand {gameState.handNumber}
            </h2>
            <p className="text-purple-100">
              {currentPhase === 'starting' && 'Revealing hands...'}
              {currentPhase === 'revealing' && `Revealing ${activePlayers[Math.min(currentPlayerIndex, activePlayers.length - 1)]?.name || 'player'}'s hand...`}
              {currentPhase === 'showing-results' && 'Determining winners...'}
              {currentPhase === 'completed' && 'Hand complete!'}
            </p>
          </div>
        </div>

        <div className="p-6">
          {/* Community Cards */}
          <div className="text-center mb-8">
            <h3 className={`text-xl font-semibold mb-4 ${themeClasses.text}`}>
              🃏 Community Cards
            </h3>
            <div className="flex justify-center gap-3">
              {gameState.communityCards.map((card, index) => (
                <div key={index} className="transform scale-110">
                  <Card 
                    card={card}
                    size="lg"
                    darkMode={darkMode}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Players Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {handEvaluations.map((handEval, index) => {
              const player = handEval.player;
              const isRevealed = revealedPlayers.has(player.id);
              const isWinner = isPlayerWinner(player.id);
              const winAmount = getPlayerWinAmount(player.id);
              const showHighlight = showResults && isWinner;

              return (
                <div 
                  key={player.id} 
                  className={`p-4 rounded-lg border-2 transition-all duration-500 ${
                    showHighlight 
                      ? themeClasses.winnerCard 
                      : isRevealed 
                        ? themeClasses.playerCard 
                        : `${themeClasses.playerCard} opacity-50`
                  } ${isRevealed ? 'transform scale-105' : ''}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {showHighlight && <span className="text-2xl">🏆</span>}
                      <div className={`font-bold text-lg ${showHighlight ? 'text-green-600' : themeClasses.text}`}>
                        {player.name}
                      </div>
                    </div>
                    {showResults && isWinner && (
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          +{winAmount.toLocaleString()}
                        </div>
                        <div className={`text-sm ${themeClasses.subText}`}>
                          {player.chips.toLocaleString()} total
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Player's Hole Cards */}
                  <div className="flex gap-2 mb-3 justify-center">
                    {player.holeCards.map((card, cardIndex) => (
                      <div 
                        key={cardIndex}
                        className={`transform transition-all duration-700 ${
                          isRevealed ? 'scale-100 opacity-100 rotate-0' : 'scale-75 opacity-30 rotate-12'
                        }`}
                      >
                        <Card 
                          card={isRevealed ? card : { rank: '?', suit: '?' }}
                          size="md"
                          darkMode={darkMode}
                          faceDown={!isRevealed}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Hand Description */}
                  {isRevealed && (
                    <div className={`text-center transition-all duration-500 ${
                      isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}>
                      <div className={`text-sm flex items-center justify-center gap-2 ${themeClasses.subText}`}>
                        <span className="text-lg">{getHandTypeIcon(handEval.evaluation.description)}</span>
                        <span className="font-medium">{handEval.evaluation.description}</span>
                      </div>
                      {showResults && (
                        <div className={`text-xs mt-1 ${themeClasses.subText}`}>
                          Strength: {handEval.evaluation.strength}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Results Section */}
          {showResults && (
            <div className={`p-6 rounded-lg border-2 ${themeClasses.resultCard} fade-in`}>
              <h3 className={`text-2xl font-bold text-center mb-4 ${themeClasses.text}`}>
                🏆 Hand Results
              </h3>
              
              <div className="space-y-3">
                {winners.map((winner, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏆</span>
                      <div>
                        <div className="font-bold text-lg text-green-600">
                          {winner.player.name}
                        </div>
                        <div className={`text-sm ${themeClasses.subText}`}>
                          {winner.hand}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xl text-green-600">
                        +{winner.amount.toLocaleString()}
                      </div>
                      <div className={`text-sm ${themeClasses.subText}`}>
                        Total: {winner.player.chips.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center mt-4 pt-4 border-t border-gray-300">
                <div className={`text-lg font-semibold ${themeClasses.text}`}>
                  Total Pot: {sidePots.reduce((total, pot) => total + pot.amount, 0).toLocaleString()} chips
                </div>
              </div>
            </div>
          )}

          {/* Skip Button */}
          <div className="text-center mt-6">
            <button
              onClick={() => onComplete?.()}
              className={`px-6 py-2 rounded-lg transition-colors ${themeClasses.button}`}
            >
              Skip Animation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowdownSequence;