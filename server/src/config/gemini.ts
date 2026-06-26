import { GoogleGenAI } from '@google/genai';
import { env } from './env';
import { logger } from '../logger';

let aiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('GEMINI_API_KEY is missing. Gemini API calls will fail.');
      aiInstance = new GoogleGenAI({ apiKey: '' });
    } else {
      aiInstance = new GoogleGenAI({ apiKey });
      logger.info('Google GenAI client initialized successfully with standard model gemini-2.0-flash.');
    }
  }
  return aiInstance;
}

export const STANDARD_GEMINI_MODEL = 'gemini-2.0-flash';
export const STANDARD_GEMINI_VERSION = 'v1.0';
