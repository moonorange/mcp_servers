"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const https_1 = __importDefault(require("https"));
class GeminiService {
    constructor() {
        // Get API key from environment
        this.apiKey = process.env.GEMINI_API_KEY;
        // Get model name from environment or use default
        this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-pro-exp-03-25';
        // Initialize the Google Generative AI client
        this.genAI = new generative_ai_1.GoogleGenerativeAI(this.apiKey);
        // Get the model
        this.model = this.genAI.getGenerativeModel({ model: this.modelName });
    }
    /**
     * Get a list of available models
     */
    getAvailableModels() {
        return [
            'gemini-2.5-pro-exp-03-25',
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-pro',
            'gemini-pro-vision'
        ];
    }
    /**
     * Generate text from a prompt with streaming
     */
    async *generateTextStream(prompt, options) {
        try {
            // Configure generation parameters
            const generationConfig = {
                maxOutputTokens: options.maxTokens,
                temperature: options.temperature,
                topP: options.topP,
                topK: options.topK,
                stopSequences: options.stopSequences
            };
            // Clean up undefined values
            Object.keys(generationConfig).forEach(key => {
                if (generationConfig[key] === undefined) {
                    delete generationConfig[key];
                }
            });
            console.log(`[DEBUG-API] Generating text stream with model: ${this.modelName}`);
            console.log(`[DEBUG-API] Prompt: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`);
            console.log(`[DEBUG-API] Generation config:`, JSON.stringify(generationConfig));
            // For 2.5 models, use direct REST API call which seems more reliable
            if (this.modelName.includes('2.5')) {
                console.log(`[DEBUG-API] Using direct REST API call for model ${this.modelName}`);
                // If system prompt is provided, prepend it to the user prompt
                if (options.systemPrompt) {
                    console.log(`[DEBUG-API] System prompt provided. Prepending to user prompt.`);
                    prompt = `${options.systemPrompt}\n\n${prompt}`;
                }
                console.log(`[DEBUG-API] Starting direct API request (this may take 15-30 seconds)`);
                // Create request data in the format that worked with curl
                const requestData = JSON.stringify({
                    contents: [{
                            parts: [{ text: prompt }]
                        }],
                    generationConfig
                });
                // Make the API request
                const response = await this.makeApiRequest(requestData);
                if (response) {
                    console.log(`[DEBUG-API] Received response from direct API call`);
                    yield response;
                    return;
                }
                else {
                    console.log(`[DEBUG-API] No response from direct API call. Falling back to SDK.`);
                }
            }
            // Track if we received any chunks
            let receivedChunks = false;
            // Check if system prompt is provided and model supports it
            if (options.systemPrompt && !this.modelName.includes('2.5')) {
                console.log(`[DEBUG-API] Using system prompt with model ${this.modelName}`);
                const chat = this.model.startChat({
                    generationConfig,
                    systemInstruction: options.systemPrompt,
                });
                const result = await chat.sendMessageStream(prompt);
                for await (const chunk of result.stream) {
                    const text = chunk.text();
                    if (text) {
                        receivedChunks = true;
                        console.log(`[DEBUG-API] Received text chunk: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
                        yield text;
                    }
                }
            }
            else {
                // If model is 2.5 or no system prompt, use direct content generation
                if (options.systemPrompt) {
                    console.log(`[DEBUG-API] System prompt provided but not supported for model ${this.modelName}. Using direct content generation.`);
                    // Prepend system prompt to user prompt for 2.5 models
                    prompt = `${options.systemPrompt}\n\n${prompt}`;
                }
                else {
                    console.log(`[DEBUG-API] No system prompt provided, using direct content generation`);
                }
                // Single prompt generation
                console.log(`[DEBUG-API] Starting content stream generation using SDK`);
                const result = await this.model.generateContentStream({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig,
                });
                console.log(`[DEBUG-API] Stream created, waiting for chunks...`);
                for await (const chunk of result.stream) {
                    const text = chunk.text();
                    if (text) {
                        receivedChunks = true;
                        console.log(`[DEBUG-API] Received text chunk: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
                        yield text;
                    }
                }
            }
            // If no chunks were received, provide a fallback message
            if (!receivedChunks) {
                console.log(`[DEBUG-API] No text chunks were received from the API. This might be due to content filtering or API issues.`);
                const fallbackMessage = "I'm sorry, but I couldn't generate a response. This might be due to content restrictions or API limitations.";
                yield fallbackMessage;
            }
        }
        catch (error) {
            console.error('[DEBUG-API] Error generating text stream:', error);
            throw error;
        }
    }
    /**
     * Make a direct API request to Gemini
     */
    makeApiRequest(requestData) {
        // Options for the HTTP request
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': requestData.length
            }
        };
        return new Promise((resolve, reject) => {
            const req = https_1.default.request(options, (res) => {
                let data = '';
                // Event handler for when data is received
                res.on('data', (chunk) => {
                    data += chunk;
                });
                // Event handler for when the response is complete
                res.on('end', () => {
                    console.log(`[DEBUG-API] Response status code: ${res.statusCode}`);
                    if (res.statusCode === 200) {
                        try {
                            const jsonResponse = JSON.parse(data);
                            // Extract the text from the response
                            if (jsonResponse.candidates &&
                                jsonResponse.candidates[0] &&
                                jsonResponse.candidates[0].content &&
                                jsonResponse.candidates[0].content.parts &&
                                jsonResponse.candidates[0].content.parts[0].text) {
                                const responseText = jsonResponse.candidates[0].content.parts[0].text;
                                console.log(`[DEBUG-API] Extracted response text (${responseText.length} chars)`);
                                resolve(responseText);
                            }
                            else {
                                console.log('[DEBUG-API] No text found in the response');
                                console.log(JSON.stringify(jsonResponse, null, 2));
                                resolve(null);
                            }
                        }
                        catch (error) {
                            console.error('[DEBUG-API] Error parsing response:', error);
                            console.log('[DEBUG-API] Raw response:', data);
                            reject(error);
                        }
                    }
                    else {
                        console.error(`[DEBUG-API] Error: ${res.statusCode}`);
                        console.error('[DEBUG-API] Response:', data);
                        reject(new Error(`HTTP error! status: ${res.statusCode}`));
                    }
                });
            });
            // Event handler for request errors
            req.on('error', (error) => {
                console.error('[DEBUG-API] Request error:', error);
                reject(error);
            });
            // Send the request
            req.write(requestData);
            req.end();
        });
    }
    /**
     * Generate text from a prompt (non-streaming)
     */
    async generateText(prompt, options) {
        try {
            // Configure generation parameters
            const generationConfig = {
                maxOutputTokens: options.maxTokens,
                temperature: options.temperature,
                topP: options.topP,
                topK: options.topK,
                stopSequences: options.stopSequences
            };
            // Clean up undefined values
            Object.keys(generationConfig).forEach(key => {
                if (generationConfig[key] === undefined) {
                    delete generationConfig[key];
                }
            });
            console.log(`[DEBUG-API] Generating text with model: ${this.modelName}`);
            console.log(`[DEBUG-API] Prompt: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`);
            // For 2.5 models, use direct REST API call which seems more reliable
            if (this.modelName.includes('2.5')) {
                console.log(`[DEBUG-API] Using direct REST API call for model ${this.modelName}`);
                // If system prompt is provided, prepend it to the user prompt
                if (options.systemPrompt) {
                    console.log(`[DEBUG-API] System prompt provided. Prepending to user prompt.`);
                    prompt = `${options.systemPrompt}\n\n${prompt}`;
                }
                console.log(`[DEBUG-API] Starting direct API request (this may take 15-30 seconds)`);
                // Create request data in the format that worked with curl
                const requestData = JSON.stringify({
                    contents: [{
                            parts: [{ text: prompt }]
                        }],
                    generationConfig
                });
                // Make the API request
                const response = await this.makeApiRequest(requestData);
                if (response) {
                    return response;
                }
                else {
                    console.log(`[DEBUG-API] No response from direct API call. Falling back to SDK.`);
                }
            }
            // Check if system prompt is provided and model supports it
            if (options.systemPrompt && !this.modelName.includes('2.5')) {
                console.log(`[DEBUG-API] Using system prompt with model ${this.modelName}`);
                const chat = this.model.startChat({
                    generationConfig,
                    systemInstruction: options.systemPrompt,
                });
                const result = await chat.sendMessage(prompt);
                return result.response.text();
            }
            else {
                // If model is 2.5 or no system prompt, use direct content generation
                if (options.systemPrompt) {
                    console.log(`[DEBUG-API] System prompt provided but not supported for model ${this.modelName}. Using direct content generation.`);
                    // Prepend system prompt to user prompt for 2.5 models
                    prompt = `${options.systemPrompt}\n\n${prompt}`;
                }
                console.log(`[DEBUG-API] Generating content using SDK (this may take 15-30 seconds)`);
                // Single prompt generation
                const result = await this.model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig,
                });
                return result.response.text();
            }
        }
        catch (error) {
            console.error('[DEBUG-API] Error generating text:', error);
            throw error;
        }
    }
    /**
     * Get the current model name
     */
    getModelName() {
        return this.modelName;
    }
}
exports.GeminiService = GeminiService;
