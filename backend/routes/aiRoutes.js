import express from 'express';
import { generateStrategy, getCalendar } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';
import { generateContentMix } from '../utils/contentMixAgentService.js';
import { generateContentPlan } from '../utils/contentPlanService.js';
import { generateCaptionsAndHashtags } from '../utils/contentCaptionService.js';

const router = express.Router();

router.use(protect);

router.post('/generate', generateStrategy);
router.get('/calendar', getCalendar);

router.post('/mix', async (req, res) => {
    try {
        const result = await generateContentMix(req.user.id);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/plan', async (req, res) => {
    try {
        const { mix } = req.body;
        const result = await generateContentPlan(req.user.id, mix);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/captions', async (req, res) => {
    try {
        const { posts } = req.body;
        const result = await generateCaptionsAndHashtags(req.user.id, posts);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
