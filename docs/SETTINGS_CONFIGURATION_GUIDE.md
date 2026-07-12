# Settings Configuration Guide

## Overview

The Stock Analyzer application now supports configurable settings, allowing you to customize your Portkey API key and AI model preferences without editing code. This guide explains how to configure and use the Settings page.

---

## Table of Contents

1. [Accessing Settings](#accessing-settings)
2. [API Configuration](#api-configuration)
3. [AI Model Settings](#ai-model-settings)
4. [General Settings](#general-settings)
5. [Security & Privacy](#security--privacy)
6. [Troubleshooting](#troubleshooting)

---

## Accessing Settings

### Navigation
1. Launch the Stock Analyzer application
2. Look for the **⚙️ Settings** icon in the left sidebar (bottom of the navigation menu)
3. Click to open the Settings page

### Settings Location
All settings are stored in `settings.json` in the application root directory:
```
Stock_Analytics_Git/
├── settings.json          # Your custom settings (gitignored)
├── server.js             # Backend server
└── src/                  # Frontend source
```

**Important:** The `settings.json` file is automatically excluded from Git to protect your API keys.

---

## API Configuration

### Portkey API Key Setup

The Portkey API key enables AI Assistant features throughout the application.

#### Step-by-Step Setup:

1. **Navigate to API Configuration Tab**
   - Open Settings page
   - Select the **🔑 API Configuration** tab

2. **Check Current Status**
   - Green checkmark (✅) = API key is configured
   - Yellow warning (⚠️) = No API key set

3. **Enter Your API Key**
   - Type or paste your Portkey API key in the input field
   - Format: `pk-your-api-key-here`
   - Click the **👁️ Show / 🙈 Hide** button to toggle visibility

4. **Test Connection (Recommended)**
   - Click **🔌 Test Connection** button
   - Wait for validation (tests actual API connectivity)
   - Success: ✅ "Connection successful!"
   - Failure: ❌ Error message with details

5. **Save Settings**
   - Click **💾 Save Settings** button
   - Confirmation: ✅ "Settings saved successfully!"

#### Getting Your Portkey API Key

Follow these steps to obtain a Portkey API key:

1. Visit [https://portkey.ai](https://portkey.ai)
2. Sign up for a free account or log in
3. Navigate to **API Keys** section in the dashboard
4. Click **Create New API Key**
5. Copy the generated key (starts with `pk-`)
6. Paste into Stock Analyzer Settings

**Note:** Keep your API key secure and never share it publicly.

### API Key Security

- **Masked Display**: Only the last 4 characters are shown (e.g., `pk-...abc123`)
- **Gitignore Protection**: `settings.json` is excluded from version control
- **Secure Storage**: Keys stored locally on your machine
- **No Network Exposure**: API key never exposed in GET requests

---

## AI Model Settings

Customize how the AI Assistant processes your requests.

### Available Models

#### 1. Claude Sonnet 4.5 (Recommended)
- **Speed:** Fast
- **Capability:** Highly capable
- **Best For:** General stock analysis, portfolio insights, market research
- **Model ID:** `claude-sonnet`

#### 2. Claude Haiku 4.5
- **Speed:** Fastest
- **Capability:** Good for quick queries
- **Best For:** Simple questions, quick lookups, rapid responses
- **Model ID:** `claude-haiku`

#### 3. Claude Opus 4.5
- **Speed:** Slower but most thorough
- **Capability:** Most capable
- **Best For:** Complex analysis, deep research, comprehensive reports
- **Model ID:** `claude-opus`

### Configuration Options

#### Max Tokens
- **Range:** 1,000 - 8,000 tokens
- **Default:** 3,000 tokens
- **Impact:**
  - Lower values (1,000-2,000): Faster responses, shorter answers
  - Higher values (5,000-8,000): More detailed responses, longer processing time
- **Use Case:**
  - 1,000-2,000: Quick questions ("What's TCS current price?")
  - 3,000-4,000: Standard analysis (portfolio review)
  - 5,000-8,000: Deep research (comprehensive sector analysis)

#### Temperature
- **Range:** 0.0 - 1.0
- **Default:** 0.7
- **Impact:**
  - Lower values (0.0-0.3): Focused, deterministic, factual
  - Medium values (0.4-0.7): Balanced creativity and accuracy
  - Higher values (0.8-1.0): More creative, varied responses
- **Use Case:**
  - 0.0-0.3: Precise calculations, data extraction
  - 0.4-0.7: General analysis and recommendations
  - 0.8-1.0: Creative investment ideas, brainstorming

#### Extended Thinking
- **Type:** Toggle (On/Off)
- **Default:** Off
- **When Enabled:**
  - AI thinks through complex problems step-by-step
  - Longer processing time
  - More thorough analysis
  - Better handling of multi-part questions
- **Best For:**
  - Complex portfolio optimization
  - Multi-factor stock comparison
  - Investment strategy planning

### Adjusting Settings

1. Navigate to **🤖 AI Model Settings** tab
2. Select your preferred model by clicking on it
3. Adjust **Max Tokens** slider (1,000 - 8,000)
4. Adjust **Temperature** slider (0.0 - 1.0)
5. Toggle **Extended Thinking** on/off
6. Click **💾 Save Settings** to apply
7. Click **🔄 Reset to Defaults** to restore default values

---

## General Settings

### Application Information

View system details:
- **Application Version:** v1.0.0
- **Server Port:** 3001 (local development server)
- **Data Source:** Yahoo Finance API
- **AI Provider:** Portkey + Claude

### Data Management

#### Export Portfolio Data
- Download all holdings and transactions
- Format: JSON export
- Use for backup or data migration

#### Clear Cache
- Clears analytics cache
- Clears price cache
- Forces fresh data fetch on next request
- Useful when data appears stale

**Note:** These features are currently placeholders for future implementation.

---

## Security & Privacy

### How Your Data is Protected

1. **Local Storage**
   - All settings stored on your local machine
   - No cloud synchronization
   - You control the data

2. **API Key Protection**
   - Keys masked in UI display
   - Excluded from Git commits
   - Never logged or exposed in network requests

3. **No Telemetry**
   - Application doesn't send usage data
   - Your portfolio data stays private
   - Market data fetched directly from Yahoo Finance

### Best Practices

✅ **DO:**
- Keep your Portkey API key secure
- Use unique API keys per application
- Test connection before saving
- Regularly review settings

❌ **DON'T:**
- Share your `settings.json` file
- Commit API keys to version control
- Use the same key across multiple apps
- Share screenshots with visible API keys

---

## Troubleshooting

### Issue: "Portkey API key not configured" Error

**Solution:**
1. Navigate to Settings → API Configuration
2. Enter your Portkey API key
3. Click "Test Connection" to validate
4. Click "Save Settings"
5. Return to AI Assistant and try again

### Issue: Test Connection Fails

**Possible Causes:**
1. **Invalid API Key Format**
   - Ensure key starts with `pk-`
   - Check for extra spaces or characters

2. **Network Connectivity**
   - Verify internet connection
   - Check firewall settings
   - Try again in a few minutes

3. **API Key Expired/Revoked**
   - Generate a new key at [portkey.ai](https://portkey.ai)
   - Update in Settings

### Issue: Changes Not Saving

**Solution:**
1. Check for error messages in notification
2. Ensure you clicked "Save Settings" button
3. Check file permissions on `settings.json`
4. Restart the application
5. Try again

### Issue: API Key Shows as Masked

**This is Normal:**
For security, the API key is displayed as `pk-...1234` (showing only last 4 characters). This is intentional to prevent accidental exposure.

**To Update:**
- Simply enter a new key in the input field
- Leave blank to keep existing key
- Save changes

### Issue: AI Assistant Not Using New Settings

**Solution:**
1. Ensure you clicked "Save Settings"
2. Check for success notification (✅)
3. Reload the AI Assistant page
4. Try sending a new message
5. If issues persist, restart the server

### Issue: Unsaved Changes Warning

**This is Normal:**
The warning appears when you've modified settings but haven't clicked "Save Settings" yet.

**To Resolve:**
- Click "💾 Save Settings" to apply changes
- Refresh page to discard changes

---

## Configuration File Structure

### settings.json Format

```json
{
  "portkeyApiKey": "pk-your-actual-api-key-here",
  "claudeModel": "claude-sonnet",
  "maxTokens": 3000,
  "temperature": 0.7,
  "extendedThinking": false
}
```

### Default Values

If `settings.json` doesn't exist, the application uses these defaults:

```json
{
  "portkeyApiKey": "[Fallback hardcoded key]",
  "claudeModel": "claude-sonnet",
  "maxTokens": 3000,
  "temperature": 0.7,
  "extendedThinking": false
}
```

### Environment Variable Fallback

You can also set the API key via environment variable:

```bash
# Windows (PowerShell)
$env:PORTKEY_API_KEY = "pk-your-key-here"

# Windows (CMD)
set PORTKEY_API_KEY=pk-your-key-here

# Linux/Mac
export PORTKEY_API_KEY=pk-your-key-here
```

**Priority Order:**
1. `settings.json` file (highest priority)
2. Environment variable `PORTKEY_API_KEY`
3. Hardcoded fallback (default)

---

## API Key Profiles (NEW Feature)

### Multiple API Keys with Easy Switching

You can now save multiple Portkey API keys with unique names and switch between them instantly.

#### Use Cases
- **Different Accounts**: Personal, Work, Testing
- **Rate Limit Management**: Switch when one key hits limits
- **Team Collaboration**: Each team member uses their own key
- **Cost Tracking**: Separate keys for different projects

#### How to Use Profiles

1. **View All Profiles**
   - Go to Settings → API Configuration tab
   - Scroll to "API Key Profiles" section
   - See list of all saved profiles
   - Active profile highlighted in green with "ACTIVE" badge

2. **Add New Profile**
   - Click **"+ Add New Profile"** button
   - Enter profile name (e.g., "Work Account", "Personal", "Testing")
   - Paste your Portkey API key
   - Click **"Create Profile"**
   - New profile appears in list

3. **Switch Between Profiles**
   - Find the profile you want to use
   - Click **"Activate"** button
   - Profile becomes active immediately
   - AI Assistant now uses the new key
   - Green highlight moves to active profile

4. **Delete Unused Profile**
   - Click **"Delete"** button on any custom profile
   - Confirm deletion
   - Profile removed from list
   - Note: Default profile cannot be deleted (protected)

#### Profile Features
- ✅ Unlimited profiles (save as many as you need)
- ✅ Unique names (no duplicates allowed)
- ✅ Instant switching (one-click activation)
- ✅ Protected default (can't accidentally delete)
- ✅ Auto-fallback (if active profile deleted, switches to default)
- ✅ Creation timestamps (see when each profile was added)
- ✅ Masked keys (security - only last 4 characters shown)

---

## API Endpoints

For developers integrating with the settings system:

### Settings Endpoints

#### GET /api/settings
Retrieves current settings with masked API key.

**Response:**
```json
{
  "portkeyApiKey": "pk-...1234",
  "portkeyApiKeySet": true,
  "claudeModel": "claude-sonnet",
  "maxTokens": 3000,
  "temperature": 0.7,
  "extendedThinking": false
}
```

### POST /api/settings
Updates settings. Only provided fields are modified.

**Request:**
```json
{
  "portkeyApiKey": "pk-new-key-here",
  "claudeModel": "claude-opus",
  "maxTokens": 5000,
  "temperature": 0.5,
  "extendedThinking": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings saved successfully",
  "settings": {
    "portkeyApiKey": "pk-...here",
    "portkeyApiKeySet": true,
    "claudeModel": "claude-opus",
    "maxTokens": 5000,
    "temperature": 0.5,
    "extendedThinking": true
  }
}
```

### POST /api/settings/test
Tests Portkey API connection.

**Request:**
```json
{
  "portkeyApiKey": "pk-key-to-test"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Connection successful! API key is valid and working."
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "Invalid API key or insufficient permissions."
}
```

### Profile Management Endpoints

#### GET /api/settings/profiles
Retrieves all API key profiles.

**Response:**
```json
{
  "profiles": [
    {
      "id": "default",
      "name": "Default Key",
      "key": "MfS...K",
      "isActive": true,
      "createdAt": "2026-07-12T10:30:00.000Z"
    },
    {
      "id": "profile_1720786900_abc789",
      "name": "Work Account",
      "key": "pk-...xyz",
      "isActive": false,
      "createdAt": "2026-07-12T11:00:00.000Z"
    }
  ],
  "activeProfileId": "default"
}
```

#### POST /api/settings/profiles
Creates a new API key profile.

**Request:**
```json
{
  "name": "Personal Account",
  "key": "pk-personal-api-key-here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile created successfully",
  "profile": {
    "id": "profile_1720786950_xyz456",
    "name": "Personal Account",
    "key": "pk-...here",
    "isActive": false,
    "createdAt": "2026-07-12T11:15:00.000Z"
  }
}
```

#### POST /api/settings/profiles/:id/activate
Activates a profile (makes it the active API key).

**Request:**
```
POST /api/settings/profiles/profile_1720786900_abc789/activate
```

**Response:**
```json
{
  "success": true,
  "message": "Profile \"Work Account\" is now active",
  "activeProfileId": "profile_1720786900_abc789"
}
```

#### DELETE /api/settings/profiles/:id
Deletes a profile.

**Request:**
```
DELETE /api/settings/profiles/profile_1720786900_abc789
```

**Response:**
```json
{
  "success": true,
  "message": "Profile \"Work Account\" deleted successfully"
}
```

**Note:** Default profile (id: "default") cannot be deleted.

---

## Frequently Asked Questions

### Q: Do I need my own Portkey API key?

**A:** The application includes a fallback API key for quick testing, but for production use and to avoid rate limits, it's recommended to use your own Portkey API key.

### Q: Is there a free tier for Portkey?

**A:** Yes, Portkey offers a free tier with limited API calls. Check [portkey.ai/pricing](https://portkey.ai/pricing) for current plans.

### Q: Can I use multiple API keys?

**A:** Currently, the application supports one API key at a time. You can easily switch keys through the Settings page.

### Q: Will my settings sync across devices?

**A:** No, settings are stored locally on your machine. Each installation requires separate configuration.

### Q: What happens if I delete settings.json?

**A:** The application will regenerate the file with default values on next launch. You'll need to reconfigure your API key.

### Q: Can I export/import settings?

**A:** Currently, you need to manually copy the `settings.json` file to transfer settings between installations.

---

## Update History

- **Version 1.1.0** (2026-07-12)
  - **NEW**: Multiple API key profiles with unique names
  - **NEW**: Profile management UI (create, activate, delete)
  - **NEW**: Instant switching between profiles
  - **FIXED**: API key validation (now accepts any key ≥10 chars)
  - **FIXED**: Test connection timeout increased to 15s
  - **FIXED**: Enhanced error messages for test failures
  - Added 4 new API endpoints for profile management
  - Protected default profile from deletion
  - Auto-fallback to default when active profile deleted

- **Version 1.0.0** (2026-07-12)
  - Initial release of configurable settings
  - API Configuration tab
  - AI Model Settings tab
  - General Settings tab
  - Test connection feature
  - Settings persistence

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review [docs/README.md](README.md) for general app documentation
3. Check [docs/AI_ASSISTANT_USER_GUIDE.md](AI_ASSISTANT_USER_GUIDE.md) for AI features
4. File an issue in the GitHub repository

---

## Related Documentation

- [Feature Guide](FEATURE_GUIDE.md) - Complete feature overview
- [AI Assistant User Guide](AI_ASSISTANT_USER_GUIDE.md) - AI capabilities and usage
- [AI Architecture](AI_ARCHITECTURE.md) - Technical implementation details
- [Educational Modules](EDUCATIONAL_MODULES.md) - Learning resources
