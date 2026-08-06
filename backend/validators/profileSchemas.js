import { z } from 'zod';
import { commonSchemas } from './common.js';

export const createOrUpdateProfileSchema = z.object({
  brandName: z.string().min(1, 'Brand name is required').max(200).optional(),
  businessCategory: z.string().optional(),
  selectedPlan: z.string().optional(),
  brandId: commonSchemas.mongoId.optional(),
  createNewBrand: commonSchemas.booleanStrict.optional(),
}).passthrough(); // allows other fields handled by dynamic logic

export const switchBrandSchema = z.object({
  brandId: commonSchemas.mongoId,
}).strict();

export const requestMetaTesterSchema = z.object({
  igHandle: z.string().min(1, 'IG Handle is required').max(100),
}).strict();

export const lockExcessBrandsSchema = z.object({
  keepBrandIds: z.array(commonSchemas.mongoId).max(8),
}).strict();
