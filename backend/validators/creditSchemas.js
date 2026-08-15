import { z } from 'zod';
import { commonSchemas } from './common.js';

export const deductionSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(100),
  amount: commonSchemas.positiveInt,
}).strict();
