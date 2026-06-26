import { z } from 'zod';

export const userRegistrationSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
});
