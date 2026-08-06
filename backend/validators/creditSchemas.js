import { z } from 'zod';
import { commonSchemas } from './common.js';

export const deductionSchema = z.object({
  feature: z.string().min(1, 'Feature is required').max(100),
  cost: commonSchemas.positiveInt,
}).strict();
