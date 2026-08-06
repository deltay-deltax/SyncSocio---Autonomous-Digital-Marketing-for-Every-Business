import express from 'express';
import {
  createAsset,
  updateAsset,
  listAssets,
  getAssetById,
  getPublicAsset,
  trackAssetClick,
  deleteAsset,
  serveAssetOG,
} from '../controllers/assetController.js';
import { protect } from '../middleware/authMiddleware.js';
import { publicRateLimiter } from '../middleware/rateLimitMiddleware.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import {
  createAssetSchema,
  updateAssetSchema,
  getPublicAssetParamsSchema,
} from '../validators/assetSchemas.js';

const router = express.Router();

// Public routes (no auth)
router.get('/public/:username/:slug', publicRateLimiter, validate({ params: getPublicAssetParamsSchema }), getPublicAsset);
router.get('/og/:username/:slug', publicRateLimiter, validate({ params: getPublicAssetParamsSchema }), serveAssetOG);
router.get('/click/:id', publicRateLimiter, validate({ params: idParamSchema }), trackAssetClick);

// Protected routes (require auth)
router.get('/', protect, listAssets); // optionally add pagination
router.post('/', protect, validate({ body: createAssetSchema }), createAsset);
router.get('/:id', protect, validate({ params: idParamSchema }), getAssetById);
router.put('/:id', protect, validate({ params: idParamSchema, body: updateAssetSchema }), updateAsset);
router.delete('/:id', protect, validate({ params: idParamSchema }), deleteAsset);

export default router;
