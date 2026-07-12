# Test API Connection - Debugging Guide

## What Was Fixed

### Problem
The "Test Connection" button in Settings always showed "Connection failed" even with a valid API key.

### Root Cause
1. **Insufficient timeout**: Test used 10 seconds, but Portkey/Claude API can take longer
2. **Limited error logging**: No detailed error information in console
3. **Low max_tokens**: Only 10 tokens, which might cause incomplete responses
4. **Generic error messages**: Didn't distinguish between different failure types

### Solution Applied

**Enhanced `/api/settings/test` endpoint with:**

1. **Increased timeout**: 10s → 15s
2. **Better max_tokens**: 10 → 50 tokens (ensures complete response)
3. **Detailed console logging**:
   - API key (masked)
   - Response status
   - Error details (status, data, code)
4. **Specific error messages**:
   - Invalid API key (401/403)
   - Connection timeout
   - Network errors (ENOTFOUND)
   - Portkey API errors with details
5. **Better test prompt**: "Say 'API key is working' in 5 words or less" (clearer validation)

## How to Test

### Method 1: Via Settings UI (Recommended)

1. Open http://localhost:3001
2. Click **⚙️ Settings** in sidebar
3. Go to **API Configuration** tab
4. Enter your Portkey API key
5. Click **🔌 Test Connection**
6. Watch for:
   - ✅ Success: "Connection successful! API key is valid and working."
   - ❌ Failure: Specific error message

### Method 2: Via PowerShell (Direct API Test)

```powershell
# Test with your API key
$apiKey = "pk-your-actual-api-key-here"

$body = @{
    portkeyApiKey = $apiKey
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "http://localhost:3001/api/settings/test" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

Write-Host "Success: $($response.success)" -ForegroundColor $(if($response.success){"Green"}else{"Red"})
Write-Host "Message: $($response.message)"
```

### Method 3: Via curl (Cross-platform)

```bash
curl -X POST http://localhost:3001/api/settings/test \
  -H "Content-Type: application/json" \
  -d '{"portkeyApiKey":"pk-your-actual-api-key-here"}'
```

## Check Server Logs

The server now logs detailed information about test attempts. Check the PowerShell window running `node server.js`:

**Successful Test:**
```
Testing Portkey API connection...
API Key (masked): pk-...1234
Test response status: 200
✓ Connection successful
```

**Failed Test:**
```
Testing Portkey API connection...
API Key (masked): pk-...1234
Test connection error: Request failed with status code 401
Error details: {
  status: 401,
  statusText: 'Unauthorized',
  data: { error: { type: 'authentication_error', message: 'Invalid API key' } },
  code: undefined
}
```

## Common Error Messages

### ✅ Success
**Message:** "Connection successful! API key is valid and working."
**Meaning:** Your Portkey API key is correct and working

### ❌ Error: "Invalid API key or insufficient permissions"
**HTTP Status:** 401 or 403
**Meaning:** The API key is incorrect or doesn't have proper permissions
**Fix:** 
1. Verify you copied the full API key from Portkey
2. Check for extra spaces or characters
3. Generate a new key at https://portkey.ai

### ❌ Error: "Connection timeout"
**Error Code:** ECONNABORTED or ETIMEDOUT
**Meaning:** Request took longer than 15 seconds
**Fix:**
1. Check your internet connection
2. Try again in a few seconds
3. Portkey servers might be slow

### ❌ Error: "Could not reach Portkey servers"
**Error Code:** ENOTFOUND
**Meaning:** DNS resolution failed for api.portkey.ai
**Fix:**
1. Check your internet connection
2. Verify DNS settings
3. Check firewall/proxy settings
4. Try: `ping api.portkey.ai`

### ❌ Error: "API key is required"
**HTTP Status:** 400
**Meaning:** No API key provided in request
**Fix:** Enter an API key in the input field

## Technical Details

### Test Request Format

```javascript
POST https://api.portkey.ai/v1/messages
Headers:
  Content-Type: application/json
  x-portkey-api-key: [your-key]
  anthropic-version: 2023-06-01

Body:
{
  "model": "@vertexai-global/anthropic.claude-sonnet-4-5@20250929",
  "max_tokens": 50,
  "messages": [
    {
      "role": "user",
      "content": "Say \"API key is working\" in 5 words or less."
    }
  ]
}
```

### Expected Response (Success)

```javascript
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "API key is working."
    }
  ],
  "model": "claude-sonnet-4.5",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 20,
    "output_tokens": 5
  }
}
```

## Troubleshooting Checklist

- [ ] Server is running (check for process on port 3001)
- [ ] Settings page loads without errors
- [ ] API key is entered correctly (starts with `pk-`)
- [ ] No extra spaces before/after API key
- [ ] Internet connection is active
- [ ] Can reach api.portkey.ai (try ping or browser)
- [ ] Firewall allows outbound HTTPS to api.portkey.ai
- [ ] API key is active (not expired/revoked)
- [ ] Portkey account has sufficient credits/quota
- [ ] Browser console shows no JavaScript errors (F12 → Console)
- [ ] Server logs show detailed error info

## Manual API Key Verification

If test continues to fail, verify your API key directly with Portkey:

```powershell
# Direct test to Portkey API (without our app)
$apiKey = "pk-your-actual-api-key-here"

$headers = @{
    "Content-Type" = "application/json"
    "x-portkey-api-key" = $apiKey
    "anthropic-version" = "2023-06-01"
}

$body = @{
    model = "@vertexai-global/anthropic.claude-sonnet-4-5@20250929"
    max_tokens = 10
    messages = @(
        @{
            role = "user"
            content = "test"
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod `
        -Uri "https://api.portkey.ai/v1/messages" `
        -Method POST `
        -Headers $headers `
        -Body $body
    
    Write-Host "✓ Direct API call succeeded!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 3)"
} catch {
    Write-Host "✗ Direct API call failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
}
```

## What Changed in Code

**File:** `server.js` (lines 338-386)

**Before:**
- Timeout: 10,000ms
- Max tokens: 10
- Generic error: "Connection failed"
- No console logging

**After:**
- Timeout: 15,000ms (50% increase)
- Max tokens: 50 (5x increase for complete responses)
- Specific errors: Invalid key, timeout, network, API errors
- Detailed console logging for debugging
- Better test prompt for validation

## Next Steps

1. **Test the connection** using Settings UI
2. **Check server logs** for detailed error info if it fails
3. **Try direct API test** (PowerShell script above) to isolate the issue
4. **Verify API key** at https://portkey.ai dashboard
5. **Check usage/quota** in Portkey account

## Support

If test still fails after these steps:
1. Copy the server log output (from PowerShell window)
2. Copy the error message from Settings UI
3. Include your internet/network setup details
4. Note if the direct API test (PowerShell script) works

---

**Server Status:** Running on http://localhost:3001
**Test URL:** http://localhost:3001 → ⚙️ Settings → API Configuration → Test Connection
