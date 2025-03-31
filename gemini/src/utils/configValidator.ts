/**
 * Validates that all required environment variables are set
 */
export function validateConfig(): void {
  // Check if API key is provided
  if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY environment variable is required');
    console.error('Please set your Gemini API key in the environment variables');
    console.error('Example usage: GEMINI_API_KEY=your_api_key npx mcp-server-gemini');
    process.exit(1);
  }

  // Check model name (default to gemini-2.5-pro if not specified)
  if (!process.env.GEMINI_MODEL) {
    console.warn('Warning: GEMINI_MODEL not specified, using gemini-2.5-pro-exp-03-25 as default');
    process.env.GEMINI_MODEL = 'gemini-2.5-pro-exp-03-25';
  }

  // Validate model name
  const validModels = [
    'gemini-2.5-pro-exp-03-25',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-pro-vision'
  ];

  if (!validModels.includes(process.env.GEMINI_MODEL)) {
    console.warn(`Warning: Unknown model ${process.env.GEMINI_MODEL}`);
    console.warn(`Valid models are: ${validModels.join(', ')}`);
    console.warn('Continuing with provided model, but it may not work as expected');
  }

  // Log configuration (without API key)
  console.log('Configuration:');
  console.log(`- Model: ${process.env.GEMINI_MODEL}`);
  console.log(`- Port: ${process.env.PORT || 3005}`);
} 
