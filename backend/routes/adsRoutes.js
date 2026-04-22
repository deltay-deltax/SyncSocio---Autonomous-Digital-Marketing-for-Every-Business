import express from 'express';
import axios from 'axios';
import { protect } from '../middleware/authMiddleware.js';
import BrandProfile from '../models/BrandProfile.js';

const router = express.Router();

router.get('/recommendations', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const brandProfile = await BrandProfile.findOne({ user: userId });

        if (!brandProfile || !brandProfile.instagramAccessToken || !brandProfile.instagramBusinessAccountId) {
            return res.status(400).json({ message: 'Instagram not connected' });
        }

        // --- CACHE CHECK (3 DAY LOCK) ---
        const now = new Date();
        const lastRun = brandProfile.lastAdsAnalysisAt;
        const diffMs = lastRun ? (now.getTime() - new Date(lastRun).getTime()) : Infinity;
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

        if (diffMs < threeDaysMs && brandProfile.cachedAdsRecommendations?.length > 0) {
            console.log("🎯 Serving CACHED Ad Recommendations (3-day cooldown active)");
            return res.json({
                status: 'success',
                isCached: true,
                nextAnalysisAt: new Date(new Date(lastRun).getTime() + threeDaysMs),
                recommendations: brandProfile.cachedAdsRecommendations
            });
        }

        console.log("🤖 Running FRESH Ad Analysis (3-day window expired or first run)");
        const accessToken = brandProfile.instagramAccessToken;
        const igId = brandProfile.instagramBusinessAccountId;

        // 1. Fetch media from last 7 days
        const mediaUrl = `https://graph.facebook.com/v25.0/${igId}/media`;
        const mediaRes = await axios.get(mediaUrl, {
            params: { 
                fields: 'id,caption,media_type,timestamp,like_count,comments_count',
                limit: 15, 
                access_token: accessToken 
            }
        });

        const posts = mediaRes.data.data || [];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Filter for last 7 days
        const recentPosts = posts.filter(p => new Date(p.timestamp) >= sevenDaysAgo);

        // 2. Fetch insights for each post
        const detailedPosts = await Promise.all(recentPosts.map(async (p) => {
            let reach = 0;
            let saved = 0;
            try {
                const insRes = await axios.get(`https://graph.facebook.com/v25.0/${p.id}/insights`, {
                    params: { metric: 'reach,saved', access_token: accessToken }
                });
                const getInsight = (name) => {
                    const m = insRes.data.data.find(x => x.name === name);
                    return m && m.values && m.values.length > 0 ? m.values[0].value : 0;
                };
                reach = getInsight('reach');
                saved = getInsight('saved');
            } catch (e) {}

            const likes = p.like_count || 0;
            const comments = p.comments_count || 0;
            let engagementRate = 0;
            if (reach > 0) {
                engagementRate = ((likes + comments + saved) / reach) * 100;
            }

            return {
                id: p.id,
                caption: p.caption,
                media_type: p.media_type,
                reach,
                likes,
                comments,
                saved,
                engagementRate: engagementRate.toFixed(2) + "%",
                timestamp: p.timestamp
            };
        }));

        // 3. Call AI Ads Agent
        const aiUrl = process.env.AI_AGENT_URL || 'http://localhost:8000';
        const aiRes = await axios.post(`${aiUrl}/ads-recommendations`, {
            brand_profile: {
                brandName: brandProfile.brandName,
                businessCategory: brandProfile.businessCategory,
                mainGoal: brandProfile.mainGoal,
                usp: brandProfile.usp,
                targetAudience: brandProfile.targetAudiences?.join(', ')
            },
            posts: detailedPosts
        });

        const recommendations = aiRes.data.recommendations || [];

        // 4. Update Cache and Timestamp
        brandProfile.cachedAdsRecommendations = recommendations;
        brandProfile.lastAdsAnalysisAt = now;
        await brandProfile.save();

        res.json({
            status: 'success',
            isCached: false,
            recommendations
        });

    } catch (error) {
        console.error('Ads Recommendations Error:', error.response?.data || error.message);
        res.status(500).json({ message: 'Error generating ad recommendations' });
    }
});

export default router;
