import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'server.log');

export function writeToLogFile(level: string, message: string, ...meta: any[]) {
  const metaStr = meta.length ? ' ' + meta.map(m => typeof m === 'object' ? JSON.stringify(m) : m).join(' ') : '';
  const logLine = `[${level}] [${new Date().toISOString()}]: ${message}${metaStr}\n`;
  try {
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
  } catch (e) {
    // ignore
  }
}

export const logger = {
  info: (message: string, ...meta: any[]) => {
    console.log(`[INFO] [${new Date().toISOString()}]: ${message}`, ...meta);
    writeToLogFile('INFO', message, ...meta);
  },
  warn: (message: string, ...meta: any[]) => {
    console.warn(`[WARN] [${new Date().toISOString()}]: ${message}`, ...meta);
    writeToLogFile('WARN', message, ...meta);
  },
  error: (message: string, ...meta: any[]) => {
    console.error(`[ERROR] [${new Date().toISOString()}]: ${message}`, ...meta);
    writeToLogFile('ERROR', message, ...meta);
  },
  debug: (message: string, ...meta: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] [${new Date().toISOString()}]: ${message}`, ...meta);
      writeToLogFile('DEBUG', message, ...meta);
    }
  }
};

