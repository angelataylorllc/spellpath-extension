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
npm run api                 # One local API on localhost:4000 (serves both editions)
npm run build:local         # Friend zip → dist-byok/ (localhost)
npm run build:local:consumer  # Store zip → dist-consumer/ (localhost)
npm run build:byok          # Friend zip → dist-byok/ (api.spellpath.app)
npm run build:consumer      # Store zip → dist-consumer/ (api.spellpath.app)
npm run dev                 # Vite only; does not replace loading an unpacked folder in Chrome
```

**Local:** `npm run api`, then both `build:local` and `build:local:consumer`. Load **two** unpacked extensions: `dist-byok` (Friends, Settings + your key) and `dist-consumer` (no Settings; needs `ANTHROPIC_API_KEY` in `.env`). Same allowlist/auth. Rebuild the edition you changed; restart the API only if you changed server files.

**Prod config:** `.env.production` holds `VITE_API_BASE`, `VITE_AUTH_REQUIRED`, and `VITE_GOOGLE_OAUTH_CLIENT_ID` (hostname/auth changes = edit that file + `npm run build`). Do not use `npm run build` against a local API — it will call production and fail if that host is down.

**Google sign-in (friend BYOK):** Google Cloud → OAuth client type **Chrome extension** → add extension ID from `chrome://extensions` → paste client ID into `.env.production` → `npm run build:byok`. Server: `SPELLPATH_AUTH_REQUIRED=true` and `SPELLPATH_ALLOWLIST=email1@...,email2@...`.

**AI providers:** OpenAI, Anthropic (Claude), and Google Gemini. Set platform keys in `.env` and/or choose a provider + paste your key in **Settings** (BYOK). See `docs/ai-billing-and-byok.md`. Day-to-day commands: `cheat-sheet.md`.

### Testing the Extension
1. Run `npm run api`, then `npm run build:local` and `npm run build:local:consumer`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select `dist-byok/` and/or `dist-consumer/` (Reload after later builds)
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