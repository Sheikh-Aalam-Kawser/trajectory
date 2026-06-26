import { z } from 'zod';

export const adaptationAgentOutputSchema = z.object({
  replannedMilestones: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      targetDate: z.string(),
      estimatedHours: z.number(),
    })
  ),
  adaptationReason: z.string(),
});
