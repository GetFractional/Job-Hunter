# Debugging Job Hunter Extension

## Step 1: Check Service Worker Status

1. **Open Chrome Extensions Page**: chrome://extensions/
2. **Enable Developer Mode** (top right)
3. **Find "Job Hunter OS"** extension
4. **Click "Inspect views: service worker"** (or "Inspect views: background page")
   - If you see "Inspect views: service worker (inactive)", that's the problem!
   - The service worker has shut down and isn't restarting when messages arrive

## Step 2: Check Console Errors

### In Service Worker Console:
1. Open the service worker inspector (from step 1)
2. Look for any errors on load
3. Check if you see: `[Job Hunter BG] Background service worker initialized`
4. Keep this console open

### In Page Console (LinkedIn/Indeed):
1. Open DevTools on a LinkedIn job page (F12)
2. Click the "Send to Job Hunter" button
3. Look for errors like:
   - `Error: Could not establish connection. Receiving end does not exist.`
   - `Error: Extension context invalidated`
   - `Error: Timed out talking to background script`
   - Any `[Job Hunter]` prefixed messages

## Step 3: Test Message Flow

1. With both consoles open (service worker + page)
2. Click "Send to Job Hunter" button
3. Check if you see in service worker console:
   - `[Job Hunter BG] Received message: jobHunter.createAirtableRecord`
   - `[Job Hunter BG] Sending request to Airtable...`
4. If you DON'T see these messages, the service worker isn't receiving messages

## Step 4: Check Credentials

1. Click the Job Hunter extension icon
2. Verify your Airtable Base ID and Personal Access Token are saved
3. Click "Test Connection" to verify they work

## Common Issues & What They Mean

| Error Message | Meaning | Fix |
|--------------|---------|-----|
| "Timed out talking to background script" | Service worker is not running or crashed | Reload extension |
| "Could not establish connection" | Service worker is inactive | Need to keep it alive |
| "Extension context invalidated" | Extension was reloaded while page was open | Refresh the page |
| "Invalid API token" | Credentials are wrong | Update in popup settings |
| "Table not found" | Base ID is wrong or table name doesn't match | Check Airtable |

## Quick Fix: Reload Extension

1. Go to chrome://extensions/
2. Find "Job Hunter OS"
3. Click the refresh icon (🔄)
4. Refresh your LinkedIn/Indeed tab
5. Try clicking "Send to Job Hunter" again

## Next Steps

After following these steps, report back:
- What error message you see (if any)
- Whether the service worker shows as "inactive"
- What console logs appear when you click the button
