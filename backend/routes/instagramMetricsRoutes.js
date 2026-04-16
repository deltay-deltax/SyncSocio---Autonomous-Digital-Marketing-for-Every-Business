import express from 'express';
import axios from 'axios';
import { protect } from '../middleware/authMiddleware.js';
import BrandProfile from '../models/BrandProfile.js';

const router = express.Router();

router.get('/metrics', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const brandProfile = await BrandProfile.findOne({ user: userId });

        if (!brandProfile || !brandProfile.instagramAccessToken || !brandProfile.instagramBusinessAccountId) {
            return res.status(400).json({ 
                message: 'Instagram not connected. Please connect your account in Settings.',
                mock: true,
                data: { impressions: "12.4K", reach: "8.2K", profile_views: "450", followers: "1,540", post_count: "142" }
            });
        }

        const accessToken = brandProfile.instagramAccessToken;
        const igId = brandProfile.instagramBusinessAccountId;

        console.log(`🚀 FETCHING METRICS FOR INSTA ID: ${igId} (v25.0 Path)`);

        // 1. Basic User Info (Follower Count & Profile Detail)
        const userUrl = `https://graph.facebook.com/v25.0/${igId}`;
        const userRes = await axios.get(userUrl, {
            params: { 
                fields: 'followers_count,media_count,username,name,biography', 
                access_token: accessToken 
            }
        });

        // 2. Account-Level Insights (Reach and Views - v25.0 implementation)
        const insightsUrl = `https://graph.facebook.com/v25.0/${igId}/insights`;
        const insightsParams = {
            metric: 'views,reach',
            metric_type: 'total_value',
            period: 'day',
            date_preset: 'last_28_days',
            access_token: accessToken
        };

        let insightsData = [];
        try {
            const insightsRes = await axios.get(insightsUrl, { params: insightsParams });
            insightsData = insightsRes.data.data;
            console.log('--- DEBUG: v25.0 Insights Data ---');
            console.log(JSON.stringify(insightsData, null, 2));
        } catch (e) {
            const insightError = e.response?.data?.error;
            console.warn('IG v25.0 Insights warning:', insightError?.message || e.message);
            if (insightError?.code === 10 || insightError?.code === 190) {
                throw e; 
            }
        }

        // 3. Post Counts (v25.0 Critical Rule: Append &summary=true)
        const mediaUrl = `https://graph.facebook.com/v25.0/${igId}/media`;
        const mediaRes = await axios.get(mediaUrl, {
            params: { 
                summary: 'true', // New v25.0 requirement
                access_token: accessToken 
            }
        });

        const getMetricValue = (name) => {
            const metric = insightsData.find(m => m.name === name);
            if (!metric) return 0;
            
            // v25.0 total_value structure
            if (metric.total_value) return metric.total_value.value || 0;
            
            // Fallback for traditional structure
            if (metric.values && metric.values.length > 0) {
                return metric.values[metric.values.length - 1].value || 0;
            }
            
            return 0;
        };

        res.json({
            message: 'Real-time v25.0 Meta metrics loaded.',
            mock: false,
            data: {
                followers: userRes.data.followers_count || 0,
                reach: getMetricValue('reach'),
                impressions: getMetricValue('views'), // 'views' replaces 'impressions' in many v25 sub-nodes
                profile_views: getMetricValue('profile_views') || 0,
                post_count: mediaRes.data.summary?.total_count || userRes.data.media_count || 0,
                username: userRes.data.username,
                profile_info: {
                    name: userRes.data.name,
                    biography: userRes.data.biography
                }
            }
        });

    } catch (error) {
        const fbError = error.response?.data?.error;
        console.error('v25.0 Meta API Final Error:', fbError?.message || error.message);
        
        if (fbError?.code === 10 || fbError?.code === 190 || fbError?.message?.includes('permission')) {
            return res.status(403).json({ 
                message: 'RECONNECT_REQUIRED: New v25.0 permissions (read_user_content, manage_insights) missing.',
                requiresReconnect: true,
                fbError
            });
        }

        res.status(500).json({ 
            message: fbError?.message || 'Error fetching v25.0 Meta metrics', 
            error: fbError || error.message 
        });
    }
});

router.get('/feed', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const brandProfile = await BrandProfile.findOne({ user: userId });

        if (!brandProfile || !brandProfile.instagramAccessToken || !brandProfile.instagramBusinessAccountId) {
            return res.status(400).json({ message: 'Instagram not connected' });
        }

        const accessToken = brandProfile.instagramAccessToken;
        const igId = brandProfile.instagramBusinessAccountId;

        const mediaUrl = `https://graph.facebook.com/v25.0/${igId}/media`;
        const mediaRes = await axios.get(mediaUrl, {
            params: { 
                fields: 'id,caption,media_type,media_url,timestamp,like_count,comments_count,permalink', 
                access_token: accessToken 
            }
        });

        res.json({
            data: mediaRes.data.data.map(post => ({
                id: post.id,
                type: post.media_type,
                caption: post.caption,
                media_url: post.media_url,
                timestamp: post.timestamp,
                likes: post.like_count,
                comments: post.comments_count,
                permalink: post.permalink
            }))
        });

    } catch (error) {
        console.error('Feed Fetch Error:', error.response?.data || error.message);
        res.status(500).json({ message: 'Error fetching feed' });
    }
});

export default router;
