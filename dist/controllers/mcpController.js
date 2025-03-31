"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPController = void 0;
const ws_1 = __importDefault(require("ws"));
const mcpTypes_1 = require("../models/mcpTypes");
class MCPController {
    constructor(geminiService) {
        // Protocol version
        this.MCP_VERSION = '1.0';
        this.geminiService = geminiService;
        this.activeGenerations = new Map();
    }
    /**
     * Handle a new WebSocket connection
     */
    handleConnection(ws) {
        ws.on('message', async (message) => {
            try {
                // Parse the incoming message
                const clientMessage = JSON.parse(message.toString());
                // Process the message based on its type
                await this.handleMessage(clientMessage, ws);
            }
            catch (error) {
                console.error('Error processing message:', error);
                // Send error response
                this.sendMessage(ws, {
                    type: mcpTypes_1.ServerMessageType.ERROR,
                    error: 'invalid_request',
                    message: 'Failed to process message'
                });
            }
        });
    }
    /**
     * Handle a client message
     */
    async handleMessage(message, ws) {
        switch (message.type) {
            case mcpTypes_1.ClientMessageType.HELLO:
                await this.handleHello(ws);
                break;
            case mcpTypes_1.ClientMessageType.COMPLETIONS:
                await this.handleCompletions(message, ws);
                break;
            case mcpTypes_1.ClientMessageType.CANCEL:
                await this.handleCancel(message, ws);
                break;
            default:
                this.sendMessage(ws, {
                    type: mcpTypes_1.ServerMessageType.ERROR,
                    error: 'invalid_request',
                    message: `Unknown message type: ${message.type}`
                });
        }
    }
    /**
     * Handle a hello message
     */
    async handleHello(ws) {
        // Respond with a hello message containing available models
        this.sendMessage(ws, {
            type: mcpTypes_1.ServerMessageType.HELLO,
            version: this.MCP_VERSION,
            models: this.geminiService.getAvailableModels()
        });
    }
    /**
     * Handle a completions request
     */
    async handleCompletions(message, ws) {
        if (message.type !== mcpTypes_1.ClientMessageType.COMPLETIONS)
            return;
        const { id, prompt, model, max_tokens, temperature, top_p, top_k, stream, system, stop } = message;
        console.log(`[DEBUG] Processing completion request: ${id}`);
        console.log(`[DEBUG] Model: ${model || this.geminiService.getModelName()}`);
        console.log(`[DEBUG] Prompt: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`);
        // Store the generation ID
        this.activeGenerations.set(id, true);
        try {
            // If streaming is requested
            if (stream !== false) {
                console.log(`[DEBUG] Using streaming generation`);
                // Generate a streaming response
                const generator = this.geminiService.generateTextStream(prompt, {
                    maxTokens: max_tokens,
                    temperature: temperature,
                    topP: top_p,
                    topK: top_k,
                    systemPrompt: system,
                    stopSequences: stop
                });
                console.log(`[DEBUG] Stream generator created`);
                // Send chunks as they are generated
                let chunkCount = 0;
                for await (const chunk of generator) {
                    // Check if generation was cancelled
                    if (!this.activeGenerations.get(id)) {
                        console.log(`[DEBUG] Generation cancelled: ${id}`);
                        break;
                    }
                    chunkCount++;
                    console.log(`[DEBUG] Received chunk ${chunkCount}: ${chunk.substring(0, 50)}${chunk.length > 50 ? '...' : ''}`);
                    // Send the chunk
                    this.sendMessage(ws, {
                        type: mcpTypes_1.ServerMessageType.COMPLETION_CHUNK,
                        id,
                        model: model || this.geminiService.getModelName(),
                        completion: chunk
                    });
                }
                console.log(`[DEBUG] Stream complete, sent ${chunkCount} chunks`);
                // Only send DONE if we didn't cancel
                if (this.activeGenerations.get(id)) {
                    // Send done message
                    console.log(`[DEBUG] Sending DONE message for ${id}`);
                    this.sendMessage(ws, {
                        type: mcpTypes_1.ServerMessageType.DONE,
                        id,
                        model: model || this.geminiService.getModelName()
                    });
                }
            }
            else {
                console.log(`[DEBUG] Using non-streaming generation`);
                // Generate a single response
                const completion = await this.geminiService.generateText(prompt, {
                    maxTokens: max_tokens,
                    temperature: temperature,
                    topP: top_p,
                    topK: top_k,
                    systemPrompt: system,
                    stopSequences: stop
                });
                console.log(`[DEBUG] Non-streaming response received: ${completion.substring(0, 50)}${completion.length > 50 ? '...' : ''}`);
                // Check if generation was cancelled
                if (!this.activeGenerations.get(id)) {
                    console.log(`[DEBUG] Generation cancelled: ${id}`);
                    return;
                }
                // Send the chunk
                this.sendMessage(ws, {
                    type: mcpTypes_1.ServerMessageType.COMPLETION_CHUNK,
                    id,
                    model: model || this.geminiService.getModelName(),
                    completion
                });
                // Send done message
                console.log(`[DEBUG] Sending DONE message for ${id}`);
                this.sendMessage(ws, {
                    type: mcpTypes_1.ServerMessageType.DONE,
                    id,
                    model: model || this.geminiService.getModelName()
                });
            }
        }
        catch (error) {
            console.error('Error generating completion:', error);
            // Send error message
            this.sendMessage(ws, {
                type: mcpTypes_1.ServerMessageType.ERROR,
                id,
                error: 'completion_error',
                message: `Error generating completion: ${error instanceof Error ? error.message : String(error)}`
            });
        }
        finally {
            // Clean up
            this.activeGenerations.delete(id);
        }
    }
    /**
     * Handle a cancel request
     */
    async handleCancel(message, ws) {
        if (message.type !== mcpTypes_1.ClientMessageType.CANCEL)
            return;
        const { id } = message;
        // Remove the generation ID (will cause the generation loop to exit)
        this.activeGenerations.delete(id);
        // Send done message
        this.sendMessage(ws, {
            type: mcpTypes_1.ServerMessageType.DONE,
            id,
            model: this.geminiService.getModelName()
        });
    }
    /**
     * Send a message to the WebSocket client
     */
    sendMessage(ws, message) {
        if (ws.readyState === ws_1.default.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
}
exports.MCPController = MCPController;
