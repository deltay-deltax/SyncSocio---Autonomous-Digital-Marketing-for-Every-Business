import express from 'express';
import { createOrUpdateProfile, getProfile, terminateAccount } from '../controllers/profileController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/me', protect, getProfile);
router.post('/', protect, createOrUpdateProfile);
router.delete('/terminate', protect, terminateAccount);

export default router;
