import express from 'express';
const router = express.Router();
import * as notificationController from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';

router.use(protect);

router.get('/', notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', validate({ params: idParamSchema }), notificationController.markAsRead);
router.delete('/:id', validate({ params: idParamSchema }), notificationController.deleteNotification);

export default router;
