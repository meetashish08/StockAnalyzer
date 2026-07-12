# Settings Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Open Settings
1. Launch Stock Analyzer
2. Click **⚙️ Settings** in the sidebar (bottom)

### Step 2: Configure API Key
1. Go to **🔑 API Configuration** tab
2. **Option A - Quick Setup:**
   - Enter your Portkey API key directly
   - Click **🔌 Test Connection**
   - Click **💾 Save Settings**
3. **Option B - Use Profiles (Recommended):**
   - Scroll to "API Key Profiles" section
   - Click **"+ Add New Profile"**
   - Enter profile name (e.g., "Work Account")
   - Paste your Portkey API key
   - Click **"Create Profile"**
   - Click **"Activate"** to use it

### Step 3: Customize AI (Optional)
1. Go to **🤖 AI Model Settings** tab
2. Choose your preferred model:
   - **Sonnet 4.5** (Recommended) - Fast & capable
   - **Haiku 4.5** - Fastest responses
   - **Opus 4.5** - Most capable
3. Adjust **Max Tokens** (1,000 - 8,000)
4. Adjust **Temperature** (0.0 - 1.0)
5. Toggle **Extended Thinking** on/off
6. Click **💾 Save Settings**

---

## 📋 Get Your Portkey API Key

1. Visit: [https://portkey.ai](https://portkey.ai)
2. Sign up (free tier available)
3. Go to **API Keys** section
4. Click **Create New API Key**
5. Copy the key (starts with `pk-`)
6. Paste into Stock Analyzer Settings

---

## ⚙️ Default Settings

If you don't configure anything, the app uses:
- **Model:** Claude Sonnet 4.5
- **Max Tokens:** 3,000
- **Temperature:** 0.7
- **Extended Thinking:** Off
- **API Key:** Fallback key (rate limited)

---

## 💡 Recommended Settings

### For Quick Queries
- **Model:** Claude Haiku 4.5
- **Max Tokens:** 1,500
- **Temperature:** 0.3
- **Extended Thinking:** Off

### For General Analysis (Recommended)
- **Model:** Claude Sonnet 4.5
- **Max Tokens:** 3,000
- **Temperature:** 0.7
- **Extended Thinking:** Off

### For Deep Research
- **Model:** Claude Opus 4.5
- **Max Tokens:** 6,000
- **Temperature:** 0.5
- **Extended Thinking:** On

---

## 🔑 Managing Multiple API Keys (NEW!)

### Why Use Profiles?
- Switch between Personal/Work/Testing accounts
- Manage rate limits across different keys
- Track usage by separating keys per project
- Easy one-click switching

### Quick Profile Management
1. **Add Profile**: Settings → API Configuration → "API Key Profiles" → "+ Add New Profile"
2. **Switch Profile**: Click "Activate" button on any profile
3. **Delete Profile**: Click "Delete" button (custom profiles only)
4. **View Active**: Look for green highlight with "ACTIVE" badge

### Profile Tips
✅ Give descriptive names ("Work Account", "Personal", "Testing")  
✅ Test new keys before activating  
✅ Default profile is protected (can't be deleted)  
✅ If active profile deleted, auto-switches to default  

---

## 🔧 Troubleshooting

### "API key not configured" error?
→ Go to Settings → API Configuration → Enter key → Save  
→ Or create a new profile with valid key

### Test connection fails?
→ Check your API key (any format accepted, must be ≥10 chars)  
→ Verify internet connection  
→ Try a different key  
→ Check server logs for detailed error

### Changes not saving?
→ Click "Save Settings" button  
→ Look for green success notification  
→ Reload the page

### Profile not switching?
→ Click "Activate" button on desired profile  
→ Check for success notification  
→ Reload AI Assistant page

---

## 📖 Full Documentation

For detailed information, see:
- [Settings Configuration Guide](docs/SETTINGS_CONFIGURATION_GUIDE.md)
- [AI Assistant User Guide](docs/AI_ASSISTANT_USER_GUIDE.md)
- [Feature Guide](docs/FEATURE_GUIDE.md)

---

## 🔒 Security Notes

✅ Settings stored locally on your machine
✅ API keys excluded from Git
✅ Keys masked in UI display
✅ No cloud sync (you control the data)

❌ Never share your `settings.json` file
❌ Never commit API keys to version control
❌ Never share screenshots with visible keys

---

## 📍 Settings Location

Your settings are stored here:
```
Stock_Analytics_Git/settings.json
```

This file is automatically created when you first save settings.

---

**Need Help?** Check the full [Settings Configuration Guide](docs/SETTINGS_CONFIGURATION_GUIDE.md)
