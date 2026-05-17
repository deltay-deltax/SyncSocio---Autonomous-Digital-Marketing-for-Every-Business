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

const router = express.Router();

// Public routes (no auth)
router.get('/public/:username/:slug', getPublicAsset);
router.get('/og/:username/:slug', serveAssetOG);
router.get('/click/:id', trackAssetClick);

// Protected routes (require auth)
router.get('/', protect, listAssets);
router.post('/', protect, createAsset);
router.get('/:id', protect, getAssetById);
router.put('/:id', protect, updateAsset);
router.delete('/:id', protect, deleteAsset);

export default router;
