# Co-Code

Co-Code is a real-time collaborative code editor that supports live multi-user editing with integrated AI assistance.

## Overview

Co-Code enables developers to collaborate on code in real-time. Users can create shared rooms, edit code simultaneously without conflicts, and access AI-powered code assistance directly within the editor.

## Key Features

- **Real-Time Collaborative Editing**: Multiple users can edit the same document simultaneously with conflict resolution.
- **AI Code Assistance**: Integrated AI features (via Groq/OpenAI) for code generation, explanation, or optimization.
- **Room Management**: Create temporary collaborative sessions with automatic cleanup.
- **Syntax Highlighting**: Powered by Monaco Editor for a VS Code-like experience.

## Technology Stack

**Frontend**:
- React 19
- Vite
- Zustand (State Management)
- Monaco Editor (`@monaco-editor/react`)
- Yjs & y-monaco (CRDTs for real-time collaboration)
- SignalR Client (`@microsoft/signalr`)

**Backend**:
- ASP.NET Core Web API (C#)
- SignalR (Real-time WebSocket communication)
- Entity Framework Core
- SQLite (Local development) / PostgreSQL (Production fallback configured)
- JWT Authentication

## Architecture

1. **Frontend (React)**: Handles the UI, connects to the backend via REST (for initial load/auth) and SignalR (for real-time events).
2. **Backend (ASP.NET Core)**: Manages rooms, users, and broadcasts document changes via SignalR.
3. **Collaboration Engine (Yjs)**: Operates on the frontend to manage concurrent edits. The backend simply acts as a SignalR message broker to broadcast Yjs update buffers between connected clients.
4. **AI Integration**: The frontend requests AI assistance via the backend REST API, which securely calls the external AI provider (Groq or OpenAI) using server-side API keys.

## Real-Time Collaboration

Co-Code uses **Yjs**, a Conflict-Free Replicated Data Type (CRDT) implementation, to ensure all users see a consistent state without locking the document. When a user types in the Monaco Editor, Yjs captures the change as an update array. This update is sent over **SignalR** (WebSockets) to the backend `CollabHub`, which broadcasts the binary payload to all other clients in the same room. The receiving clients apply the update to their local Yjs document, which instantly reflects in their editor.

## AI Functionality

The application integrates AI capabilities to help developers write and understand code. The frontend sends prompts (and optionally context) to the `AiController` on the backend. The backend `AiService` constructs the appropriate prompt and communicates securely with the configured AI provider.

## Authentication & Security

The backend secures sensitive endpoints (like room creation and AI services) using **JSON Web Tokens (JWT)**.
- In production, a secure JWT key must be injected via environment variables.
- The SignalR hub also validates JWTs for WebSocket connections by reading the `access_token` query parameter.

## Getting Started

### Prerequisites
- Node.js (v18+)
- .NET 8 SDK
- SQLite (or PostgreSQL)

### Backend Setup
1. Navigate to the API directory:
   ```bash
   cd CodeCollab.API
   ```
2. Configure your environment (see *Environment Variables*).
3. Run the application:
   ```bash
   dotnet run
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

### Backend (`CodeCollab.API`)
Create a `.env` file or set these in your environment / `appsettings.json`:
- `Jwt:Key` - Your secure JWT signing key (Required in production)
- `Groq:ApiKey` OR `OpenAI:ApiKey` - API key for AI features (Required)
- `DatabaseProvider` - "Sqlite" or "Postgres" (Default: Sqlite)
- `ConnectionStrings:DefaultConnection` - Database connection string

## Deployment

The repository includes deployment configurations:
- **Backend**: A `Dockerfile` and `fly.toml` for containerized deployment (e.g., on Fly.io).
- **Frontend**: A `vercel.json` for serverless deployment on Vercel.

## Future Improvements

- Add automated unit tests for core backend services.
- Implement user persistence and saved documents.
- Add support for multiple files per room.
