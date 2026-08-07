import { z } from 'zod';
import { commonSchemas } from './common.js';

export const updateAutomationParamsSchema = z.object({
  type: z.enum(['comment_reply', 'story_mention', 'welcome_message']),
});

export const updateAutomationBodySchema = z.object({
  enabled: commonSchemas.booleanStrict,
  message: z.string().max(1000).optional(),
}).strict();
