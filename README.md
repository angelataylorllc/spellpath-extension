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
npm run dev          # Start development server with hot reload
npm run build        # Build extension for production
npm run preview      # Preview built extension
```

### Testing the Extension
1. Run `npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/` folder
5. Click the extension icon to test

### Project Structure
```
src/
├── components/      # React components
├── services/        # Business logic and AI integration
├── stories/         # Story templates and content generation
├── stores/          # State management
└── utils/           # Helper functions
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