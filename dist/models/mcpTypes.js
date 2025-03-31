"use strict";
/**
 * Types for Model Context Protocol (MCP)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerMessageType = exports.ClientMessageType = void 0;
// Message types from client to server
var ClientMessageType;
(function (ClientMessageType) {
    ClientMessageType["HELLO"] = "hello";
    ClientMessageType["COMPLETIONS"] = "completions";
    ClientMessageType["CANCEL"] = "cancel";
})(ClientMessageType || (exports.ClientMessageType = ClientMessageType = {}));
// Message types from server to client
var ServerMessageType;
(function (ServerMessageType) {
    ServerMessageType["HELLO"] = "hello";
    ServerMessageType["COMPLETION_CHUNK"] = "completion_chunk";
    ServerMessageType["DONE"] = "done";
    ServerMessageType["ERROR"] = "error";
})(ServerMessageType || (exports.ServerMessageType = ServerMessageType = {}));
