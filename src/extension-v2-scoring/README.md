# Job Filter - Chrome Extension

A Chrome extension that captures job listings from LinkedIn and Indeed, sending them directly to your Airtable Jobs Pipeline.

## Features

- **One-Click Capture**: Click "Send to Job Filter" on any LinkedIn or Indeed job page
- **Auto-Extraction**: Automatically extracts job title, company, location, salary, and full description
- **Airtable Integration**: Creates records in your Jobs Pipeline with Status = "Captured"
- **Error Handling**: Automatic retry on network failures with clear error messages

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `/src/extension/` folder from this repository
5. The extension icon should appear in your Chrome toolbar

## Configuration

Before using the extension, you need to configure your Airtable credentials:

1. Click the extension icon in Chrome toolbar
2. Enter your **Airtable Base ID**
   - Find this in your Airtable base URL: `airtable.com/appXXXXXXXXXXXXXX/...`
   - It starts with `app`
3. Enter your **Airtable Personal Access Token**
   - Create one at [airtable.com/create/tokens](https://airtable.com/create/tokens)
   - Required scopes: `data.records:read`, `data.records:write`
   - It starts with `pat`
4. Click **Save Settings**
5. Click **Test Connection** to verify your credentials work

## Usage

1. Navigate to a job listing on LinkedIn or Indeed
2. Look for the blue **"Send to Job Filter"** button in the bottom-right corner
3. Click the button to capture the job
4. A success message appears when the job is saved to Airtable

## Supported Sites

| Site | Job Page Detection | Data Extraction |
|------|-------------------|-----------------|
| LinkedIn | `/jobs/view/*` and `/jobs/*` with `currentJobId` | Full support |
| Indeed | `/viewjob*` and `/jobs*` | Basic support |

## Data Fields Captured

The extension captures and sends these fields to Airtable:

| Field | Description | Required |
|-------|-------------|----------|
| Job Title | Role title | Yes |
| Company Name | Company name | Yes |
| Job URL | Link to original posting | Yes |
| Location | Job location/remote status | No |
| Salary Min | Minimum salary (if shown) | No |
| Salary Max | Maximum salary (if shown) | No |
| Source | "LinkedIn" or "Indeed" | Yes |
| Job Description | Full job posting text | Yes |
| Status | Always set to "Captured" | Yes |

## Troubleshooting

### Extension doesn't show on job pages

- Refresh the page after installing the extension
- Check that you're on a job detail page (not search results)
- Open Chrome DevTools (F12) and check the Console for errors

### "Please configure Airtable settings" error

- Click the extension icon and enter your Base ID and PAT
- Make sure to click "Save Settings"

### "Invalid API token" error

- Verify your PAT is correct and hasn't expired
- Ensure the token has `data.records:read` and `data.records:write` scopes

### "Table not found" error

- Ensure your Airtable base has a table named exactly `Jobs Pipeline`
- Check that the Base ID matches your Job Filter base

### Job data is incomplete

- LinkedIn and Indeed occasionally change their page structure
- The extension uses multiple fallback selectors
- Check the Console for `[Job Filter]` log messages

## Development

### File Structure

```
src/extension/
├── manifest.json    # Extension configuration (Manifest V3)
├── popup.html       # Settings popup UI
├── popup.js         # Settings logic (save/load/test)
├── popup.css        # Popup styling
├── content.js       # Job page detection & data extraction
├── background.js    # Airtable API communication
└── README.md        # This file
```

### Adding Icons (Optional)

To add custom icons:

1. Create `icons/` folder in the extension directory
2. Add PNG icons: `icon16.png`, `icon48.png`, `icon128.png`
3. Uncomment the `icons` section in `manifest.json`

### Testing Changes

1. Make your code changes
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Job Filter extension
4. Test on a LinkedIn or Indeed job page

## Security Notes

- Your Airtable credentials are stored locally in Chrome's encrypted storage
- No data is sent to any third-party servers
- All API requests go directly to Airtable's official API

## Version History

- **1.0.0** - Initial release with LinkedIn and Indeed support
