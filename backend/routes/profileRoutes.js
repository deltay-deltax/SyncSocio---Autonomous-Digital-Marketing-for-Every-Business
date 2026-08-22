import express from 'express';
import { createOrUpdateProfile, getProfile, terminateAccount, listBrands, switchBrand, requestMetaTester, updateProfile, lockExcessBrands, deleteBrand, autoScanBg } from '../controllers/profileController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import { createOrUpdateProfileSchema, switchBrandSchema, requestMetaTesterSchema, lockExcessBrandsSchema } from '../validators/profileSchemas.js';

const router = express.Router();

router.get('/me', protect, getProfile);
router.put('/me', protect, updateProfile); // This allows flexible update, validated in Mongoose
router.get('/list', protect, listBrands);
router.post('/switch', protect, validate({ body: switchBrandSchema }), switchBrand);
router.post('/auto-scan-bg', protect, autoScanBg);
router.post('/', protect, validate({ body: createOrUpdateProfileSchema }), createOrUpdateProfile);
router.post('/request-meta-tester', protect, validate({ body: requestMetaTesterSchema }), requestMetaTester);
router.post('/lock-excess', protect, validate({ body: lockExcessBrandsSchema }), lockExcessBrands);
router.delete('/brand/:id', protect, validate({ params: idParamSchema }), deleteBrand);
router.delete('/terminate', protect, terminateAccount);

export default router;
