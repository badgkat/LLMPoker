# AI Action Validation Debug

## Problem:
AI is trying to perform "check" action but it's not available.

## Root Cause Analysis:
The `getAvailableActions` function in `pokerLogic.js` determines available actions based on:

```javascript
const callAmount = currentBet - player.currentBet;

// Check or Call
if (callAmount === 0) {
  actions.push(PLAYER_ACTIONS.CHECK);  // ← Can only check if no bet to call
} else if (callAmount <= player.chips && callAmount > 0) {
  actions.push(PLAYER_ACTIONS.CALL);   // ← Must call if there's a bet
}
```

## Expected Logs:
After the fix, you should see:
```
AI AI Player 1 available actions: ["call", "fold", "raise", "all-in"]
AI AI Player 1 current situation: {
  currentBet: 0,
  gameCurrentBet: 200,  // ← Big blind amount
  chips: 60000,
  callAmount: 200,      // ← Must call 200, so can't check
  isActive: true,
  isAllIn: false
}
```

## Likely Issue:
This is the first betting round (preflop), and:
- AI Player 1 is in UTG position (first to act after blinds)
- Current bet is 200 (big blind)
- AI Player 1 has currentBet: 0
- Therefore callAmount = 200 - 0 = 200
- Since callAmount > 0, the AI cannot "check" - it must "call", "fold", "raise", or "all-in"

## Solution:
The AI is receiving the correct available actions but is making an invalid decision. This suggests either:
1. The LLM service is returning an invalid action
2. There's a bug in the LLM prompt or response parsing
3. The game state is inconsistent

## Test Steps:
1. Refresh the page
2. Start a new game
3. Watch the console logs for the detailed AI action validation
4. Look for the specific error showing what actions were available vs what the AI chose