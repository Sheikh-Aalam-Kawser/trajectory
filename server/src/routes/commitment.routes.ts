import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { AuthenticatedRequest, StandardAPIResponse } from '../types';
import { PlanningAgent } from '../agents/planning';
import { CommitmentService } from '../domain/commitment';
import { AdaptationService } from '../domain/adaptation';
import { DriftService } from '../domain/drift';
import { ReflectionService } from '../domain/reflection';
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

      // 3. Domain Orchestrator -> State Generation and Pure Persistence
      const commitment = await CommitmentService.create(
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

      const commitment = await CommitmentService.getActive(userId);

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

      const commitments = await CommitmentService.getAll(userId);

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

// Update status of a specific task within a commitment
router.patch(
  '/:id/tasks/:taskId',
  authenticate as any,
  async (req: AuthenticatedRequest, res: Response<StandardAPIResponse>) => {
    try {
      const userId = req.user?.uid;
      const { id: commitmentId, taskId } = req.params;
      const { status } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized: User context not found',
        });
        return;
      }

      // Schema Validation
      const statusSchema = z.enum(['pending', 'completed', 'skipped', 'in_progress']);
      const parseResult = statusSchema.safeParse(status);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid task status provided',
          errorCode: 'VALIDATION_ERROR',
        });
        return;
      }

      const updatedCommitment = await CommitmentService.updateTaskStatus(
        userId,
        commitmentId,
        taskId,
        parseResult.data
      );

      res.json({
        success: true,
        message: 'Task status updated successfully',
        data: updatedCommitment,
      });
    } catch (error: any) {
      logger.error('Error updating task status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error while updating task',
        errorCode: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
);

// Generate adaptation proposal
router.post(
  '/:id/adaptations/propose',
  authenticate as any,
  async (req: AuthenticatedRequest, res: Response<StandardAPIResponse>) => {
    try {
      const userId = req.user?.uid;
      const { id: commitmentId } = req.params;
      const { userReason } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized: User context not found',
        });
        return;
      }

      logger.info(`Generating adaptation proposal for commitment ${commitmentId}`);
      const proposal = await AdaptationService.generatePlanProposal(userId, commitmentId, userReason);

      res.json({
        success: true,
        data: proposal,
      });
    } catch (error: any) {
      logger.error('Error proposing adaptation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate adaptation plan proposal',
        errorCode: 'ADAPTATION_PROPOSAL_FAILED',
      });
    }
  }
);

// Apply adaptation plan
router.post(
  '/:id/adaptations/apply',
  authenticate as any,
  async (req: AuthenticatedRequest, res: Response<StandardAPIResponse>) => {
    try {
      const userId = req.user?.uid;
      const { id: commitmentId } = req.params;
      const proposal = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      logger.info(`Applying adaptation for commitment ${commitmentId}`);
      const updatedCommitment = await AdaptationService.applyAdaptationPlan(userId, commitmentId, proposal);

      res.json({
        success: true,
        message: 'Adaptation applied successfully',
        data: updatedCommitment,
      });
    } catch (error: any) {
      logger.error('Error applying adaptation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to apply adaptation plan',
        errorCode: 'ADAPTATION_APPLICATION_FAILED',
      });
    }
  }
);

// Get historical adaptations
router.get(
  '/:id/adaptations',
  authenticate as any,
  async (req: AuthenticatedRequest, res: Response<StandardAPIResponse>) => {
    try {
      const userId = req.user?.uid;
      const { id: commitmentId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const adaptations = await AdaptationService.getAdaptationsForCommitment(userId, commitmentId);

      res.json({
        success: true,
        data: adaptations,
      });
    } catch (error: any) {
      logger.error('Error fetching adaptations:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch historical adaptations',
        errorCode: 'ADAPTATION_FETCH_FAILED',
      });
    }
  }
);

// Get commitment drift assessment (DRIFT-001)
router.get(
  '/:id/drift',
  authenticate as any,
  async (req: AuthenticatedRequest, res: Response<StandardAPIResponse>) => {
    try {
      const userId = req.user?.uid;
      const { id: commitmentId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized: User context not found',
        });
        return;
      }

      const driftAssessment = await DriftService.assessDrift(userId, commitmentId);

      res.json({
        success: true,
        data: driftAssessment,
      });
    } catch (error: any) {
      logger.error('Error assessing commitment drift:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to assess commitment drift',
        errorCode: 'DRIFT_ASSESSMENT_FAILED',
      });
    }
  }
);

// Get or create commitment reflection (REFLECT-001)
router.get(
  '/:id/reflection',
  authenticate as any,
  async (req: AuthenticatedRequest, res: Response<StandardAPIResponse>) => {
    try {
      const userId = req.user?.uid;
      const { id: commitmentId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized: User context not found',
        });
        return;
      }

      const reflection = await ReflectionService.getOrCreateReflection(userId, commitmentId);

      res.json({
        success: true,
        data: reflection,
      });
    } catch (error: any) {
      logger.error('Error fetching or creating reflection:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch reflection report',
        errorCode: 'REFLECTION_GET_FAILED',
      });
    }
  }
);

// Explicitly generate a new immutable reflection (REFLECT-001)
router.post(
  '/:id/reflection',
  authenticate as any,
  async (req: AuthenticatedRequest, res: Response<StandardAPIResponse>) => {
    try {
      const userId = req.user?.uid;
      const { id: commitmentId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized: User context not found',
        });
        return;
      }

      const reflection = await ReflectionService.generateAndSaveReflection(userId, commitmentId);

      res.json({
        success: true,
        message: 'Reflection report generated successfully',
        data: reflection,
      });
    } catch (error: any) {
      logger.error('Error generating reflection:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate reflection report',
        errorCode: 'REFLECTION_GENERATE_FAILED',
      });
    }
  }
);

// Get reflection history for commitment (REFLECT-001)
router.get(
  '/:id/reflection/history',
  authenticate as any,
  async (req: AuthenticatedRequest, res: Response<StandardAPIResponse>) => {
    try {
      const userId = req.user?.uid;
      const { id: commitmentId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const history = await ReflectionService.getReflectionHistory(userId, commitmentId);

      res.json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      logger.error('Error fetching reflection history:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch reflection history',
        errorCode: 'REFLECTION_HISTORY_FAILED',
      });
    }
  }
);

export default router;
