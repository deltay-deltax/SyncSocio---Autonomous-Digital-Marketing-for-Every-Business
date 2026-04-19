import express from 'express';
import { generateStrategy, getCalendar, processVisual } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/generate', generateStrategy);
router.get('/calendar', getCalendar);
router.post('/process-visual', processVisual);

export default router;
