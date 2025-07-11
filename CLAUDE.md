# 🤖 Claude Development Guide for LLM Poker

This file contains development context, patterns, and slash commands to make future work on this repository smoother and more efficient.

## 📋 Project Overview

**LLM Poker** is a sophisticated Texas Hold'em poker application featuring AI opponents powered by Large Language Models. The project was refactored from a monolithic 1,650-line React component into a modern, modular architecture. The program is built with the intention of testing and evaluating LLM performance in poker. The ultimate goal is to show up Nate Silver and Maria Konnikova in a eventual exhibition match. 

### 🎯 Key Characteristics
- **Architecture**: Modern React with Vite build system
- **State Management**: Zustand for global state
- **Styling**: Tailwind CSS with custom poker themes
- **AI Integration**: Multi-provider LLM service (OpenAI, Anthropic, Local, Mock)
- **Game Engine**: Complete Texas Hold'em implementation with side pots
- **Testing**: Vitest with component tests

## 📁 Project Structure & Key Files

**Error Screenshots**
User will place any screen shots to assist with visual explinations of issues in .claude/errorScreenshots

```
LLMPoker/
├── src/
│   ├── ai/                          # AI decision engine and strategies
│   │   ├── aiEngine.js             # Main AI orchestrator with LLM integration
│   │   ├── aiStrategies.js         # 6 different poker strategies
│   │   └── aiMemory.js             # AI learning and opponent tracking
│   ├── components/
│   │   ├── game/                   # Core poker game components
│   │   │   ├── PokerTable.jsx      # Main game table orchestrator
│   │   │   ├── ActionPanel.jsx     # Player betting interface
│   │   │   ├── PlayerSeat.jsx      # Individual player display
│   │   │   └── CommunityCards.jsx  # Shared cards display
│   │   ├── ui/                     # Reusable UI components
│   │   │   ├── SetupScreen.jsx     # Game configuration screen
│   │   │   ├── GameLog.jsx         # Hand history and chat
│   │   │   └── ThemeToggle.jsx     # Dark/light mode switcher
│   │   └── settings/               # Configuration components
│   │       └── LLMSettings.jsx     # AI provider configuration
│   ├── services/
│   │   ├── llmService.js           # Multi-provider LLM integration
│   │   └── mockAIService.js        # Mathematical mock AI engine
│   ├── store/
│   │   ├── gameStore.js            # Zustand state management
│   │   └── types.js                # JSDoc type definitions
│   ├── utils/
│   │   ├── gameEngine.js           # Core poker game logic
│   │   ├── pokerLogic.js           # Hand evaluation and rules
│   │   ├── deckUtils.js            # Card handling utilities
│   │   ├── gameValidation.js       # Input validation and checks
│   │   └── detailedLogger.js       # Comprehensive logging system
│   └── constants/
│       ├── gameConstants.js        # Poker rules and settings
│       └── aiConstants.js          # AI strategy definitions
├── .env.example                    # Environment configuration template
├── vite.config.js                  # Vite build configuration
├── tailwind.config.js              # Tailwind CSS customization
└── package.json                    # Dependencies and scripts
```

## 🛠️ Development Patterns

### 1. State Management Pattern
```javascript
// Use Zustand for global state
import { useGameStore } from '../store/gameStore.js';

const { gameState, setGameState, playerSetup } = useGameStore();
```

### 2. Component Structure Pattern
```javascript
// Standard component structure
import React, { useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore.js';

const ComponentName = ({ prop1, prop2 }) => {
  // Local state
  const [localState, setLocalState] = useState(initialValue);
  
  // Global state
  const { globalState, setGlobalState } = useGameStore();
  
  // Event handlers with useCallback
  const handleEvent = useCallback(() => {
    // Handler logic
  }, [dependencies]);

  return (
    <div className="tailwind-classes">
      {/* Component JSX */}
    </div>
  );
};

export default ComponentName;
```

### 3. Service Layer Pattern
```javascript
// LLM Service - Multi-provider AI integration
import { llmService } from '../services/llmService.js';

// For production LLM calls
const decision = await llmService.getAIDecision(prompt);

// Mock AI Service - Mathematical decision engine  
import { mockAIService } from '../services/mockAIService.js';

// For testing/fallback scenarios
const mockDecision = await mockAIService.getAIDecision(prompt);
```

### 4. Logging Pattern
```javascript
// Detailed logging with AI reasoning capture
import { logPlayerAction, logGameStateChange } from '../utils/detailedLogger.js';

logPlayerAction(player, action, amount, gameState, context);
logGameStateChange(oldState, newState, reason);
```

### 5. Error Handling Pattern
```javascript
// Consistent error handling
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  return fallbackValue;
}
```

## 🏗️ Service Architecture

### LLM Service (`services/llmService.js`)
**Responsibility**: Multi-provider LLM integration and configuration
- **Lines**: 417 (reduced from 741 after refactor)
- **Providers**: OpenAI, Anthropic, Local (Ollama), Mock
- **Features**: Auto-fallback, connection testing, configuration management
- **Pattern**: Clean separation of concerns with dedicated mock service

### Mock AI Service (`services/mockAIService.js`) 
**Responsibility**: Mathematical poker decision engine for testing/fallback
- **Lines**: 356 (extracted from LLM service)
- **Features**: Position awareness, pot odds calculation, strategic bluffing
- **Strategies**: Value betting, aggressive play, positional adjustments
- **Benefits**: Fast, deterministic, no API costs, sophisticated decision-making

### Detailed Logger (`utils/detailedLogger.js`)
**Responsibility**: Comprehensive game state and AI reasoning capture
- **Features**: Player action logging, game state transitions, AI decision tracking
- **Export**: Game logs for analysis and debugging
- **Integration**: Seamless with existing game flow

## 🎮 Game Logic Architecture

### Core Flow
1. **Game Initialization** (`gameEngine.js:initializeGame`)
2. **Hand Management** (`gameEngine.js:startNewHand`)
3. **Player Actions** (`hooks/usePlayerActions.js`)
4. **AI Decisions** (`ai/aiEngine.js:getAIDecision`)
5. **Hand Evaluation** (`utils/pokerLogic.js:evaluateHand`)

### Key Functions
- `gameEngine.processPlayerAction()` - Handle player bets/folds
- `aiEngine.getAIDecision()` - Get AI player decisions
- `pokerLogic.evaluateHand()` - Determine hand strength
- `gameValidation.validateAction()` - Ensure valid moves

## 🚀 Common Development Tasks

### Adding New AI Strategy
1. Add strategy to `constants/aiConstants.js`
2. Implement logic in `ai/aiStrategies.js`
3. Update `ai/aiEngine.js` strategy switch
4. Test with mock AI first

### Adding New UI Component
1. Create in appropriate `components/` subdirectory
2. Follow existing pattern with props and state
3. Use Tailwind for styling with poker theme
4. Add to parent component imports

### Modifying Game Rules
1. Update constants in `constants/gameConstants.js`
2. Modify logic in `utils/pokerLogic.js` or `utils/gameEngine.js`
3. Update validation in `utils/gameValidation.js`
4. Test thoroughly with different scenarios

### Adding LLM Provider
1. Add provider logic to `services/llmService.js`
2. Update `getAvailableProviders()` method
3. Add provider-specific API integration
4. Test with actual API keys

### Debugging UI Issues
1. Use browser dev tools to inspect elements
2. Check CSS layout constraints (height, overflow)
3. Verify all expected elements are being rendered
4. Test responsive design across screen sizes

## 🔧 Recent Improvements

### Service Separation (Latest)
- **Extracted Mock AI**: Moved 280+ lines from `llmService.js` to dedicated `mockAIService.js`
- **Improved Architecture**: Clean separation of concerns between LLM integration and mock AI logic
- **Better Maintainability**: Each service has single responsibility and clear interface

### Logging System Enhancement
- **Enhanced GameLog UI**: Hand selection dropdown for better navigation
- **Detailed Hand Evaluations**: Specific hand descriptions at showdown (e.g., "Full House, Kings over Eights")
- **Backend Logging**: Comprehensive DetailedLogger for AI reasoning capture and game analysis
- **Export Capabilities**: Ready for future LLM integration and performance analysis

### UI Bug Fixes
- **ActionPanel Height Issue**: Fixed `overflow-hidden` cutting off action buttons in 2x2 grid
- **Raise Button Visibility**: Resolved CSS layout preventing raise/all-in buttons from displaying
- **Responsive Grid**: Dynamic grid layout based on number of available actions

### Game Flow Improvements  
- **AI Action Validation**: Proper showdown state management prevents invalid AI actions
- **Error Handling**: Comprehensive logging and graceful error recovery
- **State Management**: Clean Zustand patterns with proper action validation

## 📝 Slash Commands for Claude

Use these slash commands for efficient development assistance:

### `/fix-build`
Diagnose and fix build/compilation errors. Check imports, exports, and Vite configuration.

### `/test-feature [feature-name]`
Create comprehensive tests for a specific feature or component.

### `/add-strategy [strategy-name]`
Add a new AI poker strategy with decision logic and personality.

### `/debug-game`
Analyze game state issues, betting logic errors, or hand evaluation problems.

### `/optimize-performance`
Review code for performance improvements, bundle size, and rendering optimization.

### `/add-provider [provider-name]`
Integrate a new LLM provider into the AI service layer.

### `/fix-ui [component-name]`
Debug UI/UX issues, responsive design, or Tailwind styling problems.

### `/refactor [file-path]`
Improve code structure, extract reusable components, or enhance maintainability.

### `/add-validation [feature]`
Add input validation and error handling for user actions or API calls.

### `/setup-deploy`
Configure deployment pipeline, environment variables, and production optimizations.

### `/img`
Access the images in the .claude/errorScreenShots folder to access immages the user has uploaded

## 🔧 Development Commands

```bash
# Development workflow
npm run dev              # Start with hot reload
npm run build           # Production build
npm run preview         # Test production build
npm run test            # Run test suite
npm run lint            # Check code quality
npm run format          # Auto-format code

# Debugging commands
npm run test:ui         # Interactive test runner
npm run build --debug   # Verbose build output
```

## 🎯 Architecture Principles

### 1. **Separation of Concerns**
- Game logic separated from UI components
- AI engine isolated from game state
- LLM service abstracted from AI strategies

### 2. **Event-Driven Architecture**
- Game engine emits events for state changes
- Components react to state updates
- AI decisions trigger game progressions

### 3. **Modular Design**
- Each component has single responsibility
- Utilities are pure functions when possible
- Services handle external integrations

### 4. **Performance First**
- Memoized expensive calculations
- Lazy loading for non-critical components
- Optimized bundle splitting

### 5. **Error Resilience**
- Graceful degradation for AI failures
- Fallback mechanisms throughout
- User-friendly error messages

## 🧪 Testing Strategy

### Component Tests
```javascript
// Test pattern for components
import { render, screen, fireEvent } from '@testing-library/react';
import ComponentName from './ComponentName.jsx';

test('should handle user interaction', () => {
  render(<ComponentName prop="value" />);
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByText('Expected')).toBeInTheDocument();
});
```

### Game Logic Tests
```javascript
// Test pattern for game logic
import { evaluateHand } from '../pokerLogic.js';

test('should correctly evaluate poker hands', () => {
  const hand = [/* card objects */];
  const result = evaluateHand(hand);
  expect(result.rank).toBe('flush');
});
```

## 🔮 Future Enhancement Ideas

### 🎯 High Priority
- **Player Statistics**: Detailed analytics and hand history
- **Real-time Multiplayer**: WebSocket integration for live games
- **Streaming Integration**: Twitch/YouTube broadcasting
- **Advanced Analytics**: Machine learning insights

### 🔄 Medium Priority  
- **Hand Replay System**: Step-through previous hands
- **AI Personality Expansion**: More detailed AI behaviors
- **Add AI Chat** To allow the LLM to enhance its ability to bluff and be bluffed

### 💡 Low Priority
- **Voice Commands**: Speech-to-text for actions and human chat
- **VR Integration**: Virtual reality poker table
- **Mobile Optimization**: Touch-friendly interface for mobile devices
- **Tournament Progression**: Multi-table tournaments with blind increases
- **Custom Game Modes**: Omaha, Stud, and other poker variants
- **Achievement System**: Unlock rewards and badges

## 🐛 Common Issues & Solutions

### Build Failures
- **Import/Export Errors**: Check file extensions (.js vs .jsx)
- **Missing Dependencies**: Run `npm install` after pulling changes
- **Type Errors**: Verify JSDoc type definitions

### AI Integration Issues
- **API Rate Limits**: Implement proper rate limiting
- **Invalid Responses**: Add response validation and fallbacks
- **Connection Timeouts**: Set appropriate timeout values

### Game Logic Bugs
- **Side Pot Calculations**: Test with multiple all-ins
- **Hand Evaluation Edge Cases**: Royal flush, wheel straight
- **Betting Round Logic**: Ensure proper turn progression

### UI/UX Problems
- **Responsive Design**: Test on mobile devices
- **Theme Switching**: Verify dark/light mode transitions
- **Animation Performance**: Check for jank on lower-end devices

---

## 💡 Development Tips

1. **Always test AI changes with Mock AI first** to avoid API costs
2. **Use browser dev tools** to monitor performance and memory
3. **Check game logs** for debugging game state issues
4. **Test edge cases** like all-ins, side pots, and disconnections
5. **Validate all user inputs** before processing game actions

---

*This guide should be updated as the project evolves. Keep it current for maximum effectiveness!*