#!/usr/bin/env node

import 'dotenv/config';
import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import { GeminiService } from './services/geminiService';
import { MCPController } from './controllers/mcpController';
import { validateConfig } from './utils/configValidator';

// Validate environment variables
validateConfig();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3005;

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Initialize Gemini service
const geminiService = new GeminiService();

// Initialize MCP controller
const mcpController = new MCPController(geminiService);

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Register the MCP controller to handle the WebSocket connection
  mcpController.handleConnection(ws);
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start the server
server.listen(port, () => {
  console.log(`MCP server for Gemini API running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
}); 
