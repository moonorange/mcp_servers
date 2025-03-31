#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const ws_1 = __importDefault(require("ws"));
const geminiService_1 = require("./services/geminiService");
const mcpController_1 = require("./controllers/mcpController");
const configValidator_1 = require("./utils/configValidator");
// Validate environment variables
(0, configValidator_1.validateConfig)();
// Initialize Express app
const app = (0, express_1.default)();
const port = process.env.PORT || 3005;
// Create HTTP server
const server = http_1.default.createServer(app);
// Create WebSocket server
const wss = new ws_1.default.Server({ server });
// Initialize Gemini service
const geminiService = new geminiService_1.GeminiService();
// Initialize MCP controller
const mcpController = new mcpController_1.MCPController(geminiService);
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
    console.log('Waiting for Claude Desktop to connect...');
});
// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close(() => {
        console.log('Server shut down');
        process.exit(0);
    });
});
