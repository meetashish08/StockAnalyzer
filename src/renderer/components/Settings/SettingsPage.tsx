import React, { useState, useEffect } from 'react';

interface Settings {
  aiProvider: 'anthropic' | 'openai' | 'google';
  portkeyApiKey: string | null;
  portkeyApiKeySet: boolean;
  claudeModel: string;
  maxTokens: number;
  temperature: number;
  extendedThinking: boolean;
}

interface ApiKeyProfile {
  id: string;
  name: string;
  key: string; // masked
  isActive: boolean;
  createdAt: string;
}

const AI_MODELS = [
  { id: 'claude-sonnet', name: 'Claude Sonnet 4.5', description: 'Fast & capable (Recommended)' },
  { id: 'claude-haiku', name: 'Claude Haiku 4.5', description: 'Fastest responses' },
  { id: 'claude-opus', name: 'Claude Opus 4.5', description: 'Most capable' },
];

const MODELS_BY_PROVIDER = {
  anthropic: [
    { id: 'sonnet', name: 'Claude Sonnet 4.5', description: 'Balanced - Fast & capable' },
    { id: 'opus', name: 'Claude Opus 4.5', description: 'Most capable, slower' },
    { id: 'haiku', name: 'Claude Haiku 4.5', description: 'Fastest, cheaper' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Fastest GPT-4 model' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Most capable' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Budget option' },
  ],
  google: [
    { id: 'gemini-pro', name: 'Gemini 1.5 Pro', description: 'Most capable' },
    { id: 'gemini-flash', name: 'Gemini 1.5 Flash', description: 'Fastest' },
  ]
};

const PROVIDER_INFO = {
  anthropic: {
    name: 'Anthropic Claude',
    description: 'Best for financial analysis and complex reasoning',
    badge: '🏆 Current'
  },
  openai: {
    name: 'OpenAI GPT',
    description: 'Fast and versatile, good alternative to Claude',
    badge: '⚡ Fast'
  },
  google: {
    name: 'Google Gemini',
    description: 'Cost-effective option with good performance',
    badge: '💰 Budget'
  }
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'api' | 'model' | 'general'>('api');
  const [settings, setSettings] = useState<Settings>({
    aiProvider: 'anthropic',
    portkeyApiKey: null,
    portkeyApiKeySet: false,
    claudeModel: 'sonnet',
    maxTokens: 3000,
    temperature: 0.7,
    extendedThinking: false,
  });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Profile management state
  const [profiles, setProfiles] = useState<ApiKeyProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState('default');
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileKey, setNewProfileKey] = useState('');

  useEffect(() => {
    loadSettings();
    loadProfiles();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadSettings = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/settings');
      const data = await response.json();
      setSettings({
        ...data,
        aiProvider: data.aiProvider || 'anthropic'
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      showNotification('error', 'Failed to load settings');
    }
  };

  const loadProfiles = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/settings/profiles');
      const data = await response.json();
      setProfiles(data.profiles);
      setActiveProfileId(data.activeProfileId);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      const payload: any = {
        aiProvider: settings.aiProvider,
        claudeModel: settings.claudeModel,
        maxTokens: settings.maxTokens,
        temperature: settings.temperature,
        extendedThinking: settings.extendedThinking,
      };

      // Only include API key if it was changed
      if (apiKeyInput) {
        payload.portkeyApiKey = apiKeyInput;
      }

      const response = await fetch('http://localhost:3001/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSettings(data.settings);
        setApiKeyInput(''); // Clear the input after successful save
        setHasUnsavedChanges(false);
        showNotification('success', 'Settings saved successfully!');
      } else {
        showNotification('error', data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Save error:', error);
      showNotification('error', 'Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    if (!apiKeyInput && !settings.portkeyApiKeySet) {
      showNotification('error', 'Please enter an API key first');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('http://localhost:3001/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portkeyApiKey: apiKeyInput || settings.portkeyApiKey,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showNotification('success', data.message);
      } else {
        showNotification('error', data.message);
      }
    } catch (error) {
      console.error('Test error:', error);
      showNotification('error', 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This will not affect your API key.')) {
      setSettings(prev => ({
        ...prev,
        aiProvider: 'anthropic',
        claudeModel: 'sonnet',
        maxTokens: 3000,
        temperature: 0.7,
        extendedThinking: false,
      }));
      setHasUnsavedChanges(true);
      showNotification('success', 'Settings reset to defaults. Click Save to apply.');
    }
  };

  const createProfile = async () => {
    if (!newProfileName || !newProfileKey) {
      showNotification('error', 'Please provide both name and API key');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/settings/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProfileName,
          key: newProfileKey,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', data.message);
        setNewProfileName('');
        setNewProfileKey('');
        setShowAddProfile(false);
        await loadProfiles();
      } else {
        showNotification('error', data.error);
      }
    } catch (error) {
      showNotification('error', 'Failed to create profile');
    } finally {
      setIsLoading(false);
    }
  };

  const activateProfile = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/settings/profiles/${id}/activate`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', data.message);
        setActiveProfileId(id);
        await loadProfiles();
        await loadSettings();
      } else {
        showNotification('error', data.error);
      }
    } catch (error) {
      showNotification('error', 'Failed to activate profile');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProfile = async (id: string, name: string) => {
    if (!confirm(`Delete profile "${name}"? This cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/settings/profiles/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        showNotification('success', data.message);
        await loadProfiles();
        await loadSettings();
      } else {
        showNotification('error', data.error);
      }
    } catch (error) {
      showNotification('error', 'Failed to delete profile');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSettingChange = (key: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <span className="text-4xl">⚙️</span>
          Settings
        </h1>
        <p className="text-slate-400">Configure your Stock Analyzer application</p>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            notification.type === 'success'
              ? 'bg-green-500/20 border border-green-500/50 text-green-400'
              : 'bg-red-500/20 border border-red-500/50 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{notification.type === 'success' ? '✅' : '❌'}</span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('api')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'api'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🔑 API Configuration
        </button>
        <button
          onClick={() => setActiveTab('model')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'model'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🤖 AI Model Settings
        </button>
        <button
          onClick={() => setActiveTab('general')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'general'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🔧 General
        </button>
      </div>

      {/* API Configuration Tab */}
      {activeTab === 'api' && (
        <div className="bg-slate-800 rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Portkey API Configuration</h2>
            <p className="text-slate-400 text-sm mb-6">
              Configure your Portkey API key to enable AI Assistant features
            </p>
          </div>

          {/* API Key Status */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Current Status</p>
                <p className="text-lg font-medium text-white mt-1">
                  {settings.portkeyApiKeySet ? (
                    <span className="text-green-400 flex items-center gap-2">
                      ✅ API Key Configured
                      {settings.portkeyApiKey && (
                        <span className="text-xs text-slate-400 font-mono">
                          ({settings.portkeyApiKey})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-yellow-400">⚠️ No API Key Set</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Portkey API Key
              <span className="text-slate-500 ml-2">
                (Works with Claude, GPT, Gemini)
              </span>
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="pk-your-portkey-api-key-here"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 pr-24"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm text-slate-400 hover:text-white transition-colors"
              >
                {showApiKey ? '🙈 Hide' : '👁️ Show'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Enter a new API key to update. Leave blank to keep the current key.
            </p>
          </div>

          {/* Help Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="text-sm font-medium text-blue-400 mb-1">API Key Profiles</p>
                <p className="text-xs text-slate-300 mb-2">
                  Save multiple API keys with unique names for easy switching between accounts.
                </p>
                <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside">
                  <li>Get your API key from <a href="https://portkey.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">portkey.ai</a></li>
                  <li>Click "Add New Profile" button below</li>
                  <li>Enter a name (e.g., "Work Account") and paste your API key</li>
                  <li>Click "Create Profile"</li>
                  <li>Click "Activate" to switch between profiles</li>
                </ol>
              </div>
            </div>
          </div>

          {/* API Key Profiles Section */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">API Key Profiles</h3>
              <button
                onClick={() => setShowAddProfile(!showAddProfile)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {showAddProfile ? '✕ Cancel' : '+ Add New Profile'}
              </button>
            </div>

            {/* Add New Profile Form */}
            {showAddProfile && (
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 mb-4">
                <h4 className="text-sm font-medium text-white mb-3">Create New Profile</h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Profile Name
                    </label>
                    <input
                      type="text"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      placeholder="e.g., Work Account, Personal, Testing"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Portkey API Key
                    </label>
                    <input
                      type="password"
                      value={newProfileKey}
                      onChange={(e) => setNewProfileKey(e.target.value)}
                      placeholder="pk-your-api-key-here"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <button
                    onClick={createProfile}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    {isLoading ? 'Creating...' : 'Create Profile'}
                  </button>
                </div>
              </div>
            )}

            {/* Profiles List */}
            <div className="space-y-2">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    profile.isActive
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-white">{profile.name}</p>
                        {profile.isActive && (
                          <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/50 text-green-400 text-xs rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 font-mono">
                        {profile.key}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Created: {new Date(profile.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {!profile.isActive && (
                        <button
                          onClick={() => activateProfile(profile.id)}
                          disabled={isLoading}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Activate
                        </button>
                      )}
                      {profile.id !== 'default' && (
                        <button
                          onClick={() => deleteProfile(profile.id, profile.name)}
                          disabled={isLoading}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {profiles.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <p>No API key profiles yet.</p>
                  <p className="text-sm mt-1">Click "Add New Profile" to create one.</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={testConnection}
              disabled={isTesting || (!apiKeyInput && !settings.portkeyApiKeySet)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isTesting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  🔌 Test Connection
                </>
              )}
            </button>
            <button
              onClick={saveSettings}
              disabled={isLoading || !hasUnsavedChanges}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  💾 Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* AI Model Settings Tab */}
      {activeTab === 'model' && (
        <div className="bg-slate-800 rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-4">AI Model Configuration</h2>
            <p className="text-slate-400 text-sm mb-6">
              Customize AI behavior and performance
            </p>
          </div>

          {/* Provider Info Banner */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-1">Multi-Provider AI Support</h4>
                <p className="text-sm text-slate-300">
                  Switch between Anthropic Claude, OpenAI GPT, and Google Gemini. All providers
                  support the 11 Yahoo Finance tools for stock analysis. Your Portkey API key
                  works across all providers.
                </p>
              </div>
            </div>
          </div>

          {/* AI Provider Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              AI Provider
            </label>

            <div className="grid grid-cols-1 gap-3">
              {(['anthropic', 'openai', 'google'] as const).map((provider) => (
                <button
                  key={provider}
                  onClick={() => {
                    handleSettingChange('aiProvider', provider);
                    // Reset model to first available for new provider
                    const firstModel = MODELS_BY_PROVIDER[provider][0].id;
                    handleSettingChange('claudeModel', firstModel);
                  }}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    settings.aiProvider === provider
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        {PROVIDER_INFO[provider].name}
                        {settings.aiProvider === provider && (
                          <span className="text-xs px-2 py-0.5 bg-blue-500 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        {PROVIDER_INFO[provider].description}
                      </div>
                    </div>
                    <div className="text-2xl">
                      {provider === 'anthropic' && '🤖'}
                      {provider === 'openai' && '⚡'}
                      {provider === 'google' && '🔷'}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-400 mt-2">
              💡 All providers use the same Portkey API key. Tool calling works across all providers.
            </p>
          </div>

          {/* Model Selection - Dynamic based on provider */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Model
            </label>

            <select
              value={settings.claudeModel}
              onChange={(e) => handleSettingChange('claudeModel', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {MODELS_BY_PROVIDER[settings.aiProvider || 'anthropic'].map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} - {model.description}
                </option>
              ))}
            </select>

            <p className="text-xs text-slate-400">
              Selected: {MODELS_BY_PROVIDER[settings.aiProvider || 'anthropic']
                .find(m => m.id === settings.claudeModel)?.name || 'Unknown'}
            </p>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Max Tokens: {settings.maxTokens.toLocaleString()}
            </label>
            <input
              type="range"
              min="1000"
              max="20000"
              step="500"
              value={settings.maxTokens}
              onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1,000 (Faster)</span>
              <span>20,000 (Maximum)</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Higher values allow longer responses but may take more time. Portkey max: 20,000 tokens.
            </p>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Temperature: {settings.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>0.0 (Focused)</span>
              <span>1.0 (Creative)</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Lower values make responses more focused and deterministic
            </p>
          </div>

          {/* Extended Thinking */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-white">Enable Extended Thinking</p>
                <p className="text-sm text-slate-400 mt-1">
                  Allow the AI to think through complex problems step-by-step
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.extendedThinking}
                  onChange={(e) => handleSettingChange('extendedThinking', e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-14 h-8 rounded-full transition-colors ${
                    settings.extendedThinking ? 'bg-green-500' : 'bg-slate-600'
                  }`}
                >
                  <div
                    className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform mt-1 ${
                      settings.extendedThinking ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </div>
              </div>
            </label>
          </div>

          {/* Save Button */}
          <div className="flex gap-3">
            <button
              onClick={saveSettings}
              disabled={isLoading || !hasUnsavedChanges}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  💾 Save Settings
                </>
              )}
            </button>
            <button
              onClick={resetToDefaults}
              className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
            >
              🔄 Reset to Defaults
            </button>
          </div>
        </div>
      )}

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="bg-slate-800 rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-4">General Settings</h2>
            <p className="text-slate-400 text-sm mb-6">
              Application information and preferences
            </p>
          </div>

          {/* App Info */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Application Version</span>
              <span className="text-white font-medium">v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Server Port</span>
              <span className="text-white font-medium">3001</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Data Source</span>
              <span className="text-white font-medium">Yahoo Finance</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">AI Provider</span>
              <span className="text-white font-medium">Portkey + Claude</span>
            </div>
          </div>

          {/* Data Management */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Data Management</h3>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-left transition-colors flex items-center justify-between">
                <div>
                  <p className="font-medium">Export Portfolio Data</p>
                  <p className="text-sm text-slate-400">Download all holdings and transactions</p>
                </div>
                <span>📤</span>
              </button>
              <button className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-left transition-colors flex items-center justify-between">
                <div>
                  <p className="font-medium">Clear Cache</p>
                  <p className="text-sm text-slate-400">Clear analytics and price cache</p>
                </div>
                <span>🗑️</span>
              </button>
            </div>
          </div>

          {/* About */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <span className="text-2xl">📈</span>
              <div>
                <p className="font-medium text-blue-400 mb-1">Stock Analyzer</p>
                <p className="text-xs text-slate-300">
                  A comprehensive stock market analysis and portfolio tracking application for India and US markets.
                  Built with React, TypeScript, and powered by Claude AI.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400">
            <span>⚠️</span>
            <span className="text-sm">You have unsaved changes. Click "Save Settings" to apply them.</span>
          </div>
        </div>
      )}
    </div>
  );
}
