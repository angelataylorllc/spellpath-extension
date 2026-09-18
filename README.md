# StoryPath Extension

A Chrome browser extension that transforms learning into interactive storytelling adventures, powered by AI to create personalized educational experiences for any subject.

## What It Does

StoryPath creates dynamic, engaging learning journeys where users navigate through AI-generated stories tailored to their chosen topics. Instead of static courses, every learning path is a unique adventure that adapts to the user's interests and learning pace.

## Vision

Transform education from rigid, predefined courses into fluid, story-driven experiences that can cover any subject - from quantum physics to medieval history to advanced programming - all through the power of interactive storytelling and AI-generated content.

## Current Prototype

The current version demonstrates the core storytelling mechanics with a simple JavaScript example, serving as a proof-of-concept for the larger vision of AI-powered, adaptive learning stories.

## Features

- 📚 **Universal Learning**: Works with any subject, not just programming
- 🎭 **Interactive Storytelling**: Navigate through dynamic, branching narratives
- 🤖 **AI-Powered Content**: Generate personalized learning experiences
- 🎯 **Adaptive Learning**: Content that responds to user choices and progress
- ✨ **Immediate Engagement**: Learn through exploration and discovery
- 🎉 **Dynamic Paths**: No two learning experiences are exactly the same

## Development

### Prerequisites
- Node.js (v16 or higher)
- Chrome browser

### Setup
```bash
npm install
```

### Development
```bash
npm run api          # Local SpellPath API on localhost:4000. Copy `.env.example` → `.env`
npm run build:local  # Extension talking to that local API
npm run build        # Production URL (`https://api.spellpath.app` from `.env.production`)
npm run build:byok   # Same as build — prod API + byok edition
npm run dev          # Vite only; does not replace loading `dist/` in Chrome
npm run preview      # Preview built files
```

**Local:** `npm run api` + `npm run build:local`, then reload the unpacked `dist/` extension. Auth and allowlist come from `.env` (`SPELLPATH_AUTH_REQUIRED`, `SPELLPATH_ALLOWLIST`). After UI changes, rebuild with `build:local` and reload Chrome. Restart the API only if you changed server files.

**Prod config:** `.env.production` holds `VITE_API_BASE`, `VITE_AUTH_REQUIRED`, and `VITE_GOOGLE_OAUTH_CLIENT_ID` (hostname/auth changes = edit that file + `npm run build`). Do not use `npm run build` against a local API — it will call production and fail if that host is down.

**Google sign-in (friend BYOK):** Google Cloud → OAuth client type **Chrome extension** → add extension ID from `chrome://extensions` → paste client ID into `.env.production` → `npm run build:byok`. Server: `SPELLPATH_AUTH_REQUIRED=true` and `SPELLPATH_ALLOWLIST=email1@...,email2@...`.

**AI providers:** OpenAI, Anthropic (Claude), and Google Gemini. Set platform keys in `.env` and/or choose a provider + paste your key in **Settings** (BYOK). See `docs/ai-billing-and-byok.md`. Day-to-day commands: `cheat-sheet.md`.

### Testing the Extension
1. Run `npm run api` and `npm run build:local`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/` folder (Reload after later builds)
5. Click the extension icon to test

### Project Structure
```
src/            # Chrome extension UI
server/         # Express API, prompts, LLM adapters
lib/            # Shared helpers (quotes, steer, author cards)
docs/           # Contracts (working session notes stay local)
extension/      # manifest, background, print (PDF)
```

## Future Roadmap

- **AI Integration**: Connect with ChatGPT/OpenAI for dynamic content generation
- **Subject Flexibility**: Support for any academic or skill-based learning
- **Personalization**: Adapt stories based on user's knowledge level and interests
- **Progress Tracking**: Save learning journeys and track improvement
- **Community Features**: Share and discover stories created by other learners

## Contributing

This is an experimental project exploring the future of AI-powered, story-based education. We're building the foundation for a new way to learn - one story at a time.

## License

[Your chosen license]