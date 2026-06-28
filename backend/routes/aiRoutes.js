import express from 'express';
import { generateStrategy, getCalendar, regenerateStrategy, deployStrategy, toggleHeart, updateCalendarPosts } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';
import { generateContentPlan } from '../utils/contentPlanService.js';
import { generateCaptionsAndHashtags } from '../utils/contentCaptionService.js';
import BrandProfile from '../models/BrandProfile.js';

const router = express.Router();

router.use(protect);

router.post('/generate', generateStrategy);
router.post('/regenerate', regenerateStrategy);
router.post('/deploy', deployStrategy);
router.post('/heart', toggleHeart);
router.get('/calendar', getCalendar);
router.post('/update-posts', updateCalendarPosts);

router.post('/scrape-product', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });
        
        const profile = await BrandProfile.findOne({ user: req.user._id });
        const businessCategory = profile?.businessCategory || '';

        // Dynamic fetch since Node doesn't always have global fetch in older versions, 
        // but this project seems to use axios or fetch in other places. 
        // I will use axios as it is imported elsewhere or standard fetch.
        // Wait, looking at aiRoutes.js, it uses express. Let's use standard fetch (Node 18+).
        const response = await fetch('http://127.0.0.1:8000/scrape-single-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, businessCategory })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI Scrape failed: ${errorText}`);
        }
        
        const data = await response.json();
        res.json(data);
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
