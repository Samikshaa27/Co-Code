# Co-Code Frontend

This is the frontend application for Co-Code, built with React, Vite, and Monaco Editor.

## Overview

The frontend provides a real-time collaborative coding environment. It connects to the ASP.NET Core backend to manage rooms, synchronize code edits using Yjs over SignalR, and interact with AI coding assistants.

## Key Technologies

- **React 19**
- **Vite**: Fast build tool and dev server.
- **Zustand**: Lightweight global state management.
- **Monaco Editor**: Provides a rich, VS Code-like editing experience.
- **Yjs & y-monaco**: Handles Conflict-Free Replicated Data Types (CRDTs) for seamless multi-user collaboration.
- **SignalR**: Manages WebSocket connections for real-time document synchronization.

## Setup & Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
The app will typically be available at `http://localhost:5173`.

## Environment & Proxy

In development, the Vite server (`vite.config.js`) is configured to proxy API requests (`/api`) and WebSocket connections (`/hubs`) to the backend running at `http://127.0.0.1:5099`. You do not need to configure hardcoded backend URLs for local development.

For production, ensure the backend URL is properly configured based on your hosting environment.
