import express from 'express';
import { generateStrategy, getCalendar, regenerateStrategy, deployStrategy, toggleHeart, updateCalendarPosts } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';
import { generateContentPlan } from '../utils/contentPlanService.js';
import { generateCaptionsAndHashtags } from '../utils/contentCaptionService.js';
import BrandProfile from '../models/BrandProfile.js';
import User from '../models/User.js';

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
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const response = await fetch(`${aiServiceUrl}/scrape-single-product`, {
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

router.post('/edit-product-image', async (req, res) => {
    try {
        const { ref_image, prod_image, prod_info, instruction, aspectRatio } = req.body;
        
        // 1. Check if user has sufficient credits (5 credits required)
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const creditCost = 5;
        if ((user.credits ?? 0) < creditCost) {
            return res.status(402).json({ error: 'Insufficient credits. AI Editor requires 5 credits per generation.' });
        }

        // 2. Fetch full brand profile (excluding logo and tokens)
        const profile = await BrandProfile.findOne({ user: req.user._id }).lean();
        if (profile) {
            delete profile.logo;
            delete profile.instagramAccessToken;
            delete profile.instagramUserAccessToken;
            delete profile._id;
            delete profile.user;
            delete profile.__v;
        }
        const brand_dna = profile ? JSON.stringify(profile) : "None";

        // 3. Make fetch call to python service
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const response = await fetch(`${aiServiceUrl}/product-image-editor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ref_image, 
                prod_image, 
                prod_info, 
                brand_dna, 
                instruction,
                aspectRatio: aspectRatio || "1:1"
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI Edit failed: ${errorText}`);
        }
        
        const data = await response.json();

        // 4. Deduct 5 credits and update User DB
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $inc: { credits: -creditCost } },
            { new: true }
        );

        // 5. Log activity
        const { logActivity } = await import('../utils/activityLogger.js');
        await logActivity(req.user._id, 'Creative Agent', `Spent 5 credits on AI Editor generation.`, 'done');

        // 6. Return image and updated credits balance
        res.json({
            image: data.image,
            credits: updatedUser.credits
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
export default router;
