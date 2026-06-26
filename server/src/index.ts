import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer as createViteServer } from 'vite';
import { env } from './config/env';
import { logger } from './logger';
import { authenticate } from './middleware/auth.middleware';
import { AuthenticatedRequest, StandardAPIResponse } from './types';
import commitmentRouter from './routes/commitment.routes';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic Middlewares
  app.use(
    helmet({
      contentSecurityPolicy: false, // Prevent issues within local iframe sandboxes
    })
  );
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());

  // Intercept all requests for detailed route tracing, status codes, and Content-Type tracking
  app.use((req: Request, res: Response, next) => {
    const startTime = Date.now();
    logger.info(`[REQ_START] ${req.method} ${req.originalUrl}`);

    const originalSend = res.send;
    res.send = function (body) {
      const contentType = res.get('Content-Type') || '';
      const matchedRoute = req.route ? req.route.path : 'None (No matched route)';
      
      logger.info(
        `[REQ_END] ${req.method} ${req.originalUrl} -> Status: ${res.statusCode} | Content-Type: ${contentType} | Matched Route: ${matchedRoute} | Latency: ${Date.now() - startTime}ms`
      );

      if (contentType.includes('text/html')) {
        logger.warn(`[HTML_RESPONSE_DETECTED] Path: ${req.originalUrl} returned HTML instead of JSON. Status: ${res.statusCode}`);
        const stack = new Error().stack;
        logger.warn(`[HTML_RESPONSE_STACK]:\n${stack}`);
      }

      return originalSend.apply(this, arguments as any);
    };

    const originalJson = res.json;
    res.json = function (body) {
      const contentType = res.get('Content-Type') || 'application/json';
      const matchedRoute = req.route ? req.route.path : 'None (No matched route)';
      
      logger.info(
        `[REQ_END_JSON] ${req.method} ${req.originalUrl} -> Status: ${res.statusCode} | Content-Type: ${contentType} | Matched Route: ${matchedRoute} | Latency: ${Date.now() - startTime}ms`
      );
      
      return originalJson.apply(this, arguments as any);
    };

    next();
  });

  // 1. API Endpoints
  app.post('/api/diagnostics/log', (req: Request, res: Response) => {
    const { logs } = req.body || {};
    if (Array.isArray(logs)) {
      const LOG_FILE = path.join(process.cwd(), 'server.log');
      logs.forEach(log => {
        try {
          fs.appendFileSync(LOG_FILE, `[CLIENT_INSTR] ${log}\n`, 'utf8');
        } catch (e) {}
      });
    }
    res.status(200).send({ success: true });
  });

  app.use('/api/commitments', commitmentRouter);

  app.get('/api/health', (req: Request, res: Response<StandardAPIResponse>) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Protected route example to verify AUTH-001
  app.get(
    '/api/auth/verify',
    authenticate as any,
    (req: AuthenticatedRequest, res: Response<StandardAPIResponse>) => {
      res.json({
        success: true,
        data: {
          user: req.user,
        },
      });
    }
  );

  // 2. Vite Integration Middleware (Single Server)
  if (env.NODE_ENV !== 'production') {
    logger.info('Starting development server with Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.join(process.cwd(), 'client'),
    });
    app.use((req: Request, res: Response, next) => {
      if (req.originalUrl.startsWith('/api')) {
        logger.error(`[API ROUTE MISSED / SPA FALLBACK TRIGGERED] API request fell through: ${req.method} ${req.originalUrl}`);
      } else {
        logger.info(`[SPA FALLBACK TRIGGERED] Vite Dev SPA Fallback for path: ${req.originalUrl}`);
      }
      next();
    });
    app.use(vite.middlewares);
  } else {
    logger.info('Starting production static server...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      if (req.originalUrl.startsWith('/api')) {
        logger.error(`[API ROUTE MISSED / SPA FALLBACK TRIGGERED] API request fell through: ${req.method} ${req.originalUrl}`);
      } else {
        logger.warn(`[SPA FALLBACK TRIGGERED] Production Static SPA Fallback for path: ${req.originalUrl}`);
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Critical error during server boot:', error);
});
