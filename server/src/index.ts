import express, { Request, Response } from 'express';
import path from 'path';
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
  const PORT = parseInt(env.PORT, 10) || 3000;

  // Basic Middlewares
  app.use(
    helmet({
      contentSecurityPolicy: false, // Prevent issues within local iframe sandboxes
    })
  );
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());

  // 1. API Endpoints
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
      root: path.join(__dirname, '../../client'),
    });
    app.use(vite.middlewares);
  } else {
    logger.info('Starting production static server...');
    const distPath = path.join(__dirname, '../../dist');
    app.use(express.static(distPath));
    app.get('*all', (req: Request, res: Response) => {
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
