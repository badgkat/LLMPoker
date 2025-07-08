import React from 'react';

/**
 * Error Boundary component for catching and handling React errors
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // In production, you might want to log this to an error reporting service
    if (typeof window !== 'undefined' && window.reportError) {
      window.reportError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      const { darkMode = false } = this.props;
      
      return (
        <div className={`min-h-screen flex items-center justify-center p-6 ${
          darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
        }`}>
          <div className={`max-w-2xl w-full ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
          } rounded-xl p-8 border shadow-2xl`}>
            
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">💥</div>
              <h1 className="text-3xl font-bold mb-2 text-red-600">
                Oops! Something went wrong
              </h1>
              <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                The poker app encountered an unexpected error
              </p>
            </div>

            <div className={`${
              darkMode ? 'bg-gray-700' : 'bg-gray-50'
            } rounded-lg p-4 mb-6`}>
              <h3 className="font-semibold mb-2">What happened?</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-3`}>
                A component in the poker application crashed. This could be due to:
              </p>
              <ul className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} space-y-1 ml-4`}>
                <li>• Unexpected game state changes</li>
                <li>• Network connectivity issues</li>
                <li>• Browser compatibility problems</li>
                <li>• Memory constraints</li>
              </ul>
            </div>

            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className={`${
                darkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'
              } border rounded-lg p-4 mb-6`}>
                <summary className="cursor-pointer font-medium text-red-600 mb-2">
                  Technical Details (Development Mode)
                </summary>
                <div className="space-y-2">
                  <div>
                    <strong>Error:</strong>
                    <pre className="text-xs mt-1 overflow-auto bg-black/20 p-2 rounded">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="text-xs mt-1 overflow-auto bg-black/20 p-2 rounded">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                🔄 Reload Page
              </button>
              
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  // Also reset the game store if available
                  if (typeof window !== 'undefined' && window.resetPokerGame) {
                    window.resetPokerGame();
                  }
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                🎮 Try Again
              </button>

              <button
                onClick={() => {
                  // Go back to setup screen
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  if (this.props.onReset) {
                    this.props.onReset();
                  }
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  darkMode 
                    ? 'bg-green-700 hover:bg-green-600 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                🏠 New Game
              </button>
            </div>

            <div className={`mt-6 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <p>If this problem persists, try:</p>
              <div className="mt-2 space-y-1">
                <div>• Clearing your browser cache</div>
                <div>• Disabling browser extensions</div>
                <div>• Using a different browser</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;