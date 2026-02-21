# RepoLens

RepoLens analyzes any public GitHub repository and generates five professional report pages:

- Hub
- Engineering
- Product
- Capability
- Executive

It runs fully client-side using the GitHub public API, with no external AI API dependencies.

## Live Demo

- GitHub Pages app: `https://arvind3.github.io/github-repo-five-lenses/`

## Table of Contents

- Overview
- Features
- User Guide
- Installation (Chrome Extension)
- Local Development
- Testing
- Project Structure
- Privacy and Security
- Limitations
- Contributing
- Support
- License

## Overview

This repository contains two delivery modes of RepoLens:

- Web App (GitHub Pages) in `docs/`
- Chrome Extension (Manifest V3) in `repolens/`

Both modes use the same core analysis engine:

- `fetcher.js`: collects repository metadata/content from GitHub API
- `analyzer.js`: derives architecture, features, personas, and maturity signals
- `generator.js`: produces five standalone HTML report pages

## Features

- Analyze public repositories using URL input (`https://github.com/{owner}/{repo}`)
- Optional context input for domain-aware output:
  - Industry
  - Use cases
  - Business metrics
- Generate five report pages with audience-specific framing
- Live preview of generated HTML pages
- Download current page as `.html`
- Download all pages as `.zip`
- No API keys required
- No external AI model/API calls

## User Guide

### Option A: Use as GitHub Webpage (Recommended for most users)

1. Open: `https://arvind3.github.io/github-repo-five-lenses/`
2. Paste a public GitHub repository URL
3. Optionally expand **Add Context** and fill industry/use-case/metric inputs
4. Click **Generate Report Pages**
5. Wait for progress steps to complete
6. Review generated pages:
   - Use **Preview** in the page list
   - Switch tabs (Hub, Engineering, Product, Capability, Executive)
7. Export output:
   - **Download Current Page**
   - **Download All as ZIP**

### Option B: Use as Chrome Extension

1. Clone/download this repository
2. Open Chrome: `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `repolens/` folder
6. Click the RepoLens extension icon
7. Enter a public GitHub URL and click **Generate Pages**
8. Open generated pages in the viewer or download as ZIP

## Installation (Chrome Extension)

```bash
git clone https://github.com/arvind3/github-repo-five-lenses.git
cd github-repo-five-lenses
```

Then load `repolens/` in `chrome://extensions/` as described above.

## Local Development

### Prerequisites

- Node.js 18+
- npm
- Chromium/Chrome (for Playwright E2E tests)

### Install dependencies

```bash
npm install
```

### Run tests

```bash
npm run test:e2e
```

Web app specific test:

```bash
npm run test:web
```

Run extension tests with explicit browser channel:

```bash
# Chromium (recommended for extension automation)
$env:PW_BROWSER_CHANNEL='chromium'; npx playwright test tests/repolens.critical.spec.js
```

## Testing

The repository includes Playwright tests for:

- Extension critical flows:
  - URL validation
  - End-to-end generation for target repositories
  - Storage verification
  - Viewer rendering
- Web app flow:
  - URL validation
  - End-to-end page generation and preview rendering

Test files:

- `tests/repolens.critical.spec.js`
- `tests/repolens.web.spec.js`

## Project Structure

```text
.
├── docs/                        # GitHub Pages web app
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── engine/
│   └── lib/jszip.min.js
├── repolens/                    # Chrome extension (MV3)
│   ├── manifest.json
│   ├── popup.* / viewer.*
│   ├── background.js
│   ├── engine/
│   ├── icons/
│   └── lib/jszip.min.js
├── tests/                       # Playwright E2E tests
├── playwright.config.js
└── package.json
```

## Privacy and Security

- Calls only GitHub public API endpoints
- Does not send repository data to external AI providers
- Runs analysis in-browser
- Stores generated output locally (`localStorage` for web, `chrome.storage.local` for extension)

## Limitations

- Public repositories only
- Subject to GitHub unauthenticated API rate limits
- Output quality depends on repository documentation quality (README, metadata, structure)

## Contributing

Contributions are welcome.

1. Fork the repo
2. Create a feature branch
3. Add/update tests
4. Open a pull request with a clear description and validation evidence

## Support

- Open issues: `https://github.com/arvind3/github-repo-five-lenses/issues`

## License

No license file is currently included in this repository.  
If you plan to distribute or accept external contributions broadly, add a license (for example MIT/Apache-2.0).
