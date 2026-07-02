import cron from 'node-cron';
import axios from 'axios';
import BrandProfile from '../models/BrandProfile.js';

const FB_API_VERSION = 'v25.0';

export const startMetricsPoller = () => {
    console.log("🚀 Starting Meta Metrics Poller (Runs every 2 hours)");
    
    // Run every 2 hours at minute 0
    cron.schedule('0 */2 * * *', async () => {
        console.log("⏱️ [CRON] Running 2-hour Meta Metrics Fetch...");
        try {
            const brands = await BrandProfile.find({
                instagramAccessToken: { $exists: true, $ne: "" },
                instagramBusinessAccountId: { $exists: true, $ne: "" }
            });

            console.log(`⏱️ [CRON] Found ${brands.length} active brands to update.`);

            for (const brand of brands) {
                try {
                    const accessToken = brand.instagramAccessToken;
                    const igId = brand.instagramBusinessAccountId;

                    // 1. Fetch User Info (Followers)
                    const userUrl = `https://graph.facebook.com/${FB_API_VERSION}/${igId}`;
                    const userRes = await axios.get(userUrl, {
                        params: { fields: 'followers_count,media_count,username,name,biography', access_token: accessToken }
                    });
                    const userStats = userRes.data;

                    // 2. Fetch Media (Recent 50 posts for dashboard + breakdown)
                    const mediaUrl = `https://graph.facebook.com/${FB_API_VERSION}/${igId}/media`;
                    const mediaRes = await axios.get(mediaUrl, {
                        params: { 
                            fields: 'id,caption,media_url,thumbnail_url,media_type,timestamp,like_count,comments_count', 
                            limit: 50, 
                            access_token: accessToken 
                        }
                    });
                    const cachedMedia = mediaRes.data.data || [];

                    // Fetch insights for the top 10 media (to match dashboard needs)
                    const mediaWithInsights = await Promise.all(
                        cachedMedia.slice(0, 10).map(async (post) => {
                            try {
                                const insRes = await axios.get(`https://graph.facebook.com/${FB_API_VERSION}/${post.id}/insights`, {
                                    params: { metric: 'views,reach,saved', access_token: accessToken }
                                });
                                return { ...post, insightsData: insRes.data.data };
                            } catch (e) {
                                return { ...post, insightsData: [] };
                            }
                        })
                    );
                    
                    // Replace the first 10 with the insight-enriched versions
                    for (let i = 0; i < mediaWithInsights.length; i++) {
                        cachedMedia[i] = mediaWithInsights[i];
                    }

                    // 3. Fetch Account Insights (Reach/Views for last 7 days and previous 7 days)
                    const insightsUrl = `https://graph.facebook.com/${FB_API_VERSION}/${igId}/insights`;
                    const dateNow = Math.floor(Date.now() / 1000);
                    const periodDays = 7;
                    const previousUntil = dateNow - (periodDays * 86400);
                    const previousSince = previousUntil - (periodDays * 86400);

                    // Daily Reach (28 days) for dashboard
                    const dashboardReachRes = await axios.get(insightsUrl, {
                        params: { metric: 'reach', period: 'days_28', access_token: accessToken }
                    }).catch(() => ({ data: { data: [] }}));
                    
                    const insightsParams = {
                        metric: 'views,reach',
                        metric_type: 'total_value',
                        period: 'day',
                        date_preset: 'last_7_days',
                        access_token: accessToken
                    };
                    const prevInsightsParams = {
                        metric: 'views,reach',
                        metric_type: 'total_value',
                        period: 'day',
                        since: previousSince,
                        until: previousUntil,
                        access_token: accessToken
                    };

                    const currentInsightsRes = await axios.get(insightsUrl, { params: insightsParams }).catch(() => ({ data: { data: [] }}));
                    const prevInsightsRes = await axios.get(insightsUrl, { params: prevInsightsParams }).catch(() => ({ data: { data: [] }}));

                    // Update Follower History
                    const currentFollowersCount = userStats.followers_count || 0;
                    const todaySnapStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    
                    if (!brand.followerHistory) brand.followerHistory = [];
                    const lastEntry = brand.followerHistory[brand.followerHistory.length - 1];
                    if (!lastEntry || lastEntry.date !== todaySnapStr || lastEntry.count !== currentFollowersCount) {
                        brand.followerHistory.push({ date: todaySnapStr, count: currentFollowersCount });
                        if (brand.followerHistory.length > 60) brand.followerHistory.shift();
                    }

                    // Save to DB using updateOne to prevent Mongoose VersionError
                    await BrandProfile.updateOne(
                        { _id: brand._id },
                        {
                            $set: {
                                cachedMedia: cachedMedia,
                                cachedMetrics: {
                                    userStats,
                                    dashboardReachData: dashboardReachRes.data.data,
                                    currentInsightsData: currentInsightsRes.data.data,
                                    prevInsightsData: prevInsightsRes.data.data
                                },
                                lastMetricsUpdate: new Date(),
                                followerHistory: brand.followerHistory
                            }
                        }
                    );
                    console.log(`⏱️ [CRON] Successfully updated metrics for brand: ${brand.brandName || brand._id}`);

                } catch (brandError) {
                    console.error(`⏱️ [CRON] Error updating brand ${brand._id}:`, brandError.message);
                }
            }
            console.log("⏱️ [CRON] 2-hour Meta Metrics Fetch complete.");
        } catch (error) {
            console.error("⏱️ [CRON] Global error in metrics poller:", error);
        }
    });
};
