import { GoogleGenAI, Type } from '@google/genai';
import { env } from './env';
import { logger } from '../logger';

export { Type };

// Documented default fallback model if GEMINI_MODEL env variable is missing.
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
export const STANDARD_GEMINI_VERSION = 'v1.1';

/**
 * Resolves the configured Gemini model identifier, falling back to the documented default.
 */
export function getActiveModel(): string {
  return env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

// Retain STANDARD_GEMINI_MODEL for backward compatibility, referencing getActiveModel()
export const STANDARD_GEMINI_MODEL = getActiveModel();

let aiInstance: GoogleGenAI | null = null;

/**
 * Initialize and retrieve the single global instance of the GoogleGenAI client.
 * Sets the 'User-Agent' to 'aistudio-build' as required for telemetry and metadata.
 */
export function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('[Gemini SDK] GEMINI_API_KEY is missing. Calls to live Gemini will fail.');
      aiInstance = new GoogleGenAI({
        apiKey: '',
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } else {
      aiInstance = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      logger.info(`[Gemini SDK] Google GenAI client initialized once with User-Agent and active model: ${getActiveModel()}`);
    }
  }
  return aiInstance;
}

// Custom error classes for strict, reliable error translation
export class GeminiAPIError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'GeminiAPIError';
  }
}

export class GeminiRateLimitError extends GeminiAPIError {
  constructor(message: string) {
    super(message, 429);
    this.name = 'GeminiRateLimitError';
  }
}

export class GeminiTimeoutError extends GeminiAPIError {
  constructor(message: string) {
    super(message, 408);
    this.name = 'GeminiTimeoutError';
  }
}

/**
 * Translates SDK error messages into explicit, clean internal application error types.
 */
function translateError(error: any): Error {
  const msg = error.message || String(error);
  if (/timeout/i.test(msg)) {
    return new GeminiTimeoutError(`Gemini operation timed out: ${msg}`);
  }
  if (/rate|quota|limit|429|exhausted|RESOURCE_EXHAUSTED/i.test(msg)) {
    return new GeminiRateLimitError(`Gemini API Quota or Rate Limit exceeded. Please retry later or provide a paid key: ${msg}`);
  }
  return new GeminiAPIError(`Gemini Live Inference Error: ${msg}`);
}

/**
 * Wraps a promise to reject if it exceeds the specified timeout duration.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new GeminiTimeoutError(errorMessage));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Executes a function with exponential backoff retries for specific transient or rate-limited errors.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 1000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const msg = error.message || String(error);
      const isRateLimit = /rate|quota|limit|429|exhausted|RESOURCE_EXHAUSTED/i.test(msg);
      const isTransient = /temp|500|503|504|unavailable|overloaded|internal/i.test(msg);

      if (attempt <= maxRetries && (isRateLimit || isTransient)) {
        const backoffDelay = initialDelayMs * Math.pow(2, attempt - 1);
        logger.warn(`[Gemini SDK] Request failed (attempt ${attempt}/${maxRetries}): ${msg}. Retrying in ${backoffDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      } else {
        throw error;
      }
    }
  }
}

export interface GeminiStructuredRequestOptions {
  contents: string;
  systemInstruction?: string;
  responseSchema?: any;
  timeoutMs?: number;
  promptVersion: string;
}

/**
 * Centralized Gemini Client Wrapper.
 * The rest of the application must use this service rather than calling the GoogleGenAI SDK directly.
 */
export class GeminiService {
  /**
   * Safe, centralized generation method that returns raw structured content (usually JSON),
   * after applying timeout, retry policies, logging, and translation of errors.
   */
  static async generateStructuredText(options: GeminiStructuredRequestOptions): Promise<string> {
    const model = getActiveModel();
    const timeoutMs = options.timeoutMs || 30000; // 30s default timeout
    const startTime = Date.now();
    let attemptCount = 0;

    logger.info(`[GeminiService] Initiating structured text generation. Model: ${model}, Prompt Version: ${options.promptVersion}`);

    const executeCall = async () => {
      attemptCount++;
      const client = getGeminiClient();
      return await client.models.generateContent({
        model,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: options.responseSchema,
        },
      });
    };

    try {
      const response = await retryWithBackoff(
        () => withTimeout(
          executeCall(),
          timeoutMs,
          `Gemini API request to model ${model} timed out after ${timeoutMs}ms`
        ),
        3,
        1000
      );

      const latency = Date.now() - startTime;
      
      // DIAGNOSTIC LOGGING REQUIRED BY INVESTIGATION TASKS
      logger.info('=== [Gemini Diagnostic Logging - SDK Response] ===');
      let responseStr = '';
      try {
        responseStr = JSON.stringify(response, (key, value) => {
          if (key === 'apiKey' || key === 'key' || key === 'auth' || key === 'requestHeaders') {
            return '[REDACTED]';
          }
          return value;
        }, 2);
      } catch (err: any) {
        responseStr = `[Serialization failed: ${err.message}]`;
      }
      logger.info(`[Gemini Diagnostics] SDK Response Object (Sanitized):\n${responseStr}`);

      // Log exact field currently being parsed
      logger.info('[Gemini Diagnostics] Fields present in SDK response:');
      logger.info(`- typeof response.text: ${typeof response.text}`);
      logger.info(`- response.text: ${typeof response.text === 'string' ? 'String' : 'Not a string'}`);
      logger.info(`- response.candidates present: ${response.candidates ? 'Yes' : 'No'}`);
      if (response.candidates && response.candidates[0]) {
        const candidate = response.candidates[0];
        logger.info(`- candidate.content present: ${candidate.content ? 'Yes' : 'No'}`);
        if (candidate.content && candidate.content.parts) {
          logger.info(`- parts array length: ${candidate.content.parts.length}`);
          candidate.content.parts.forEach((p: any, idx: number) => {
            logger.info(`  - part[${idx}] keys: ${Object.keys(p).join(', ')}`);
          });
        }
      }

      const textOutput = response.text;

      // Log the extracted string exactly as received (Do NOT truncate, with exact delimiters)
      logger.info(`========== RAW MODEL OUTPUT START ==========\n${textOutput || ''}\n========== RAW MODEL OUTPUT END ============`);

      if (!textOutput) {
        throw new GeminiAPIError('Received empty response text from Gemini');
      }

      // Capture model usage metadata (input_tokens, output_tokens, total_tokens) whenever the SDK exposes it.
      const usage = response.usageMetadata || {};
      const input_tokens = usage.promptTokenCount ?? (usage as any).prompt_token_count ?? (usage as any).input_tokens;
      const output_tokens = usage.candidatesTokenCount ?? (usage as any).candidates_token_count ?? (usage as any).output_tokens;
      const total_tokens = usage.totalTokenCount ?? (usage as any).total_token_count ?? (usage as any).total_tokens;

      if (input_tokens !== undefined || output_tokens !== undefined || total_tokens !== undefined) {
        logger.info(`[Gemini Telemetry] Token usage metrics: input_tokens=${input_tokens ?? 'N/A'}, output_tokens=${output_tokens ?? 'N/A'}, total_tokens=${total_tokens ?? 'N/A'}`);
      } else {
        logger.info(`[Gemini Telemetry] Token usage metrics unavailable for this request.`);
      }

      // Every AI request should include structured logging
      logger.info(`[Gemini Request Lifecycle] Completed`, {
        prompt_version: options.promptVersion,
        model,
        latency,
        retries: attemptCount - 1,
        success: true
      });

      return textOutput;
    } catch (error: any) {
      const latency = Date.now() - startTime;
      const appError = translateError(error);

      logger.error(`[Gemini Request Lifecycle] Failed`, {
        prompt_version: options.promptVersion,
        model,
        latency,
        retries: attemptCount - 1,
        success: false,
        error: appError.message
      });

      throw appError;
    }
  }
}
