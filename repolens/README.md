# RepoLens

Analyze any public GitHub repository. Generate five professional awareness pages instantly. No API key, no AI service, no per-use cost.

## What It Does

RepoLens is a Manifest V3 Chrome extension that fetches a public GitHub repository through the GitHub REST API, runs a local analysis engine, and generates five HTML pages:

- Hub: Entry point for all visitors
- Engineering: Technical architecture and stack deep dive
- Product: End-user perspective and value proposition
- Capability: Cross-domain and business strategy view
- Executive: Leadership summary with key metrics

## Installation

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable Developer Mode (top-right toggle).
4. Click **Load unpacked**.
5. Select the `repolens/` folder.
6. Pin the RepoLens extension icon.

## How To Use

1. Click the RepoLens extension icon.
2. Paste a public GitHub URL in the format `https://github.com/owner/repo`.
3. Optionally add context (industry, use cases, and metrics).
4. Click **Generate Pages**.
5. Open individual pages in the viewer or download all pages as a ZIP archive.

## Privacy

- No API keys required.
- No data sent to external AI services.
- Only GitHub public API requests are made.
- Analysis and page generation happen locally in the extension.
- Generated pages are stored in `chrome.storage.local`.

## Limitations

- Public repositories only.
- GitHub anonymous rate limit applies (typically 60 requests/hour per IP).
- Output quality depends on repository documentation quality.

## Tech Stack

Vanilla JavaScript, Chrome Extension Manifest V3, GitHub REST API, JSZip.
