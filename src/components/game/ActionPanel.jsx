import React, { useState, useEffect, useCallback } from 'react';
import { usePlayerActions } from '../../hooks/usePlayerActions.js';
import { useGameState, useBetAmount, useGameStore } from '../../store/gameStore.js';
import { PLAYER_ACTIONS } from '../../constants/gameConstants.js';

/**
 * ActionPanel component for player actions and betting controls
 * @param {Object} props
 * @param {boolean} props.darkMode - Dark mode flag
 * @returns {JSX.Element}
 */
const ActionPanel = ({ darkMode = false }) => {
  const gameState = useGameState();
  const betAmount = useBetAmount();
  const { setBetAmount } = useGameStore();
  
  const {
    executePlayerAction,
    isActionAvailable,
    getMinRaiseAmount,
    getMaxRaiseAmount,
    getCallAmount,
    isProcessing,
    currentPlayer,
    availableActions
  } = usePlayerActions();

  const [localBetAmount, setLocalBetAmount] = useState(betAmount);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Update local bet amount when store changes
  useEffect(() => {
    setLocalBetAmount(betAmount);
  }, [betAmount]);

  // Auto-adjust bet amount to valid range
  useEffect(() => {
    if (isActionAvailable(PLAYER_ACTIONS.RAISE)) {
      const minRaise = getMinRaiseAmount();
      const maxRaise = getMaxRaiseAmount();
      
      if (localBetAmount < minRaise) {
        setLocalBetAmount(minRaise);
        setBetAmount(minRaise);
      } else if (localBetAmount > maxRaise) {
        setLocalBetAmount(maxRaise);
        setBetAmount(maxRaise);
      }
    }
  }, [gameState.currentBet, gameState.activePlayer, isActionAvailable, getMinRaiseAmount, getMaxRaiseAmount, localBetAmount, setBetAmount]);

  const handleAction = useCallback(async (action, amount = 0) => {
    if (actionInProgress || isProcessing) return;
    
    setActionInProgress(true);
    try {
      await executePlayerAction(action, amount);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setActionInProgress(false);
    }
  }, [executePlayerAction, actionInProgress, isProcessing]);

  const handleBetAmountChange = useCallback((value) => {
    const newAmount = parseInt(value);
    setLocalBetAmount(newAmount);
    setBetAmount(newAmount);
  }, [setBetAmount]);

  const getActionButtonStyle = useCallback((action) => {
    const baseStyle = "px-3 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 transform hover:scale-105 shadow-lg";
    
    switch (action) {
      case PLAYER_ACTIONS.FOLD:
        return `${baseStyle} bg-red-600 hover:bg-red-700 text-white`;
      case PLAYER_ACTIONS.ALL_IN:
        return `${baseStyle} bg-purple-600 hover:bg-purple-700 text-white`;
      case PLAYER_ACTIONS.RAISE:
        return `${baseStyle} bg-green-600 hover:bg-green-700 text-white`;
      default:
        return `${baseStyle} bg-blue-600 hover:bg-blue-700 text-white`;
    }
  }, []);

  const getActionLabel = useCallback((action) => {
    switch (action) {
      case PLAYER_ACTIONS.RAISE:
        return (
          <div className="text-center">
            <div>RAISE</div>
            <div className="text-xs">({localBetAmount.toLocaleString()})</div>
          </div>
        );
      case PLAYER_ACTIONS.CALL:
        const callAmount = getCallAmount();
        return (
          <div className="text-center">
            <div>CALL</div>
            <div className="text-xs">({callAmount.toLocaleString()})</div>
          </div>
        );
      case PLAYER_ACTIONS.ALL_IN:
        return (
          <div className="text-center">
            <div>ALL-IN</div>
            <div className="text-xs">({currentPlayer?.chips.toLocaleString() || 0})</div>
          </div>
        );
      default:
        return action.toUpperCase();
    }
  }, [localBetAmount, getCallAmount, currentPlayer]);

  const themeClasses = darkMode ? {
    card: 'bg-gray-800 border-gray-700',
    text: 'text-white',
    subText: 'text-gray-300',
    input: 'bg-gray-700 border-gray-600 text-white'
  } : {
    card: 'bg-white/90 border-gray-300',
    text: 'text-gray-900',
    subText: 'text-gray-700',
    input: 'bg-white border-gray-300 text-gray-900'
  };

  // Show different content based on game state
  if (!currentPlayer) {
    return (
      <div className={`${themeClasses.card} rounded-xl p-3 border h-full flex flex-col justify-center`}>
        <h3 className={`text-lg font-bold text-center mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          ⏳ Waiting
        </h3>
        <p className={`text-center text-sm ${themeClasses.subText}`}>
          Waiting for game to start...
        </p>
      </div>
    );
  }

  if (!currentPlayer.isHuman) {
    return (
      <div className={`${themeClasses.card} rounded-xl p-3 border h-full flex flex-col justify-center`}>
        <h3 className={`text-lg font-bold text-center mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          ⏳ Waiting
        </h3>
        <p className={`text-center text-sm ${themeClasses.subText}`}>
          AI players are making their moves...
        </p>
        {isProcessing && (
          <p className={`text-center text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Processing game state...
          </p>
        )}
      </div>
    );
  }

  if (currentPlayer.isAllIn) {
    return (
      <div className={`${themeClasses.card} rounded-xl p-3 border h-full flex flex-col justify-center`}>
        <h3 className="text-lg font-bold text-center text-purple-500 mb-2">🎲 All-In!</h3>
        <p className={`text-center text-sm ${themeClasses.subText}`}>
          Waiting for other players...
        </p>
      </div>
    );
  }

  if (gameState.showingSummary) {
    return (
      <div className={`${themeClasses.card} rounded-xl p-3 border h-full flex flex-col justify-center`}>
        <h3 className={`text-lg font-bold text-center mb-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
          🏆 Hand Complete
        </h3>
        <p className={`text-center text-sm ${themeClasses.subText}`}>
          Reviewing hand summary...
        </p>
      </div>
    );
  }

  // Main action panel for human player's turn
  return (
    <div className={`${themeClasses.card} rounded-xl p-3 border h-full flex flex-col`}>
      <h3 className={`text-lg font-bold mb-2 text-center ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
        🎯 Your Turn
      </h3>
      
      {/* Bet Amount Slider */}
      {isActionAvailable(PLAYER_ACTIONS.RAISE) && (
        <div className="mb-3 flex-shrink-0">
          <label className={`block text-sm font-medium mb-2 ${themeClasses.subText}`}>
            Raise Amount: {localBetAmount.toLocaleString()}
          </label>
          <input
            type="range"
            min={getMinRaiseAmount()}
            max={getMaxRaiseAmount()}
            value={localBetAmount}
            step={Math.max(gameState.lastRaiseSize, gameState.bigBlind)}
            onChange={(e) => handleBetAmountChange(e.target.value)}
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
            disabled={actionInProgress || isProcessing}
          />
          <div className={`flex justify-between text-xs mt-1 ${themeClasses.subText}`}>
            <span>Min: {getMinRaiseAmount().toLocaleString()}</span>
            <span>Max: {getMaxRaiseAmount().toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Quick Amount Buttons for Raises */}
      {isActionAvailable(PLAYER_ACTIONS.RAISE) && (
        <div className="mb-3 flex-shrink-0">
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: 'Min', amount: getMinRaiseAmount() },
              { label: '1/2 Pot', amount: Math.min(gameState.currentBet + Math.floor(gameState.pot * 0.5), getMaxRaiseAmount()) },
              { label: 'Pot', amount: Math.min(gameState.currentBet + gameState.pot, getMaxRaiseAmount()) }
            ].map(({ label, amount }) => (
              <button
                key={label}
                onClick={() => handleBetAmountChange(amount)}
                className={`px-2 py-1 text-xs rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} transition-colors`}
                disabled={actionInProgress || isProcessing}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Game Info */}
      <div className={`mb-3 text-xs ${themeClasses.subText} flex-shrink-0`}>
        <div className="grid grid-cols-2 gap-2">
          <div>Pot: {gameState.pot.toLocaleString()}</div>
          <div>To Call: {getCallAmount().toLocaleString()}</div>
          <div>Your Chips: {currentPlayer.chips.toLocaleString()}</div>
          <div>Current Bet: {gameState.currentBet.toLocaleString()}</div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex-1 flex flex-col justify-end">
        <div className="grid grid-cols-2 gap-2 mb-2">
          {availableActions.map(action => (
            <button 
              key={action} 
              onClick={() => {
                if (action === PLAYER_ACTIONS.RAISE) {
                  handleAction(action, localBetAmount);
                } else {
                  handleAction(action);
                }
              }}
              className={getActionButtonStyle(action)}
              disabled={actionInProgress || isProcessing}
            >
              {getActionLabel(action)}
            </button>
          ))}
        </div>

        {/* Action Status */}
        {(actionInProgress || isProcessing) && (
          <div className={`text-center text-xs ${themeClasses.subText}`}>
            Processing action...
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionPanel;