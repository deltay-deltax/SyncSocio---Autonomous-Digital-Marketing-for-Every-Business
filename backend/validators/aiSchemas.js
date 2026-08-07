import { z } from 'zod';
import { commonSchemas } from './common.js';

export const startAsyncGenerationSchema = z.object({
  endpoint: z.string().min(1, 'Endpoint is required').max(200),
  payload: z.record(z.any()),
}).strict();

export const getAsyncJobStatusParamsSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required').max(100),
});

export const generateStrategySchema = z.object({
  productBrief: z.string().optional(),
  suggestedMix: z.record(z.any()).optional(),
  customInstruction: z.string().max(2000).optional(),
  durationWeeks: z.coerce.number().int().min(1).max(52).optional(),
}).strict();

export const regenerateStrategySchema = z.object({
  productBrief: z.string().optional(),
  rejectedItems: z.array(z.any()).optional(),
}).strict();

export const toggleHeartSchema = z.object({
  postId: z.string().min(1, 'Post ID is required').max(100),
}).strict();

export const deployStrategySchema = z.object({
  durationWeeks: z.coerce.number().int().min(1).max(52).optional(),
  posts: z.array(z.record(z.any())).optional(),
  heartedPostIds: z.array(z.string()).optional(),
}).strict();

export const updateCalendarPostsSchema = z.object({
  posts: z.array(z.record(z.any())),
}).strict();

export const generateAutopilotSchema = z.object({
  language: z.string().max(50).optional(),
  weeks: z.coerce.number().int().min(1).max(52).optional(),
  selectedProductIds: z.array(z.string()).optional(),
  upcomingFestivals: z.array(z.string()).optional(),
}).strict();

export const logClientErrorSchema = z.object({
  provider: z.string().optional(),
  endpoint: z.string().optional(),
  errorMessage: z.string().optional(),
}).strict();

export const scrapeProductSchema = z.object({
  url: commonSchemas.url,
}).strict();

export const planSchema = z.object({
  mix: z.record(z.any()).optional(),
}).strict();

export const captionsSchema = z.object({
  posts: z.array(z.record(z.any())),
}).strict();

export const editProductImageSchema = z.object({
  ref_image: z.string().optional(),
  prod_image: z.string().optional(),
  prod_info: z.string().optional(),
  logo_image: z.string().optional(),
  instruction: z.string().optional(),
  aspectRatio: z.string().optional(),
  isEdit: commonSchemas.booleanStrict.optional(),
}).strict();
