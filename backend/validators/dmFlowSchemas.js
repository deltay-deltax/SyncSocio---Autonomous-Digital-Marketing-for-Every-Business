import { z } from 'zod';
import { commonSchemas } from './common.js';

export const listFlowsSchema = z.object({
  active: z.enum(['true', 'false']).optional(),
  trigger: z.string().optional(),
  targetType: z.string().optional(),
});

export const createFlowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  trigger: z.string().min(1, 'Trigger is required'),
  targetType: z.string().optional(),
  keyword: z.string().optional(),
  messages: z.array(z.record(z.any())).optional(),
}).passthrough(); // Allowing flexible message objects for now

export const setFlowActiveSchema = z.object({
  active: commonSchemas.booleanStrict,
}).strict();

export const matchByKeywordSchema = z.object({
  trigger: z.string().min(1, 'Trigger is required'),
  incomingText: z.string().min(1, 'Incoming text is required').max(1000),
  targetMediaId: z.string().optional(),
}).strict();

export const incrementStatSchema = z.object({
  event: z.enum(['triggered', 'replied', 'clicked', 'conversions']),
  count: commonSchemas.positiveInt.optional(),
}).strict();

export const trackClickSchema = z.object({
  flowId: z.string().min(1, 'Flow ID is required'),
  url: commonSchemas.url,
});
