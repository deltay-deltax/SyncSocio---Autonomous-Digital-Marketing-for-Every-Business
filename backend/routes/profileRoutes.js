import express from 'express';
import { createOrUpdateProfile, getProfile, terminateAccount, listBrands, switchBrand, requestMetaTester, updateProfile, lockExcessBrands, deleteBrand } from '../controllers/profileController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/me', protect, getProfile);
router.put('/me', protect, updateProfile);
router.get('/list', protect, listBrands);
router.post('/switch', protect, switchBrand);
router.post('/', protect, createOrUpdateProfile);
router.post('/request-meta-tester', protect, requestMetaTester);
router.post('/lock-excess', protect, lockExcessBrands);
router.delete('/brand/:id', protect, deleteBrand);
router.delete('/terminate', protect, terminateAccount);

export default router;
