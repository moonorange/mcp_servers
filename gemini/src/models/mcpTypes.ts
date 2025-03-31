/**
 * Types for Model Context Protocol (MCP)
 */

// Message types from client to server
export enum ClientMessageType {
  HELLO = 'hello',
  COMPLETIONS = 'completions',
  CANCEL = 'cancel'
}

// Message types from server to client
export enum ServerMessageType {
  HELLO = 'hello',
  COMPLETION_CHUNK = 'completion_chunk',
  DONE = 'done',
  ERROR = 'error'
}

// Hello message from client
export interface ClientHelloMessage {
  type: ClientMessageType.HELLO;
  version: string;
}

// Completion request message from client
export interface ClientCompletionsMessage {
  type: ClientMessageType.COMPLETIONS;
  id: string;
  model: string;
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
  system?: string;
  stop?: string[];
}

// Cancel message from client
export interface ClientCancelMessage {
  type: ClientMessageType.CANCEL;
  id: string;
}

// Union type for all client messages
export type ClientMessage = ClientHelloMessage | ClientCompletionsMessage | ClientCancelMessage;

// Hello response message from server
export interface ServerHelloMessage {
  type: ServerMessageType.HELLO;
  version: string;
  models: string[];
}

// Completion chunk message from server
export interface ServerCompletionChunkMessage {
  type: ServerMessageType.COMPLETION_CHUNK;
  id: string;
  model: string;
  completion: string;
}

// Done message from server
export interface ServerDoneMessage {
  type: ServerMessageType.DONE;
  id: string;
  model: string;
}

// Error message from server
export interface ServerErrorMessage {
  type: ServerMessageType.ERROR;
  id?: string;
  error: string;
  message: string;
}

// Union type for all server messages
export type ServerMessage = 
  | ServerHelloMessage 
  | ServerCompletionChunkMessage 
  | ServerDoneMessage 
  | ServerErrorMessage; 
