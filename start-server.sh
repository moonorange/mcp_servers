#!/bin/bash

# This script starts the MCP server for testing purposes
# It will read the API key from .env file

# Check if .env file exists
if [ -f .env ]; then
  echo "Loading environment variables from .env file"
  export $(grep -v '^#' .env | xargs)
else
  echo ".env file not found."
fi

# Check if GEMINI_API_KEY is set
if [ -z "$GEMINI_API_KEY" ]; then
  echo "Error: GEMINI_API_KEY is not set."
  echo "Please set it in your .env file or export it as an environment variable."
  exit 1
fi


# Print start message
echo "Starting MCP server for Gemini API..."
echo "Default model: ${GEMINI_MODEL:-gemini-2.5-pro-exp-03-25}"
echo "Port: ${PORT:-3005}"
echo 

# Run with debugging enabled
DEBUG=mcp:* node dist/index.js 
