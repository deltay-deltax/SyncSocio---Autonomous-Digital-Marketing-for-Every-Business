import { z } from 'zod';
import { commonSchemas } from './common.js';

export const createAssetSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().max(5000).optional(),
  heroImageUrl: commonSchemas.url.optional(),
  ctaText: z.string().max(100).optional(),
  ctaUrl: z.string().optional(),
  sections: z.array(z.record(z.any())).optional(),
  linkedFlowId: commonSchemas.mongoId.optional(),
  linkedPostTopic: z.string().optional(),
}).strict();

export const updateAssetSchema = createAssetSchema.partial().extend({
  isPublished: commonSchemas.booleanStrict.optional(),
  ogTitle: z.string().max(200).optional(),
  ogDescription: z.string().max(1000).optional(),
  ogImage: commonSchemas.url.optional(),
}).strict();

export const getPublicAssetParamsSchema = z.object({
  username: z.string().min(1, 'Username is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(200),
});
