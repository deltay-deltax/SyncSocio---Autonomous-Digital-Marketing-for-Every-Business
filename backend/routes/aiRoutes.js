import express from 'express';
import { generateStrategy, getCalendar, regenerateStrategy, deployStrategy, toggleHeart, updateCalendarPosts, generateAutopilotCampaign, startAsyncGeneration, getAsyncJobStatus } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';
import { generateContentPlan } from '../utils/contentPlanService.js';
import { generateCaptionsAndHashtags } from '../utils/contentCaptionService.js';
import BrandProfile from '../models/BrandProfile.js';
import User from '../models/User.js';
import ApiLog from '../models/ApiLog.js';
import { validate } from '../middleware/validate.js';
import { 
  generateStrategySchema, regenerateStrategySchema, deployStrategySchema, 
  toggleHeartSchema, updateCalendarPostsSchema, generateAutopilotSchema, 
  startAsyncGenerationSchema, getAsyncJobStatusParamsSchema,
  logClientErrorSchema, scrapeProductSchema, planSchema, captionsSchema, editProductImageSchema
} from '../validators/aiSchemas.js';

const router = express.Router();

router.use(protect);

router.post('/generate', validate({ body: generateStrategySchema }), generateStrategy);
router.post('/regenerate', validate({ body: regenerateStrategySchema }), regenerateStrategy);
router.post('/deploy', validate({ body: deployStrategySchema }), deployStrategy);
router.post('/heart', validate({ body: toggleHeartSchema }), toggleHeart);
router.get('/calendar', getCalendar);
router.post('/update-posts', validate({ body: updateCalendarPostsSchema }), updateCalendarPosts);
router.post('/autopilot', validate({ body: generateAutopilotSchema }), generateAutopilotCampaign);
router.post('/start-generation', validate({ body: startAsyncGenerationSchema }), startAsyncGeneration);
router.get('/job/:jobId', validate({ params: getAsyncJobStatusParamsSchema }), getAsyncJobStatus);

router.post('/log-client-error', validate({ body: logClientErrorSchema }), async (req, res) => {
    try {
        const { provider, endpoint, errorMessage } = req.body;
        await ApiLog.create({
            user: req.user._id,
            provider: provider || 'OTHER',
            endpoint: endpoint || 'client-generation',
            isError: true,
            errorMessage: errorMessage || 'Unknown client error',
            costInCents: 0
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

router.post('/scrape-product', validate({ body: scrapeProductSchema }), async (req, res) => {
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
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

router.post('/plan', validate({ body: planSchema }), async (req, res) => {
    try {
        const { mix } = req.body;
        const result = await generateContentPlan(req.user.id, mix);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

router.post('/captions', validate({ body: captionsSchema }), async (req, res) => {
    try {
        const { posts } = req.body;
        const result = await generateCaptionsAndHashtags(req.user.id, posts);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

router.post('/edit-product-image', validate({ body: editProductImageSchema }), async (req, res) => {
    try {
        const { ref_image, prod_image, prod_info, logo_image, instruction, aspectRatio, isEdit } = req.body;
        
        // 1. Check if user has sufficient credits (5 credits required unless it's a free edit)
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const profile = await BrandProfile.findOne({ user: req.user._id }).lean();
        const planName = (profile?.selectedPlan || '').toLowerCase();
        const isPro = planName.includes('pro');
        const creditCost = isEdit ? 0 : (isPro ? 8 : 5);
        
        if ((user.credits ?? 0) < creditCost) {
            return res.status(402).json({ error: `Insufficient credits. AI Editor requires ${creditCost} credits per generation.` });
        }

        // 2. Fetch full brand profile (excluding logo and tokens)
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
                logo_image,
                instruction,
                aspectRatio: aspectRatio || "1:1"
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI Edit failed: ${errorText}`);
        }
        
        const data = await response.json();

        // 4. Deduct credits and update User DB
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $inc: { credits: -creditCost } },
            { new: true }
        );

        // 5. Log activity
        const { logActivity } = await import('../utils/activityLogger.js');
        await logActivity(req.user._id, 'Creative Agent', `Spent ${creditCost} credits on AI Editor ${isEdit ? 'edit' : 'generation'}.`, 'done');

        // 6. Return image and updated credits balance
        res.json({
            image: data.image,
            credits: updatedUser.credits
        });
    } catch (e) {
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});
export default router;
