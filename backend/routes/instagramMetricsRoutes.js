import express from 'express';
import axios from 'axios';
import { protect } from '../middleware/authMiddleware.js';
import BrandProfile from '../models/BrandProfile.js';
import PostAnalysis from '../models/PostAnalysis.js';
import { performStrategicAudit } from '../utils/auditAgentService.js';

const router = express.Router();

router.get('/metrics', protect, async (req, res) => {
    let brandProfile;
    try {
        const userId = req.user.id;
        brandProfile = await BrandProfile.findOne({ user: userId, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: userId });

        if (!brandProfile || !brandProfile.instagramAccessToken || !brandProfile.instagramBusinessAccountId) {
            return res.status(400).json({ 
                message: 'Instagram not connected. Please connect your account in Settings.',
                mock: true,
                data: { impressions: "0", reach: "0", profile_views: "0", followers: "0", post_count: "0" }
            });
        }

        const accessToken = brandProfile.instagramAccessToken;
        const igId = brandProfile.instagramBusinessAccountId;
        console.log(`🚀 FETCHING METRICS FOR INSTA ID: ${igId} (v25.0 Path)`);

        const mediaUrl = `https://graph.facebook.com/v25.0/${igId}/media`;
        const insightsUrl = `https://graph.facebook.com/v25.0/${igId}/insights`;

        const userStats = brandProfile.cachedMetrics?.userStats || {};
        const currentFollowersCount = userStats.followers_count || 0;
        const todaySnapStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (brandProfile) {
            if (!brandProfile.followerHistory) brandProfile.followerHistory = [];
            const lastEntry = brandProfile.followerHistory[brandProfile.followerHistory.length - 1];
            if (!lastEntry || lastEntry.date !== todaySnapStr || lastEntry.count !== currentFollowersCount) {
                brandProfile.followerHistory.push({ date: todaySnapStr, count: currentFollowersCount });
                if (brandProfile.followerHistory.length > 60) brandProfile.followerHistory.shift();
                await brandProfile.save();
            }
        }

        // Calculate historical follower change percentage (SyncSocio detection)
        let followersChange = 'Live';
        if (brandProfile.followerHistory && brandProfile.followerHistory.length > 1) {
            const history = brandProfile.followerHistory;
            const current = currentFollowersCount;
            // Find the most recent entry that has a DIFFERENT count to detect immediate volatility
            let lastDifferent = null;
            for (let i = history.length - 2; i >= 0; i--) {
                if (history[i].count !== current) {
                    lastDifferent = history[i].count;
                    break;
                }
            }
            
            const baseline = lastDifferent !== null ? lastDifferent : history[0].count;
            if (baseline > 0) {
                const diff = current - baseline;
                const pct = (diff / baseline) * 100;
                followersChange = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
            }
        }

        // 2. Account-Level Insights
        let insightsData = brandProfile.cachedMetrics?.currentInsightsData || [];
        let prevInsightsData = brandProfile.cachedMetrics?.prevInsightsData || [];

        // 3. Post Counts
        const posts = brandProfile.cachedMedia || [];
        let postBreakdown = [];
        const formatTimeAgo = (timestamp) => {
            const diff = Date.now() - new Date(timestamp).getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor(diff / (1000 * 60 * 60));
            if (days > 0) return `${days}d ago`;
            if (hours > 0) return `${hours}h ago`;
            return 'Just now';
        };

        if (posts.length > 0) {
            postBreakdown = await Promise.all(posts.slice(0, 5).map(async (p) => {
                let reach = 0;
                let saved = 0;
                
                const insData = p.insightsData || [];
                const getInsight = (name) => {
                    const m = insData.find(x => x.name === name);
                    return m && m.values && m.values.length > 0 ? m.values[0].value : 0;
                };
                reach = getInsight('reach');
                saved = getInsight('saved');
                
                const likes = p.like_count || 0;
                const comments = p.comments_count || 0;
                let engagement = "0.0%";
                if (reach > 0) {
                    engagement = (((likes + comments + saved) / reach) * 100).toFixed(1) + "%";
                }
                
                let reachStr = reach.toString();
                if (reach >= 1000) reachStr = (reach / 1000).toFixed(1) + "K";
                
                let type = "Static";
                if (p.media_type === "VIDEO") type = "Reel";
                if (p.media_type === "CAROUSEL_ALBUM") type = "Carousel";

                // Check if this post was assisted by our Agent
                const assistedEntry = await PostAnalysis.findOne({ instagramMediaId: p.id });
                const isAssisted = !!assistedEntry;

                return {
                    post: p.caption ? p.caption.substring(0, 25) + '...' : 'Untitled Post',
                    type,
                    reach: reachStr,
                    likes,
                    engagement,
                    posted: formatTimeAgo(p.timestamp),
                    isAgentAssisted: isAssisted
                };
            }));
        }

        const getMetricValue = (dataArr, name) => {
            const metric = dataArr.find(m => m.name === name);
            if (!metric) return 0;
            if (metric.total_value) return metric.total_value.value || 0;
            if (metric.values && metric.values.length > 0) {
                return metric.values.reduce((total, current) => total + (current.value || 0), 0);
            }
            return 0;
        };

        const currentReach = getMetricValue(insightsData, 'reach');
        const prevReach = getMetricValue(prevInsightsData, 'reach');
        const currentViews = getMetricValue(insightsData, 'views');
        const prevViews = getMetricValue(prevInsightsData, 'views');
        
        const calcChange = (curr, prev) => {
            if (curr === 0 && prev === 0) return 'Live';
            if (prev === 0) return '+100%';
            const pct = ((curr - prev) / prev) * 100;
            const sign = pct > 0 ? '+' : '';
            return `${sign}${pct.toFixed(1)}%`;
        };

        let totalLikes = 0;
        let totalReachFromPosts = 0;
        if (postBreakdown.length > 0) {
           postBreakdown.forEach(p => {
               totalLikes += p.likes;
               let r = parseFloat(p.reach.replace('K', ''));
               if (p.reach.includes('K')) r = r * 1000;
               totalReachFromPosts += r;
           });
        }
        let engagementRate = '0.0%';
        if (totalReachFromPosts > 0) {
           engagementRate = ((totalLikes / totalReachFromPosts) * 100).toFixed(1) + '%';
        }

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
        }        // Trigger background audit if they have posts and either have no learnings yet or the last audit was > 24 hours ago
        const lastAudit = brandProfile.lastStrategicAudit || new Date(0);
        const hoursSince = (Date.now() - new Date(lastAudit).getTime()) / (1000 * 60 * 60);

        if (posts.length >= 3 && (!brandProfile.agentLearnings || brandProfile.agentLearnings.length === 0 || hoursSince >= 24)) {
            if (brandProfile.neuralState !== 'Running Audit') {
                brandProfile.neuralState = 'Running Audit';
                await BrandProfile.updateOne({ _id: brandProfile._id }, { $set: { neuralState: 'Running Audit' } });
                performStrategicAudit(userId, brandProfile).catch(err => {
                    console.error('[METRICS] Background strategic audit failed:', err);
                });
            }
        }

        res.json({
            message: 'Real-time v25.0 Meta metrics loaded.',
            mock: false,
            data: {
                followers: currentFollowersCount,
                followersChange: followersChange,
                reach: currentReach,
                reachChange: calcChange(currentReach, prevReach),
                impressions: currentViews, 
                impressionsChange: calcChange(currentViews, prevViews),
                engagementRate: engagementRate,
                engagementRateChange: 'Live', // Needs historical post processing
                profile_views: getMetricValue(insightsData, 'profile_views') || 0,
                post_count: userStats.media_count || 0,
                username: userStats.username || '',
                profile_info: {
                    name: userStats.name || '',
                    biography: userStats.biography || ''
                },
                hourlyActivity,
                peakHourText,
                postBreakdown,
                weeklyGrowth: await (async () => {
                    try {
                        // Fetch posts from last 30 days to attribute reach
                        const postsRes = await axios.get(mediaUrl, {
                            params: { 
                                fields: 'id,timestamp',
                                limit: 30,
                                access_token: accessToken 
                            }
                        });
                        const posts = postsRes.data.data || [];
                        const assistedPosts = await PostAnalysis.find({ userId: userId, isAgentAssisted: true, instagramMediaId: { $exists: true } });
                        const assistedIds = new Set(assistedPosts.map(ap => ap.instagramMediaId));

                        // For each post, fetch its reach (this is slow but needed for accurate attribution)
                        const postsWithReach = await Promise.all(posts.map(async (p) => {
                            try {
                                const insRes = await axios.get(`https://graph.facebook.com/v25.0/${p.id}/insights`, {
                                    params: { metric: 'reach', access_token: accessToken }
                                });
                                const reachVal = insRes.data.data.find(x => x.name === 'reach')?.values[0]?.value || 0;
                                return {
                                    timestamp: new Date(p.timestamp),
                                    reach: reachVal,
                                    isAgent: assistedIds.has(p.id)
                                };
                            } catch (e) { return null; }
                        }));
                        const validPosts = postsWithReach.filter(p => p !== null);

                        const weeks = [];
                        const now = new Date();
                        for (let i = 0; i < 4; i++) {
                            const weekEnd = new Date(now.getTime() - (i * 7 * 86400 * 1000));
                            const weekStart = new Date(weekEnd.getTime() - (7 * 86400 * 1000));
                            
                            const weekPosts = validPosts.filter(p => p.timestamp >= weekStart && p.timestamp < weekEnd);
                            
                            const agentPostsInWeek = weekPosts.filter(p => p.isAgent);
                            const selfPostsInWeek = weekPosts.filter(p => !p.isAgent);

                            const agentReachSum = agentPostsInWeek.reduce((sum, p) => sum + p.reach, 0);
                            const selfReachSum = selfPostsInWeek.reduce((sum, p) => sum + p.reach, 0);
                            
                            weeks.push({
                                week: `W${4-i}`,
                                // Use Average for better comparison on chart
                                selfReach: selfPostsInWeek.length > 0 ? Math.round(selfReachSum / selfPostsInWeek.length) : 0,
                                agentReach: agentPostsInWeek.length > 0 ? Math.round(agentReachSum / agentPostsInWeek.length) : 0,
                                totalReach: weekPosts.length > 0 ? Math.round((agentReachSum + selfReachSum) / weekPosts.length) : 0
                            });
                        }

                        // Also calculate global averages for summary
                        const agentPosts = validPosts.filter(p => p.isAgent);
                        const selfPosts = validPosts.filter(p => !p.isAgent);
                        
                        const avgAgentReach = agentPosts.length > 0 ? Math.round(agentPosts.reduce((sum, p) => sum + p.reach, 0) / agentPosts.length) : 0;
                        const avgSelfReach = selfPosts.length > 0 ? Math.round(selfPosts.reduce((sum, p) => sum + p.reach, 0) / selfPosts.length) : 0;

                        return {
                            history: weeks.reverse(),
                            avgAgentReach,
                            avgSelfReach
                        };
                    } catch (e) {
                        console.error("❌ [ANALYTICS] Weekly Reach Growth Fetch Error:", e.response?.data?.error || e.message);
                        return {
                            history: Array.from({ length: 4 }, (_, i) => ({
                                week: `W${4-i}`,
                                selfReach: 0,
                                agentReach: 0,
                                totalReach: 0
                            })).reverse(),
                            avgAgentReach: 0,
                            avgSelfReach: 0
                        };
                    }
                })(),
                // --- REAL DATA: 30-Day Follower Growth (Chart 3) ---
                followerGrowth: await (async () => {
                    const currentFollowers = currentFollowersCount;
                    try {
                        const folParams = {
                            metric: 'follower_count',
                            period: 'day',
                            since: Math.floor((Date.now() - (30 * 86400 * 1000)) / 1000),
                            until: Math.floor(Date.now() / 1000),
                            access_token: accessToken
                        };
                        const folRes = await axios.get(insightsUrl, { params: folParams });
                        const dailyNetChange = folRes.data.data.find(m => m.name === 'follower_count')?.values || [];
                        
                        if (dailyNetChange.length === 0) {
                            console.log(`⚠️ [ANALYTICS] Meta ROI: Account < 100 followers. Using local tracking for snapshot: ${currentFollowers}`);
                            const days = [];
                            const historyMap = {};
                            
                            // Sort history chronologically to find the true baseline
                            const sortedHistory = [...brandProfile.followerHistory].sort((a,b) => new Date(a.date) - new Date(b.date));
                            const absoluteOldest = (brandProfile.followerHistory && brandProfile.followerHistory.length > 0) ? brandProfile.followerHistory[0].count : currentFollowers;

                            if (brandProfile.followerHistory) {
                                brandProfile.followerHistory.forEach(h => historyMap[h.date] = h.count);
                            }

                            let rollingCount = currentFollowers;
                            for (let i = 0; i <= 30; i++) {
                                const d = new Date();
                                d.setDate(d.getDate() - i);
                                const dStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                
                                if (historyMap[dStr] !== undefined) {
                                    rollingCount = historyMap[dStr];
                                } else if (i > 0) {
                                    // If no record for a PAST day, back-fill with the oldest known snapshot
                                    // This creates the 'Growth' visuals users expect even with sparse data
                                    rollingCount = absoluteOldest;
                                }
                                days.push({ date: dStr, count: rollingCount });
                            }
                            return days.reverse();
                        }

                        // Reconstruct total counts from daily changes (Standard Meta ROI path)
                        let runningTotal = currentFollowers;
                        const days = [];
                        const sortedReversed = [...dailyNetChange].reverse();
                        for (let i = 0; i < sortedReversed.length; i++) {
                            const dateObj = new Date(sortedReversed[i].end_time);
                            days.push({
                                date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                                count: runningTotal
                            });
                            runningTotal -= (sortedReversed[i].value || 0);
                        }
                        return days.reverse();
                    } catch (e) { return []; }
                })(),
                newFollowersCount: await (async () => {
                   try {
                       const folParams = {
                           metric: 'follower_count',
                           period: 'day',
                           since: Math.floor((Date.now() - (30 * 86400 * 1000)) / 1000),
                           until: Math.floor(Date.now() / 1000),
                           access_token: accessToken
                       };
                       const folRes = await axios.get(insightsUrl, { params: folParams });
                       const dailyNetChange = folRes.data.data.find(m => m.name === 'follower_count')?.values || [];
                       
                       if (dailyNetChange.length === 0 && brandProfile.followerHistory && brandProfile.followerHistory.length > 0) {
                           // Calculate net growth across recorded history
                           const now = currentFollowersCount;
                           const sorted = [...brandProfile.followerHistory].sort((a,b) => new Date(a.date) - new Date(b.date));
                           const oldest = sorted[0].count;
                           return (now - oldest);
                       }
                       return dailyNetChange.reduce((sum, d) => sum + (d.value || 0), 0);
                   } catch (e) { return 0; }
                })(),
                agentSmartness: await (async () => {
                    console.log("[SMARTNESS] Starting neural trend analysis...");
                    try {
                        // Refined approach: fetch last 50 posts and filter agent ones
                        const postsRes = await axios.get(mediaUrl, {
                            params: { fields: 'id,timestamp,like_count,comments_count', limit: 50, access_token: accessToken }
                        });
                        const allPosts = postsRes.data.data || [];
                        const assistedPosts = await PostAnalysis.find({ userId: userId, instagramMediaId: { $exists: true } });
                        const assistedIds = new Set(assistedPosts.map(ap => ap.instagramMediaId));
                        
                        console.log(`[SMARTNESS] DB: ${assistedPosts.length} posts. Meta Feed: ${allPosts.length} posts.`);
                        
                        const agentOnlyPosts = allPosts.filter(p => assistedIds.has(p.id)).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
                        
                        console.log(`[SMARTNESS] Successfully matched ${agentOnlyPosts.length} agent posts.`);

                        const trend = await Promise.all(agentOnlyPosts.slice(-12).map(async (p, i) => {
                            try {
                                const insRes = await axios.get(`https://graph.facebook.com/v25.0/${p.id}/insights`, {
                                    params: { metric: 'reach,saved', access_token: accessToken }
                                });
                                const reach = insRes.data.data.find(x => x.name === 'reach')?.values[0]?.value || 1;
                                const saved = insRes.data.data.find(x => x.name === 'saved')?.values[0]?.value || 0;
                                const engRate = (((p.like_count + p.comments_count + saved) / reach) * 100).toFixed(2);
                                return {
                                    postIndex: `Post ${i + 1}`,
                                    engagement: parseFloat(engRate)
                                };
                            } catch (e) { 
                                console.log(`[SMARTNESS] Failed to fetch insights for post ${p.id}:`, e.message);
                                return null; 
                            }
                        }));

                        const finalTrend = trend.filter(t => t !== null);
                        let improvement = 0;
                        if (finalTrend.length > 1) {
                            const start = finalTrend[0].engagement;
                            const end = finalTrend[finalTrend.length - 1].engagement;
                            improvement = start > 0 ? Math.round(((end - start) / start) * 100) : 0;
                        }

                        console.log(`[SMARTNESS] Final trend points: ${finalTrend.length}`);

                        return {
                            trend: finalTrend,
                            improvement: improvement
                        };
                    } catch (e) { 
                        console.error("[SMARTNESS] Neural Analysis Critical Error:", e.message);
                        return { trend: [], improvement: 0 }; 
                    }
                })(),
                agentLearnings: brandProfile.agentLearnings || [],
                neuralState: brandProfile.neuralState || 'Idle'
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
        
        // Rate Limits
        if (fbError?.code === 4 || fbError?.code === 17 || fbError?.code === 32 || fbError?.code === 613 || fbError?.code === 80002 || fbError?.code === 80004) {
            return res.status(429).json({
                message: 'Instagram API Rate Limit Exceeded. Please wait a bit before refreshing.',
                requiresReconnect: false,
                fbError
            });
        }

        console.warn(`[METRICS] ⚠️ Meta API error occurred. Falling back to cached/mock metrics for ${brandProfile?.brandName || req.user?.id}: ${fbError?.message || error.message}`);
        
        // Return 200 with cached/mock fallback to prevent blocking "System Interruption" screen
        const followers = brandProfile?.analytics?.followers ? parseInt(brandProfile.analytics.followers) : 0;
        const reach = brandProfile?.analytics?.reach ? parseInt(brandProfile.analytics.reach) : 0;
        const engagement = brandProfile?.analytics?.engagement || '0.0%';

        res.json({
            message: 'Meta API rate limited or offline. Loaded cached/mock metrics.',
            mock: true,
            data: {
                followers: followers || 1200,
                followersChange: 'Live',
                reach: reach || 8500,
                reachChange: 'Live',
                impressions: Math.round((reach || 8500) * 1.2),
                impressionsChange: 'Live',
                engagementRate: engagement || '4.2%',
                engagementRateChange: 'Live',
                profile_views: Math.round((reach || 8500) * 0.1),
                post_count: brandProfile?.followerHistory?.length || 12,
                username: brandProfile?.instagramUsername || 'brand_user',
                profile_info: {
                    name: brandProfile?.brandName || 'Brand Partner',
                    biography: 'SyncSocio AI Assisted Account'
                },
                hourlyActivity: [],
                peakHourText: '8 PM',
                postBreakdown: [],
                weeklyGrowth: {
                    history: Array.from({ length: 4 }, (_, i) => ({
                        week: `W${4-i}`,
                        selfReach: Math.round((reach || 8500) * 0.2),
                        agentReach: Math.round((reach || 8500) * 0.8),
                        totalReach: reach || 8500
                    })),
                    avgAgentReach: Math.round((reach || 8500) * 0.8),
                    avgSelfReach: Math.round((reach || 8500) * 0.2)
                },
                followerGrowth: brandProfile?.followerHistory?.length > 0 ? brandProfile.followerHistory : [
                    { date: 'Jun 19', count: Math.round((followers || 1200) * 0.95) },
                    { date: 'Jun 21', count: Math.round((followers || 1200) * 0.98) },
                    { date: 'Jun 25', count: followers || 1200 }
                ],
                newFollowersCount: Math.round((followers || 1200) * 0.05),
                agentSmartness: { trend: [], improvement: 0 },
                agentLearnings: brandProfile?.agentLearnings || [],
                neuralState: brandProfile?.neuralState || 'Idle'
            }
        });
    }
});

router.get('/feed', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const brandProfile = await BrandProfile.findOne({ user: userId, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: userId });

        if (!brandProfile || !brandProfile.instagramAccessToken || !brandProfile.instagramBusinessAccountId) {
            return res.status(400).json({ message: 'Instagram not connected' });
        }

        const accessToken = brandProfile.instagramAccessToken;
        const igId = brandProfile.instagramBusinessAccountId;

        const mediaUrl = `https://graph.facebook.com/v25.0/${igId}/media`;
        const mediaRes = await axios.get(mediaUrl, {
            params: { 
                fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink,children{id}', 
                access_token: accessToken 
            }
        });

        const posts = mediaRes.data.data || [];
        const assistedPosts = await PostAnalysis.find({ userId: userId, instagramMediaId: { $exists: true } });
        const assistedIds = new Set(assistedPosts.map(ap => ap.instagramMediaId));

        const detailedPosts = await Promise.all(posts.map(async (p) => {
            let reach = 0;
            try {
                const insRes = await axios.get(`https://graph.facebook.com/v25.0/${p.id}/insights`, {
                    params: { metric: 'reach', access_token: accessToken }
                });
                const m = insRes.data.data.find(x => x.name === 'reach');
                reach = m && m.values && m.values.length > 0 ? m.values[0].value : 0;
            } catch (e) { /* ignore */ }

            return {
                id: p.id,
                type: p.media_type,
                caption: p.caption,
                media_url: p.media_url,
                thumbnail_url: p.thumbnail_url,
                timestamp: p.timestamp,
                likes: p.like_count,
                comments: p.comments_count,
                reach: reach,
                permalink: p.permalink,
                isAgentAssisted: assistedIds.has(p.id),
                childrenIds: p.children?.data ? p.children.data.map(child => child.id) : []
            };
        }));

        res.json({
            data: detailedPosts
        });

    } catch (error) {
        const fbError = error.response?.data?.error;
        console.error('Feed Fetch Error:', fbError?.message || error.message);

        if (fbError) {
            // Check for authentication, expired tokens, or missing permissions (code 190, 100, 10, etc.)
            if (
                fbError.code === 190 || // Invalid OAuth Access Token
                fbError.code === 100 || // Unsupported get request / invalid parameter / missing permissions
                fbError.code === 10 ||  // Permission denied
                fbError.message?.toLowerCase().includes('permission') ||
                fbError.message?.toLowerCase().includes('does not exist') ||
                fbError.type === 'GraphMethodException'
            ) {
                return res.status(401).json({
                    message: 'Instagram connection expired or invalid. Please reconnect.',
                    requiresReconnect: true,
                    reason: 'token_expired',
                    fbError
                });
            }
        }
        res.status(500).json({ message: 'Error fetching feed' });
    }
});

export default router;
