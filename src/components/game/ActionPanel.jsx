import React, { useState, useEffect, useCallback } from 'react';
import { usePlayerActions } from '../../hooks/usePlayerActions.js';
import { useGameState, useBetAmount, useGameStore } from '../../store/gameStore.js';
import { PLAYER_ACTIONS } from '../../constants/gameConstants.js';
import { 
  roundToChipIncrement, 
  getMinBettingIncrement, 
  getBlindLevel,
  getTournamentPhase,
  getActiveChipDenominations,
  CHIP_DENOMINATIONS 
} from '../../constants/tournamentConstants.js';

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
  const [actionCommitted, setActionCommitted] = useState(false); // String betting prevention

  // Update local bet amount when store changes
  useEffect(() => {
    setLocalBetAmount(betAmount);
  }, [betAmount]);

  // Reset action commitment when active player changes (WSOP anti-string betting)
  useEffect(() => {
    setActionCommitted(false);
  }, [gameState.activePlayer, gameState.handNumber]);

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
    
    // WSOP String Betting Prevention
    if (!actionCommitted && (action === PLAYER_ACTIONS.RAISE || action === PLAYER_ACTIONS.ALL_IN)) {
      setActionCommitted(true);
      return; // First click commits the action, don't execute yet
    }
    
    setActionInProgress(true);
    try {
      await executePlayerAction(action, amount);
      setActionCommitted(false); // Reset after successful action
    } catch (error) {
      console.error('Action failed:', error);
      setActionCommitted(false); // Reset on error
    } finally {
      setActionInProgress(false);
    }
  }, [executePlayerAction, actionInProgress, isProcessing, actionCommitted]);

  const handleBetAmountChange = useCallback((value) => {
    // WSOP String Betting Prevention - cannot change bet after commitment
    if (actionCommitted) return;
    
    const rawAmount = parseInt(value);
    // WSOP Rule: Round to valid chip increment
    const roundedAmount = roundToChipIncrement(rawAmount, gameState.tournamentLevel);
    
    setLocalBetAmount(roundedAmount);
    setBetAmount(roundedAmount);
  }, [setBetAmount, actionCommitted, gameState.tournamentLevel]);

  const getActionButtonStyle = useCallback((action) => {
    const baseStyle = "rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-lg";
    
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
      case PLAYER_ACTIONS.RAISE: {
        // In pre-flop, if current bet equals big blind and no one has raised, show "BET"
        const isPreflop = gameState.bettingRound === 'preflop';
        const isFirstRaise = gameState.currentBet === gameState.bigBlind;
        const shouldShowBet = isPreflop && isFirstRaise;
        
        const label = shouldShowBet ? 'BET' : 'RAISE';
        if (actionCommitted && (action === PLAYER_ACTIONS.RAISE || action === PLAYER_ACTIONS.ALL_IN)) {
          return (
            <div className="text-center">
              <div>CONFIRM {label}</div>
              <div className="text-xs">({localBetAmount.toLocaleString()})</div>
            </div>
          );
        }
        
        return (
          <div className="text-center">
            <div>{label}</div>
            <div className="text-xs">({localBetAmount.toLocaleString()})</div>
          </div>
        );
      }
      case PLAYER_ACTIONS.CALL: {
        const callAmount = getCallAmount();
        return (
          <div className="text-center">
            <div>CALL</div>
            <div className="text-xs">({callAmount.toLocaleString()})</div>
          </div>
        );
      }
      case PLAYER_ACTIONS.ALL_IN: {
        if (actionCommitted && (action === PLAYER_ACTIONS.RAISE || action === PLAYER_ACTIONS.ALL_IN)) {
          return (
            <div className="text-center">
              <div>CONFIRM ALL-IN</div>
              <div className="text-xs">({currentPlayer?.chips.toLocaleString() || 0})</div>
            </div>
          );
        }
        return (
          <div className="text-center">
            <div>ALL-IN</div>
            <div className="text-xs">({currentPlayer?.chips.toLocaleString() || 0})</div>
          </div>
        );
      }
      default:
        return action.toUpperCase();
    }
  }, [localBetAmount, getCallAmount, currentPlayer, gameState.bettingRound, gameState.currentBet, gameState.bigBlind, actionCommitted]);

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
    <div className={`${themeClasses.card} rounded-xl p-3 border flex flex-col`}>
      <h3 className={`text-base font-bold mb-3 text-center ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
        🎯 Your Turn
      </h3>
      
      {/* Bet Amount Controls */}
      {isActionAvailable(PLAYER_ACTIONS.RAISE) && (
        <div className="mb-3">
          <label className={`block text-sm font-medium mb-2 ${themeClasses.subText}`}>
            Raise Amount: {localBetAmount.toLocaleString()}
          </label>
          
          {/* Slider for quick adjustment */}
          <input
            type="range"
            min={getMinRaiseAmount()}
            max={getMaxRaiseAmount()}
            value={localBetAmount}
            step={getMinBettingIncrement(gameState.tournamentLevel)}
            onChange={(e) => handleBetAmountChange(e.target.value)}
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer mb-2"
            disabled={actionInProgress || isProcessing || actionCommitted}
          />
          
          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { label: 'Min', amount: getMinRaiseAmount() },
              { label: '1/2 Pot', amount: Math.min(gameState.currentBet + Math.floor(gameState.pot * 0.5), getMaxRaiseAmount()) },
              { label: 'Pot', amount: Math.min(gameState.currentBet + gameState.pot, getMaxRaiseAmount()) }
            ].map(({ label, amount }) => (
              <button
                key={label}
                onClick={() => handleBetAmountChange(amount)}
                className={`px-2 py-1 text-xs rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} transition-colors`}
                disabled={actionInProgress || isProcessing || actionCommitted}
              >
                {label}
              </button>
            ))}
          </div>
          
          <div className={`flex justify-between text-xs ${themeClasses.subText}`}>
            <span>Min: {getMinRaiseAmount().toLocaleString()}</span>
            <span>Max: {getMaxRaiseAmount().toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Game Info */}
      <div className={`mb-3 text-xs ${themeClasses.subText}`}>
        <div className="grid grid-cols-2 gap-2">
          <div>Pot: {gameState.pot.toLocaleString()}</div>
          <div>To Call: {getCallAmount().toLocaleString()}</div>
          <div>Your Chips: {currentPlayer.chips.toLocaleString()}</div>
          <div>Current Bet: {gameState.currentBet.toLocaleString()}</div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div>
        <div className={`grid gap-2 ${availableActions.length <= 2 ? 'grid-cols-2' : availableActions.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
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
              className={`${getActionButtonStyle(action)} px-3 py-2 text-sm`}
              disabled={actionInProgress || isProcessing}
            >
              {getActionLabel(action)}
            </button>
          ))}
        </div>

        {/* Action Status */}
        {actionCommitted && !actionInProgress && (
          <div className={`text-center text-xs text-yellow-600 font-medium mt-2`}>
            ⚠️ Action committed - Click again to confirm (WSOP rule)
          </div>
        )}
        {(actionInProgress || isProcessing) && (
          <div className={`text-center text-xs ${themeClasses.subText} mt-2`}>
            Processing action...
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionPanel;