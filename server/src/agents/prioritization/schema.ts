import { z } from 'zod';

export const prioritizationAgentOutputSchema = z.object({
  prioritizedMilestoneIds: z.array(z.string()),
  reasoning: z.string(),
});
