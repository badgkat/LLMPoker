import React, { useEffect, useState } from 'react';
import Card from '../ui/Card.jsx';

/**
 * HandSummary component for displaying hand results
 * @param {Object} props
 * @param {Object} props.handSummary - Hand summary data
 * @param {boolean} props.darkMode - Dark mode flag
 * @param {Function} props.onClose - Close callback
 * @returns {JSX.Element}
 */
const HandSummary = ({ handSummary, darkMode = false, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (handSummary) {
      setIsVisible(true);
      setCountdown(5);

      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [handSummary]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  if (!handSummary || !isVisible) return null;

  const themeClasses = darkMode ? {
    overlay: 'bg-black/70',
    card: 'bg-gray-800',
    headerBg: 'bg-gray-700',
    playerCard: 'bg-gray-700 border-gray-600',
    text: 'text-white',
    subText: 'text-gray-300',
    winnerBg: 'bg-green-900/30 border-green-700',
    winnerText: 'text-green-300',
    potBg: 'bg-gray-700'
  } : {
    overlay: 'bg-black/70',
    card: 'bg-white',
    headerBg: 'bg-gray-100',
    playerCard: 'bg-gray-50 border-gray-200',
    text: 'text-gray-900',
    subText: 'text-gray-600',
    winnerBg: 'bg-green-50 border-green-200',
    winnerText: 'text-green-800',
    potBg: 'bg-gray-100'
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

  const getEndTypeMessage = () => {
    if (handSummary.endType === 'showdown') {
      return `${handSummary.showdownPlayers.length} players went to showdown`;
    } else {
      return 'All others folded';
    }
  };

  return (
    <div className={`fixed inset-0 ${themeClasses.overlay} flex items-center justify-center z-50 backdrop-blur-sm transition-opacity duration-300`}>
      <div className={`max-w-4xl w-full mx-4 ${themeClasses.card} rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 ${
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        
        {/* Header */}
        <div className={`p-6 ${themeClasses.headerBg} border-b relative`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className={`text-2xl font-bold ${themeClasses.text}`}>
                🎰 Hand {handSummary.handNumber} Summary
              </h2>
              <p className={`mt-2 ${themeClasses.subText}`}>
                {getEndTypeMessage()}
              </p>
            </div>
            
            <div className="text-right">
              <button
                onClick={handleClose}
                className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-600 hover:bg-gray-500 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} transition-colors`}
              >
                ✕ Close
              </button>
              <div className={`text-sm mt-1 ${themeClasses.subText}`}>
                Auto-close in {countdown}s
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Community Cards */}
          <div className="text-center">
            <h3 className={`text-lg font-semibold mb-3 ${themeClasses.text}`}>
              🃏 Community Cards
            </h3>
            <div className="flex justify-center gap-2">
              {handSummary.communityCards.map((card, index) => (
                <div key={index} className="transform scale-125">
                  <Card 
                    card={card}
                    size="md"
                    darkMode={darkMode}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Winners Section */}
          <div>
            <h3 className={`text-lg font-semibold mb-3 text-center ${themeClasses.text}`}>
              🏆 Winners
            </h3>
            <div className="space-y-2">
              {handSummary.winners.map((winner, index) => (
                <div key={index} className={`p-4 rounded-lg ${themeClasses.winnerBg}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏆</span>
                      <div>
                        <div className={`font-semibold text-lg ${themeClasses.winnerText}`}>
                          {winner.player.name}
                        </div>
                        {winner.hand && (
                          <div className={`text-sm flex items-center gap-1 ${themeClasses.subText}`}>
                            <span>{getHandTypeIcon(winner.hand)}</span>
                            <span>{winner.hand}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-lg ${themeClasses.winnerText}`}>
                        +{winner.amount.toLocaleString()} chips
                      </div>
                      <div className={`text-sm ${themeClasses.subText}`}>
                        Total: {winner.player.chips.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Winner's Cards (if showdown) */}
                  {handSummary.endType === 'showdown' && (
                    <div className="flex gap-1 mt-2">
                      {winner.player.holeCards?.map((card, cardIndex) => (
                        <Card 
                          key={cardIndex}
                          card={card}
                          size="sm"
                          darkMode={darkMode}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Showdown Players (if applicable) */}
          {handSummary.showdownPlayers.length > 0 && handSummary.endType === 'showdown' && (
            <div>
              <h3 className={`text-lg font-semibold mb-3 text-center ${themeClasses.text}`}>
                👀 Showdown Hands
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {handSummary.showdownPlayers.map((player, index) => {
                  const isWinner = handSummary.winners.some(w => w.player.id === player.id);
                  
                  return (
                    <div key={player.id} className={`p-4 rounded-lg border ${
                      isWinner ? themeClasses.winnerBg : themeClasses.playerCard
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {isWinner && <span>🏆</span>}
                        <div className={`font-semibold ${isWinner ? themeClasses.winnerText : themeClasses.text}`}>
                          {player.name}
                        </div>
                      </div>
                      
                      <div className="flex gap-1 mb-2">
                        {player.holeCards.map((card, i) => (
                          <Card 
                            key={i}
                            card={card}
                            size="sm"
                            darkMode={darkMode}
                          />
                        ))}
                      </div>
                      
                      <div className={`text-sm flex items-center gap-1 ${themeClasses.subText}`}>
                        <span>{getHandTypeIcon(player.handEvaluation.description)}</span>
                        <span>{player.handEvaluation.description}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pot Information */}
          <div className={`text-center p-4 rounded-lg ${themeClasses.potBg}`}>
            <div className={`text-xl font-semibold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'} mb-2`}>
              💰 Total Pot: {handSummary.totalPot.toLocaleString()} chips
            </div>
            
            {handSummary.sidePots.length > 1 && (
              <div className={`text-sm ${themeClasses.subText}`}>
                <div className="mb-2">Split across {handSummary.sidePots.length} side pots:</div>
                <div className="space-y-1">
                  {handSummary.sidePots.map((pot, index) => (
                    <div key={index} className="flex justify-between items-center max-w-md mx-auto">
                      <span>Pot {index + 1}:</span>
                      <span className="font-medium">{pot.amount.toLocaleString()} chips</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Hand Statistics */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm ${themeClasses.subText}`}>
            <div>
              <div className="font-semibold">Hand #</div>
              <div>{handSummary.handNumber}</div>
            </div>
            <div>
              <div className="font-semibold">Players</div>
              <div>{handSummary.showdownPlayers.length || 'N/A'}</div>
            </div>
            <div>
              <div className="font-semibold">Winners</div>
              <div>{handSummary.winners.length}</div>
            </div>
            <div>
              <div className="font-semibold">End Type</div>
              <div className="capitalize">{handSummary.endType}</div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className={`p-4 text-center ${themeClasses.headerBg} border-t`}>
          <div className={`text-sm ${themeClasses.subText}`}>
            Next hand starting in a few seconds...
          </div>
          
          <div className="flex justify-center gap-4 mt-2">
            <button
              onClick={handleClose}
              className={`px-4 py-2 rounded ${darkMode ? 'bg-gray-600 hover:bg-gray-500 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} transition-colors`}
            >
              Continue Playing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandSummary;