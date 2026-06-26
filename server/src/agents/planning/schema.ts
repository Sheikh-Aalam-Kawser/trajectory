import { z } from 'zod';

export const planningAgentOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  milestones: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      targetDate: z.string(),
      estimatedHours: z.number(),
    })
  ),
});
