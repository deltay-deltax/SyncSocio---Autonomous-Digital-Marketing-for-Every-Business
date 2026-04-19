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
        
        const range = req.query.range || 'This Week';
        let datePreset = 'last_7_days';
        if (range === 'This Month') datePreset = 'last_28_days';
        if (range === 'All Time') datePreset = 'last_90_days'; // Instagram limits to 90 days usually

        const insightsParams = {
            metric: 'views,reach',
            metric_type: 'total_value',
            period: 'day',
            date_preset: datePreset,
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
            
            // Fallback for traditional array structure: sum the entire requested range!
            if (metric.values && metric.values.length > 0) {
                return metric.values.reduce((total, current) => total + (current.value || 0), 0);
            }
            
            return 0;
        };

        // 4. Online Followers (Best Time to Post Prediction)
        const onlineFollowersUrl = `https://graph.facebook.com/v25.0/${igId}/insights`;
        let hourlyActivity = [];
        let peakHourText = "12 PM"; // fallback
        try {
            const onlineRes = await axios.get(onlineFollowersUrl, {
                params: {
                    metric: 'online_followers',
                    period: 'lifetime',
                    access_token: accessToken
                }
            });
            const metrics = onlineRes.data.data;
            const onlineMetric = metrics.find(m => m.name === 'online_followers');
            
            if (onlineMetric && onlineMetric.values && onlineMetric.values.length > 0) {
               const hours = onlineMetric.values[0].value;
               let maxActive = -1;
               let peakHourIndex = 0;
               
               for (let i = 0; i < 24; i++) {
                 const count = hours[i.toString()] || 0;
                 if (count > maxActive) {
                   maxActive = count;
                   peakHourIndex = i;
                 }
                 hourlyActivity.push({
                   hour: `${i}:00`,
                   active: count,
                   peak: false
                 });
               }
               
               if (hourlyActivity.length > 0) {
                 hourlyActivity[peakHourIndex].peak = true;
                 peakHourText = peakHourIndex === 0 ? "12 AM" : peakHourIndex < 12 ? `${peakHourIndex} AM` : peakHourIndex === 12 ? "12 PM" : `${peakHourIndex - 12} PM`;
               }
            }
        } catch (e) {
            console.warn('Online followers fetch warning:', e.response?.data?.error?.message || e.message);
        }

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
                },
                hourlyActivity,
                peakHourText
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
