import { z } from 'zod';
import { commonSchemas } from './common.js';

export const validatePostSchema = z.object({
  contentType: z.string().min(1, 'Content type is required').max(50),
  description: z.string().min(1, 'Description is required').max(5000),
}).strict();

export const schedulePostSchema = z.object({
  scheduledAt: z.string().datetime().optional(), // ISO string
  platforms: z.record(commonSchemas.booleanStrict).optional(),
}).strict();

export const directPublishSchema = z.object({
  contentType: z.string().min(1).max(50),
  description: z.string().min(1).max(5000),
  platforms: z.record(commonSchemas.booleanStrict).optional(),
  scheduledAt: z.string().datetime().optional(),
}).strict();

export const recommendScheduleSchema = z.object({
  postIds: z.array(commonSchemas.mongoId),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  platforms: z.record(commonSchemas.booleanStrict).optional(),
}).strict();

export const smartScheduleSchema = z.object({
  postIds: z.array(commonSchemas.mongoId),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  platforms: z.record(commonSchemas.booleanStrict).optional(),
  schedules: z.array(z.object({
    postId: commonSchemas.mongoId,
    scheduledAt: z.string().datetime(),
    platforms: z.record(commonSchemas.booleanStrict),
  })).optional(),
}).strict();
