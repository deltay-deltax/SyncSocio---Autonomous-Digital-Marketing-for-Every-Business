/**
 * Dashboard Controller
 * Provides metrics and handles strategic insights from the database.
 */

import axios from 'axios';
import BrandProfile from '../models/BrandProfile.js';
import AgentActivity from '../models/AgentActivity.js';

const formatTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + "y ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + "mo ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + "d ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + "h ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + "m ago";
  if (seconds < 10) return "Just now";
  return Math.floor(seconds) + "s ago";
};

// Summary: Metrics and Activity Feed
export const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user?.id;
    let fallbackToMock = true;
    let realMetrics = {};

    if (userId) {
      const brandProfile = await BrandProfile.findOne({ user: userId });
      if (brandProfile && brandProfile.instagramAccessToken && brandProfile.instagramBusinessAccountId) {
        fallbackToMock = false;
        try {
          const accessToken = brandProfile.instagramAccessToken;
          const igId = brandProfile.instagramBusinessAccountId;

          // 1. Fetch Media (Posts) for this month & this week calculation
          const mediaUrl = `https://graph.facebook.com/v25.0/${igId}/media`;
          const mediaRes = await axios.get(mediaUrl, {
            params: { fields: 'id,caption,media_url,thumbnail_url,media_type,timestamp,like_count,comments_count', limit: 50, access_token: accessToken }
          });

          // 2. Fetch Weekly Reach
          const insightsUrl = `https://graph.facebook.com/v25.0/${igId}/insights`;
          const insightsRes = await axios.get(insightsUrl, {
            params: { metric: 'reach', period: 'days_28', access_token: accessToken }
          });

          let reachThisWeek = 0;
          if (insightsRes.data && insightsRes.data.data && insightsRes.data.data.length > 0) {
            const reachMetric = insightsRes.data.data.find(m => m.name === 'reach');
            if (reachMetric && reachMetric.values && reachMetric.values.length > 0) {
               reachThisWeek = reachMetric.values[reachMetric.values.length - 1].value || 0;
            }
          }

          const posts = mediaRes.data.data || [];
          let postsThisMonth = 0;
          let likesThisWeek = 0;
          let commentsThisWeek = 0;

          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const postsFromLast7Days = [];

          posts.forEach(post => {
            const pDate = new Date(post.timestamp);
            if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) postsThisMonth++;
            if (pDate >= sevenDaysAgo) {
              likesThisWeek += (post.like_count || 0);
              commentsThisWeek += (post.comments_count || 0);
              postsFromLast7Days.push(post);
            }
          });

          let topPostInfo = null;
          let engagementRate = '0.0';

          if (postsFromLast7Days.length > 0) {
            let totalPostReach = 0;
            let totalPostSaves = 0;

            const postsWithInsights = await Promise.all(
              postsFromLast7Days.slice(0, 10).map(async (post) => {
                try {
                  const insRes = await axios.get(`https://graph.facebook.com/v25.0/${post.id}/insights`, {
                    params: { metric: 'views,reach,saved', access_token: accessToken }
                  });
                  const insData = insRes.data.data;
                  const getInsight = (name) => {
                    const m = insData.find(x => x.name === name);
                    return m && m.values && m.values.length > 0 ? m.values[0].value : 0;
                  };
                  return { ...post, views: getInsight('views'), reach: getInsight('reach'), saved: getInsight('saved') };
                } catch (e) {
                  return { ...post, views: 0, reach: 0, saved: 0 };
                }
              })
            );

            const scored = postsWithInsights.map(p => {
              totalPostReach += p.reach;
              totalPostSaves += p.saved;
              return {
                ...p,
                score: (p.reach * 3) + (p.views * 2) + ((p.like_count || 0) * 1.5) + (p.saved * 2)
              };
            });

            if (totalPostReach > 0) {
              engagementRate = (((likesThisWeek + commentsThisWeek + totalPostSaves) / totalPostReach) * 100).toFixed(1);
            }

            const topPostData = scored.sort((a, b) => b.score - a.score)[0];
            let engRateStr = "0.0";
            if (topPostData.reach > 0) {
              engRateStr = (((topPostData.like_count || 0) + (topPostData.comments_count || 0) + topPostData.saved) / topPostData.reach * 100).toFixed(1);
            }

            topPostInfo = {
              image: topPostData.media_url || topPostData.thumbnail_url,
              caption: topPostData.caption || 'Top Post',
              views: topPostData.views,
              likes: topPostData.like_count || 0,
              engagement: engRateStr + '%'
            };
          }

          let reelCount = 0;
          let staticCount = 0;
          let carouselCount = 0;
          posts.forEach(post => {
             if (post.media_type === 'VIDEO') reelCount++;
             else if (post.media_type === 'CAROUSEL_ALBUM') carouselCount++;
             else staticCount++;
          });
          
          const totalMix = reelCount + staticCount + carouselCount || 1;
          const contentMix = {
             reels: Math.round((reelCount / totalMix) * 100),
             static: Math.round((staticCount / totalMix) * 100),
             carousel: Math.round((carouselCount / totalMix) * 100)
          };

          realMetrics = {
            postsThisMonth,
            reachThisWeek: reachThisWeek.toLocaleString(),
            likesThisWeek: likesThisWeek.toLocaleString(),
            engagementRate: engagementRate + '%',
            topPost: topPostInfo,
            contentMix,
            predictedMix: brandProfile.predictedMix,
            agentRecommendation: brandProfile.agentRecommendation
          };

        } catch (apiError) {
          const errorData = apiError.response?.data?.error || apiError.response?.data || {};
          console.error("Dashboard API fetch error:", {
            message: apiError.message,
            metaError: errorData,
            path: apiError.config?.url
          });
          fallbackToMock = true;
        }
      }
    }

    let metrics;
    let topPost = null;
    let contentMix = { reels: 0, static: 0, carousel: 0 };
    let predictedMix = { reels: 0, static: 0, carousel: 0 };
    let agentRecommendation = "";

    if (fallbackToMock) {
      metrics = [
        { label: 'Posts This Month', value: '0', change: '0%', icon: 'TrendingUp', gradient: 'from-primary/15 to-primary/5' },
        { label: 'Reach This Week', value: '0', change: '0%', icon: 'Eye', gradient: 'from-emerald-500/15 to-emerald-500/5' },
        { label: 'Likes This Week', value: '0', change: '0%', icon: 'Heart', gradient: 'from-rose-500/15 to-rose-500/5' },
        { label: 'Engagement Rate', value: '0.0%', change: '0%', icon: 'Activity', gradient: 'from-amber-500/15 to-amber-500/5' },
      ];
    } else {
      metrics = [
        { label: 'Posts This Month', value: realMetrics.postsThisMonth.toString(), change: 'Live', icon: 'TrendingUp', gradient: 'from-primary/15 to-primary/5' },
        { label: 'Reach This Week', value: realMetrics.reachThisWeek, change: 'Live', icon: 'Eye', gradient: 'from-emerald-500/15 to-emerald-500/5' },
        { label: 'Likes This Week', value: realMetrics.likesThisWeek, change: 'Live', icon: 'Heart', gradient: 'from-rose-500/15 to-rose-500/5' },
        { label: 'Engagement Rate', value: realMetrics.engagementRate, change: 'Live', icon: 'Activity', gradient: 'from-amber-500/15 to-amber-500/5' },
      ];
      topPost = realMetrics.topPost;
      contentMix = realMetrics.contentMix;
      predictedMix = realMetrics.predictedMix || { reels: 0, static: 0, carousel: 0 };
      agentRecommendation = realMetrics.agentRecommendation || "Your strategic audit is running in the background. Check back soon for neural insights.";
    }

    // Fetch real activities from DB
    const dbActivities = await AgentActivity.find({ user: userId })
      .sort({ timestamp: -1 })
      .limit(6);
    
    const activities = dbActivities.length > 0 
      ? dbActivities.map(a => ({
          message: `${a.agentName}: ${a.message}`,
          status: a.status,
          time: formatTimeAgo(a.timestamp)
        }))
      : [
          { message: 'Engine: Ready for content synthesis', status: 'done', time: 'Just now' },
          { message: 'Neural Pulse: Monitoring strategy trends', status: 'active', time: 'Just now' }
        ];

    res.json({ metrics, activities, topPost, contentMix, predictedMix, agentRecommendation });
  } catch (error) {
    console.error("Summary error:", error);
    res.status(500).json({ message: 'Error fetching dashboard summary' });
  }
};

// ... existing feed/analytics/ads exports ...
export const getDashboardFeed = async (req, res) => res.json({ posts: [] });
export const getDashboardAnalytics = async (req, res) => {
  const insights = [
      'Reels consistently outperform static posts by 4x in reach',
      'Posting between 7-9 PM drives 62% of your weekly engagement',
      'Carousel posts have the highest save rate at 3.2%',
      'Your audience is most active on Wednesday and Saturday',
      'Food process videos get 2.8x more shares than finished product shots',
    ];
  res.json({ hourlyData: [], postBreakdown: [], insights });
};
export const getDashboardAds = async (req, res) => res.json({ recommendations: [] });
export const getDashboardNotifications = async (req, res) => res.json({ notifications: [] });