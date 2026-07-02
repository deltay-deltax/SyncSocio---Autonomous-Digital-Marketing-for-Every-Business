import express from 'express';
import { createOrUpdateProfile, getProfile, terminateAccount, listBrands, switchBrand, requestMetaTester } from '../controllers/profileController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/me', protect, getProfile);
router.get('/list', protect, listBrands);
router.post('/switch', protect, switchBrand);
router.post('/', protect, createOrUpdateProfile);
router.post('/request-meta-tester', protect, requestMetaTester);
router.delete('/terminate', protect, terminateAccount);

export default router;
