import { GeminiService } from '../src/services/geminiService';

// Mock the GoogleGenerativeAI module
jest.mock('@google/generative-ai', () => {
  // Create a mock implementation
  const mockGenerateContent = jest.fn();
  const mockGenerateContentStream = jest.fn();
  const mockSendMessage = jest.fn();
  const mockSendMessageStream = jest.fn();
  
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockImplementation(() => ({
        generateContent: mockGenerateContent,
        generateContentStream: mockGenerateContentStream,
        startChat: jest.fn().mockImplementation(() => ({
          sendMessage: mockSendMessage,
          sendMessageStream: mockSendMessageStream
        }))
      }))
    })),
    // Mock implementation functions for testing
    __mockGenerateContent: mockGenerateContent,
    __mockGenerateContentStream: mockGenerateContentStream,
    __mockSendMessage: mockSendMessage,
    __mockSendMessageStream: mockSendMessageStream
  };
});

// Get the mocked functions
const mockedModule = jest.requireMock('@google/generative-ai');

describe('GeminiService', () => {
  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    
    // Set up required env vars for testing
    process.env.GEMINI_API_KEY = 'test-api-key';
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  describe('constructor', () => {
    it('should initialize with default model if not specified', () => {
      const service = new GeminiService();
      expect(service.getModelName()).toBe('gemini-2.5-pro-exp-03-25');
    });
    
    it('should use the model specified in environment variables', () => {
      process.env.GEMINI_MODEL = 'gemini-2.0-flash';
      const service = new GeminiService();
      expect(service.getModelName()).toBe('gemini-2.0-flash');
    });
  });
  
  describe('getAvailableModels', () => {
    it('should return a list of available models', () => {
      const service = new GeminiService();
      const models = service.getAvailableModels();
      
      expect(models).toEqual(expect.arrayContaining([
        'gemini-2.5-pro-exp-03-25',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro',
        'gemini-pro-vision'
      ]));
    });
  });
  
  describe('generateText', () => {
    it('should call the Gemini API with the correct parameters', async () => {
      // Setup mock response
      mockedModule.__mockGenerateContent.mockResolvedValue({
        response: { text: () => 'This is a test response' }
      });
      
      const service = new GeminiService();
      
      const result = await service.generateText('Test prompt', {
        maxTokens: 100,
        temperature: 0.7
      });
      
      expect(result).toBe('This is a test response');
      expect(mockedModule.__mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: 'Test prompt' }] }],
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.7
        }
      });
    });
    
    it('should use system prompt if provided', async () => {
      // Setup mock response
      mockedModule.__mockSendMessage.mockResolvedValue({
        response: { text: () => 'This is a test response with system prompt' }
      });
      
      const service = new GeminiService();
      
      const result = await service.generateText('Test prompt', {
        systemPrompt: 'You are a helpful assistant',
        temperature: 0.7
      });
      
      expect(result).toBe('This is a test response with system prompt');
      expect(mockedModule.__mockSendMessage).toHaveBeenCalledWith('Test prompt');
    });
  });
}); 
