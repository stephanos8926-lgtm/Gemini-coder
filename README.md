# GIDE - AI-Powered IDE

GIDE is a full-stack, AI-powered Integrated Development Environment (IDE) designed for modern web development. It integrates directly with the local filesystem, providing real-time code editing, AI-assisted coding, and robust workspace management.

## Key Features

- **Real-Time Filesystem Access**: Direct interaction with the local filesystem for seamless development.
- **AI-Assisted Coding**: Context-aware AI code explanations, refactoring, and bug fixing.
- **Workspace Management**: Easily manage and switch between multiple project workspaces.
- **Global Search**: Powerful global search and replace functionality.
- **Command Palette**: Quick access to commands and navigation (Ctrl+K).
- **Visual Diff**: Git-style visual diff for reviewing AI-suggested changes.
- **Customizable Settings**: Extensive editor and AI configuration options.

## Getting Started

1. **Prerequisites**: Ensure you have Node.js installed.
2. **Installation**: `npm install`
3. **Development**: `npm run dev`
4. **Build**: `npm run build`
5. **Start**: `npm start`

## Architecture

GIDE uses a full-stack architecture with:
- **Frontend**: React, Vite, Tailwind CSS, and Monaco Editor.
- **Backend**: Express.js server for filesystem operations and API proxying.
- **AI**: Integration with Google Gemini models for code assistance.
