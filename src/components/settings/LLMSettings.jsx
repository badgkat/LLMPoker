import React, { useState, useEffect } from 'react';
import { llmService } from '../../services/llmService.js';

/**
 * LLM Configuration Settings Component
 */
const LLMSettings = ({ isOpen, onClose, onSave }) => {
  const [config, setConfig] = useState({
    provider: 'mock',
    apiKey: '',
    model: '',
    hasApiKey: false
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    if (isOpen) {
      // Load current configuration
      setConfig(llmService.getConfig());
      setProviders(llmService.getAvailableProviders());
      setTestResult(null);
    }
  }, [isOpen]);

  const handleProviderChange = (provider) => {
    setConfig(prev => ({
      ...prev,
      provider,
      model: llmService.getDefaultModel(provider),
      apiKey: provider === 'mock' || provider === 'local' ? '' : prev.apiKey
    }));
    setTestResult(null);
  };

  const handleApiKeyChange = (apiKey) => {
    setConfig(prev => ({
      ...prev,
      apiKey,
      hasApiKey: !!apiKey
    }));
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const isWorking = await llmService.testProvider(config.provider, config.apiKey);
      setTestResult(isWorking ? 'success' : 'failed');
    } catch (error) {
      setTestResult('error');
      console.error('Test failed:', error);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      llmService.updateConfig(config);
      await llmService.initialize();
      onSave?.(config);
      onClose();
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setTestResult('error');
    }
  };

  const requiresApiKey = config.provider === 'openai' || config.provider === 'anthropic';
  const canTest = !requiresApiKey || config.apiKey;
  const canSave = !requiresApiKey || config.apiKey;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            🧠 AI Configuration
          </h2>
          
          <div className="space-y-4">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Provider
              </label>
              <div className="space-y-2">
                {providers.map(provider => (
                  <label key={provider.id} className="flex items-start space-x-2">
                    <input
                      type="radio"
                      name="provider"
                      value={provider.id}
                      checked={config.provider === provider.id}
                      onChange={(e) => handleProviderChange(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-gray-800">
                        {provider.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {provider.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* API Key Input */}
            {requiresApiKey && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder={`Enter your ${config.provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-1 text-xs text-gray-500">
                  {config.provider === 'openai' && (
                    <>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a></>
                  )}
                  {config.provider === 'anthropic' && (
                    <>Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Anthropic Console</a></>
                  )}
                </div>
              </div>
            )}

            {/* Local LLM Info */}
            {config.provider === 'local' && (
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="text-sm text-blue-800">
                  <strong>Local LLM Setup:</strong>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    <li>Install <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="underline">Ollama</a></li>
                    <li>Run: <code className="bg-blue-100 px-1 rounded">ollama run llama3.1:8b</code></li>
                    <li>Ensure it's running on localhost:11434</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Mock AI Info */}
            {config.provider === 'mock' && (
              <div className="bg-green-50 p-3 rounded-md">
                <div className="text-sm text-green-800">
                  <strong>Mock AI:</strong> Perfect for testing! No setup required. 
                  The AI will make random but valid poker decisions.
                </div>
              </div>
            )}

            {/* Test Connection */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleTestConnection}
                disabled={testing || !canTest}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  testing || !canTest
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              
              {testResult && (
                <div className={`text-sm font-medium ${
                  testResult === 'success' 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {testResult === 'success' && '✅ Connection successful!'}
                  {testResult === 'failed' && '❌ Connection failed'}
                  {testResult === 'error' && '⚠️ Error occurred'}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`px-4 py-2 rounded-md font-medium ${
                canSave
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LLMSettings;