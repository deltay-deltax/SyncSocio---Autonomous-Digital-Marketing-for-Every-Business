import express from 'express';
import { generateStrategy, getCalendar } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/generate', generateStrategy);
router.get('/calendar', getCalendar);
export default router;
