# Gemini MCP Server

Model Context Protocol (MCP) server implementation that enables Claude Desktop, Cursor to interact with Google's Gemini AI models.

## Features

* Full MCP protocol support for Claude Desktop
* Real-time streaming of Gemini API responses
* Support for various Gemini models (2.5, 2.0, and 1.5 series)
* Secure API key handling via environment variables
* TypeScript implementation for robust, maintainable code

## Quick Start

### Installation

You can run the server directly using npx without installation:

```bash
npx mcp-server-gemini
```

Or install it globally:

```bash
npm install -g mcp-server-gemini
```

### Set up Claude Desktop

1. Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

2. Locate your Claude Desktop config file:
   - Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

3. Add the Gemini configuration to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["-y", "mcp-server-gemini"],
      "env": {
        "GEMINI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

4. Restart Claude Desktop.

5. In Claude Desktop, click on the model dropdown in the top-right corner and select "gemini".

## Advanced Configuration

The MCP server can be configured using environment variables or a `.env` file in the root directory:

- `GEMINI_API_KEY`: Your Google Gemini API key (required)
- `GEMINI_MODEL`: The default model to use (default: `gemini-2.5-pro-exp-03-25`)
- `PORT`: The port to run the server on (default: 3005)

Example `.env` file:

```
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-pro-exp-03-25
PORT=3005
```

## Using with Cursor

To use this MCP server with Cursor:

1. Create or edit the Cursor MCP configuration file:
   - Location: `~/.cursor/mcp.json` (Mac/Linux) or `%USERPROFILE%\.cursor\mcp.json` (Windows)

2. Add the Gemini configuration:
   ```json
   {
     "gemini": {
       "command": "npx",
       "args": ["-y", "mcp-server-gemini"],
       "env": {
         "GEMINI_API_KEY": "your_api_key_here",
         "GEMINI_MODEL": "gemini-2.5-pro-exp-03-25"
       }
     }
   }
   ```

3. Restart Cursor and select "gemini" from the model dropdown in the upper right corner

That's it! Cursor will automatically download and run the MCP server when you select the Gemini model.

## Supported Models

- `gemini-2.5-pro-exp-03-25`: Most capable model with enhanced thinking and reasoning capabilities (default)
- `gemini-2.0-flash`: Newer multimodal model with next generation features
- `gemini-2.0-flash-lite`: Cost-efficient version of 2.0 Flash
- `gemini-1.5-flash`: Fast and versatile model for diverse tasks
- `gemini-1.5-pro`: Powerful model for complex reasoning
- `gemini-pro`: Legacy model
- `gemini-pro-vision`: Vision-capable model (not fully supported in MCP)

## Development

To develop or customize this project:

```bash
# Clone this repository
git clone https://github.com/yourusername/mcp-server-gemini.git
cd mcp-server-gemini

# Install dependencies
npm install

# Start the development server
npm run dev

# Build for production
npm run build
```

## Troubleshooting

### Connection Issues
- Make sure port 3005 is available
- Verify your network connection
- Check your API key is valid and has remaining quota

### Claude Desktop Can't Find the Server
- Make sure you've correctly updated your claude_desktop_config.json
- Restart Claude Desktop after making changes to the config
- Try running the server manually with `npx mcp-server-gemini` to check for errors

## Security

- API keys are handled via environment variables only
- No sensitive data is logged or stored
- We recommend regular updates to keep dependencies secure

## License

MIT
