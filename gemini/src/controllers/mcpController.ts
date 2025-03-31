import WebSocket from 'ws';
import { 
  ClientMessage, 
  ClientMessageType, 
  ServerMessage, 
  ServerMessageType 
} from '../models/mcpTypes';
import { GeminiService } from '../services/geminiService';

export class MCPController {
  private geminiService: GeminiService;
  private activeGenerations: Map<string, boolean>;
  
  // Protocol version
  private readonly MCP_VERSION = '1.0';

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
    this.activeGenerations = new Map();
  }

  /**
   * Handle a new WebSocket connection
   */
  public handleConnection(ws: WebSocket): void {
    ws.on('message', async (message: WebSocket.Data) => {
      try {
        // Parse the incoming message
        const clientMessage = JSON.parse(message.toString()) as ClientMessage;
        
        // Process the message based on its type
        await this.handleMessage(clientMessage, ws);
      } catch (error) {
        console.error('Error processing message:', error);
        
        // Send error response
        this.sendMessage(ws, {
          type: ServerMessageType.ERROR,
          error: 'invalid_request',
          message: 'Failed to process message'
        });
      }
    });
  }

  /**
   * Handle a client message
   */
  private async handleMessage(message: ClientMessage, ws: WebSocket): Promise<void> {
    switch (message.type) {
      case ClientMessageType.HELLO:
        await this.handleHello(ws);
        break;
        
      case ClientMessageType.COMPLETIONS:
        await this.handleCompletions(message, ws);
        break;
        
      case ClientMessageType.CANCEL:
        await this.handleCancel(message, ws);
        break;
        
      default:
        this.sendMessage(ws, {
          type: ServerMessageType.ERROR,
          error: 'invalid_request',
          message: `Unknown message type: ${(message as any).type}`
        });
    }
  }

  /**
   * Handle a hello message
   */
  private async handleHello(ws: WebSocket): Promise<void> {
    // Respond with a hello message containing available models
    this.sendMessage(ws, {
      type: ServerMessageType.HELLO,
      version: this.MCP_VERSION,
      models: this.geminiService.getAvailableModels()
    });
  }

  /**
   * Handle a completions request
   */
  private async handleCompletions(message: ClientMessage, ws: WebSocket): Promise<void> {
    if (message.type !== ClientMessageType.COMPLETIONS) return;
    
    const { id, prompt, model, max_tokens, temperature, top_p, top_k, stream, system, stop } = message;
    
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
            type: ServerMessageType.COMPLETION_CHUNK,
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
            type: ServerMessageType.DONE,
            id,
            model: model || this.geminiService.getModelName()
          });
        }
      } else {
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
          type: ServerMessageType.COMPLETION_CHUNK,
          id,
          model: model || this.geminiService.getModelName(),
          completion
        });
        
        // Send done message
        console.log(`[DEBUG] Sending DONE message for ${id}`);
        this.sendMessage(ws, {
          type: ServerMessageType.DONE,
          id,
          model: model || this.geminiService.getModelName()
        });
      }
    } catch (error) {
      console.error('Error generating completion:', error);
      
      // Send error message
      this.sendMessage(ws, {
        type: ServerMessageType.ERROR,
        id,
        error: 'completion_error',
        message: `Error generating completion: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      // Clean up
      this.activeGenerations.delete(id);
    }
  }

  /**
   * Handle a cancel request
   */
  private async handleCancel(message: ClientMessage, ws: WebSocket): Promise<void> {
    if (message.type !== ClientMessageType.CANCEL) return;
    
    const { id } = message;
    
    // Remove the generation ID (will cause the generation loop to exit)
    this.activeGenerations.delete(id);
    
    // Send done message
    this.sendMessage(ws, {
      type: ServerMessageType.DONE,
      id,
      model: this.geminiService.getModelName()
    });
  }

  /**
   * Send a message to the WebSocket client
   */
  private sendMessage(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
} 
