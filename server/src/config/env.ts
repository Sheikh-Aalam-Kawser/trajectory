import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file from root or parent directories
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  GEMINI_API_KEY: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  CLIENT_URL: z.string().default('http://localhost:3000'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Environment configuration errors:', parsedEnv.error.format());
}

export const env = parsedEnv.success ? parsedEnv.data : {
  NODE_ENV: process.env.NODE_ENV || 'development',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
};
