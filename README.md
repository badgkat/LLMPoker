# 🎰 LLM Poker - AI-Powered Texas Hold'em Tournament

A sophisticated poker tournament application featuring AI opponents powered by Large Language Models (LLMs). Play against intelligent AI players with different strategies, personalities, and learning capabilities.

## ✨ Features

- **🤖 Multi-Provider AI Support**: OpenAI GPT, Anthropic Claude, Local LLMs (Ollama), or Mock AI
- **🧠 Intelligent AI Players**: 6 different AI strategies with memory and learning
- **🎯 Professional Poker Engine**: Complete Texas Hold'em rules, betting, side pots
- **🎮 Modern React UI**: Responsive design with dark/light modes
- **📊 Advanced Analytics**: Hand history, player statistics, game logs
- **⚡ Real-time Gameplay**: Smooth animations and instant feedback
- **🔧 Easy Configuration**: Simple setup for different AI providers

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- For Local LLM: [Ollama](https://ollama.ai) installed and running
- For Cloud LLM: API keys from [OpenAI](https://platform.openai.com) or [Anthropic](https://console.anthropic.com)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/your-username/LLMPoker.git
   cd LLMPoker
   npm install
   ```

2. **Configure AI Provider (Optional):**
   ```bash
   cp .env.example .env
   # Edit .env with your AI provider settings
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

### ⚡ One-Command Demo
```bash
# Try it instantly with mock AI (no setup required)
npm install && npm run dev
```

## 🧠 AI Configuration

### Mock AI (Default - No Setup Required)
Perfect for testing and development. The AI makes random but valid poker decisions.

### OpenAI Integration
1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Set in the AI Config screen or add to `.env`:
   ```
   VITE_LLM_PROVIDER=openai
   VITE_LLM_API_KEY=your_openai_api_key
   ```

### Anthropic Claude Integration
1. Get API key from [Anthropic Console](https://console.anthropic.com/)
2. Set in the AI Config screen or add to `.env`:
   ```
   VITE_LLM_PROVIDER=anthropic
   VITE_LLM_API_KEY=your_anthropic_api_key
   ```

### Local LLM (Ollama)
1. Install [Ollama](https://ollama.ai)
2. Download a model: `ollama pull llama3.1:8b`
3. Start Ollama: `ollama serve`
4. Select "Local LLM" in the AI Config screen

## 🎮 How to Play

1. **Setup Game:**
   - Enter your name
   - Configure AI opponents (names and strategies)
   - Click "AI Config" to set up your preferred AI provider

2. **AI Strategies Available:**
   - 🔥 **Aggressive**: Bluffs frequently, applies pressure
   - 🛡️ **Tight**: Conservative, plays premium hands only
   - 📊 **Mathematical**: Based on pot odds and expected value
   - 🎲 **Random**: Unpredictable, high variance play
   - 🎯 **Positional**: Adjusts strategy based on seat position
   - ⚖️ **Balanced**: Mix of aggressive and conservative play

3. **Start Playing:**
   - Click "Start Game" to begin the tournament
   - Use the action panel to make your poker decisions
   - Watch AI opponents make intelligent decisions with reasoning

## 📁 Project Structure

```
src/
├── ai/                    # AI engine and strategies
│   ├── aiEngine.js       # Main AI decision engine
│   ├── aiStrategies.js   # Strategy implementations
│   └── aiMemory.js       # AI learning and memory
├── components/           # React components
│   ├── game/            # Game-specific components
│   ├── ui/              # UI components
│   └── settings/        # Configuration components
├── constants/           # Game constants and configs
├── hooks/              # Custom React hooks
├── services/           # External services (LLM)
├── store/              # Zustand state management
└── utils/              # Game logic utilities
```

## 🛠️ Development

### Available Scripts

```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run preview     # Preview production build
npm run test        # Run tests
npm run lint        # Lint code
npm run format      # Format code with Prettier
```

### Environment Variables

See `.env.example` for all available configuration options:

- **LLM Provider Settings**: Configure AI provider and API keys
- **Game Settings**: Default blinds, starting chips, etc.
- **Development Settings**: Debug mode, logging, mock delays

## 🎯 Game Rules

- **Texas Hold'em**: Standard poker rules apply
- **Tournament Format**: Elimination-style with increasing blinds
- **Starting Chips**: 10,000 per player
- **Blinds**: Start at 100/200, increase over time
- **All-in Protection**: Side pots handled automatically
- **Hand Rankings**: Standard poker hand rankings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit: `git commit -m "Add feature description"`
5. Push: `git push origin feature-name`
6. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- AI strategies inspired by professional poker literature
- Built with modern React and Vite for optimal performance
- LLM integration supports the future of AI-powered gaming

## 🐛 Troubleshooting

### Common Issues:

**AI not working:**
- Check AI Config settings in the app
- Verify API keys are correct
- For local LLM, ensure Ollama is running on localhost:11434

**Game not starting:**
- Ensure all players have valid names
- Check browser console for errors
- Try refreshing the page

**Performance issues:**
- Reduce number of AI players
- Use Mock AI for faster decisions
- Check browser developer tools for memory usage

## 🧪 Testing

```bash
npm run test        # Run test suite
npm run test:ui     # Interactive test UI  
npm run lint        # Check code quality
npm run format      # Auto-format code
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run test suite |
| `npm run lint` | Lint codebase |
| `npm run format` | Format code with Prettier |

## 🔄 Project Status

- ✅ **Core Game Engine**: Complete Texas Hold'em implementation
- ✅ **AI Integration**: Multi-provider LLM support
- ✅ **Modern UI**: Responsive React application  
- ✅ **Production Ready**: Optimized build pipeline
- 🔄 **Future Enhancements**: See [CLAUDE.md](./CLAUDE.md) for development notes

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-username/LLMPoker/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/your-username/LLMPoker/discussions)
- 📖 **Documentation**: See [CLAUDE.md](./CLAUDE.md) for developer info

---

**Ready to play? Start the app and may the best player win! 🏆**

*Built with ❤️ using React, Vite, and the power of Large Language Models*
