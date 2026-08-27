import { z } from 'zod';
import { commonSchemas } from './common.js';

export const updateAutomationParamsSchema = z.object({
  type: z.enum(['storyMention', 'defaultReply']),
});

export const updateAutomationBodySchema = z.object({
  active: commonSchemas.booleanStrict.optional(),
  message: z.string().max(1000).optional(),
}).strict();
