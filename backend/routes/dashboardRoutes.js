import express from 'express';
import { 
  getDashboardSummary, 
  getDashboardFeed, 
  getDashboardAnalytics, 
  getDashboardAds, 
  getDashboardNotifications 
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All dashboard routes are protected
router.use(protect);

router.get('/summary', getDashboardSummary);
router.get('/feed', getDashboardFeed);
router.get('/analytics', getDashboardAnalytics);
router.get('/ads', getDashboardAds);
router.get('/notifications', getDashboardNotifications);

export default router;
