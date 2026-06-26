import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { AuthenticatedRequest, StandardAPIResponse } from '../types';
import { PlanningAgent } from '../agents/planning';
import { CommitmentRepository } from '../repositories/commitment.repository';
import { logger } from '../logger';

const router = Router();

const createCommitmentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().default(''),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format'),
  priority: z.enum(['high', 'medium', 'low']),
});

// Create a commitment + run PlanningAgent for strategy
router.post(
  '/',
  authenticate as any,
  async (req: AuthenticatedRequest, res: Response<StandardAPIResponse>) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized: User context not found',
        });
        return;
      }

      // 1. Schema Validation
      const parseResult = createCommitmentSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errorCode: 'VALIDATION_ERROR',
          data: parseResult.error.format(),
        });
        return;
      }

      const { title, description, dueDate, priority } = parseResult.data;

      logger.info(`Initiating AI strategy planning for commitment: "${title}" by user ${userId}`);

      // 2. Planning Agent -> Prompt Loader -> Gemini -> Parser
      const agentResponse = await PlanningAgent.run({
        commitment: title,
        dueDate,
        notes: description,
      });

      if (!agentResponse.success || !agentResponse.data) {
        res.status(500).json({
          success: false,
          message: agentResponse.error || 'AI Planning Engine failed to generate execution strategy',
          errorCode: 'AI_PLANNING_FAILED',
        });
        return;
      }

      // 3. Repository -> Firestore Persistence
      const commitment = await CommitmentRepository.create(
        userId,
        title,
        description,
        dueDate,
        priority,
        agentResponse.data
      );

      res.status(201).json({
        success: true,
        message: 'Commitment and execution strategy successfully generated',
        data: commitment,
      });
    } catch (error: any) {
      logger.error('Error creating commitment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during commitment creation',
        errorCode: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
);

// Get currently active commitment
router.get(
  '/active',
  authenticate as any,
  async (req: AuthenticatedRequest, res: Response<StandardAPIResponse>) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized: User context not found',
        });
        return;
      }

      const commitment = await CommitmentRepository.getActive(userId);

      res.json({
        success: true,
        data: commitment,
      });
    } catch (error: any) {
      logger.error('Error fetching active commitment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching active commitment',
        errorCode: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
);

// Get all user commitments
router.get(
  '/',
  authenticate as any,
  async (req: AuthenticatedRequest, res: Response<StandardAPIResponse>) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const commitments = await CommitmentRepository.getAll(userId);

      res.json({
        success: true,
        data: commitments,
      });
    } catch (error: any) {
      logger.error('Error fetching commitments:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errorCode: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
);

export default router;
