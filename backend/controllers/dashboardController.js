/**
 * Dashboard Controller
 * Provides metrics and handles strategic insights from the database.
 */

import axios from 'axios';
import BrandProfile from '../models/BrandProfile.js';
import AgentActivity from '../models/AgentActivity.js';
import StrategyCreative from '../models/StrategyCreative.js';
import Product from '../models/Product.js';
import DMFlow from '../models/DMFlow.js';

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
    const userId = req.user?.id || req.user?._id;
    const brandId = req.user?.activeBrandId;
    let fallbackToMock = true;
    let realMetrics = {};

    if (userId) {
      // Use active brand profile, fall back to first brand
      const brandProfile = brandId
        ? (await BrandProfile.findOne({ user: userId, _id: brandId }) || await BrandProfile.findOne({ user: userId }))
        : await BrandProfile.findOne({ user: userId });
      if (brandProfile && brandProfile.instagramAccessToken && brandProfile.instagramBusinessAccountId) {
        fallbackToMock = false;
        try {
          // Read from cache populated by metricsPoller
          const posts = brandProfile.cachedMedia || [];
          const reachThisWeekRaw = brandProfile.cachedMetrics?.dashboardReachData || [];
          
          let reachThisWeek = 0;
          if (reachThisWeekRaw && reachThisWeekRaw.length > 0) {
            const reachMetric = reachThisWeekRaw.find(m => m.name === 'reach');
            if (reachMetric && reachMetric.values && reachMetric.values.length > 0) {
               reachThisWeek = reachMetric.values[reachMetric.values.length - 1].value || 0;
            }
          }

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

            const postsWithInsights = postsFromLast7Days.slice(0, 10).map((post) => {
                const insData = post.insightsData || [];
                const getInsight = (name) => {
                  const m = insData.find(x => x.name === name);
                  return m && m.values && m.values.length > 0 ? m.values[0].value : 0;
                };
                return { ...post, views: getInsight('views'), reach: getInsight('reach'), saved: getInsight('saved') };
            });

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
            if (topPostData && topPostData.reach > 0) {
              engRateStr = (((topPostData.like_count || 0) + (topPostData.comments_count || 0) + topPostData.saved) / topPostData.reach * 100).toFixed(1);
            }

            if (topPostData) {
                topPostInfo = {
                  image: topPostData.media_type === 'VIDEO' && topPostData.thumbnail_url ? topPostData.thumbnail_url : (topPostData.media_url || topPostData.thumbnail_url),
                  caption: topPostData.caption || 'Top Post',
                  views: topPostData.views,
                  likes: topPostData.like_count || 0,
                  engagement: engRateStr + '%'
                };
            }
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
          console.error("Dashboard cache read error:", {
            message: apiError.message,
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

    const defaultBrand = await BrandProfile.findOne({ user: userId }).sort({ createdAt: 1 });
    const isDefaultBrand = defaultBrand && String(defaultBrand._id) === String(brandId);

    // Fetch real activities from DB - scoped to active brand
    let activityQuery = { user: userId };
    if (brandId) {
      if (isDefaultBrand) {
        activityQuery.$or = [{ brandId }, { brandId: { $exists: false } }, { brandId: null }];
      } else {
        activityQuery.brandId = brandId;
      }
    }

    const dbActivities = await AgentActivity.find(activityQuery)
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

    // Creatives: legacy records without brandId belong to default brand
    let creativesQuery = { user: userId };
    if (brandId) {
      if (isDefaultBrand) {
        creativesQuery.$or = [{ brandId }, { brandId: { $exists: false } }, { brandId: null }];
      } else {
        creativesQuery.brandId = brandId;
      }
    }
    const totalCreatives = await StrategyCreative.countDocuments(creativesQuery);
    const totalPosted = await StrategyCreative.countDocuments({ ...creativesQuery, status: { $in: ['posted', 'published'] } });

    // Products: same fallback logic
    let productsQuery = { user: userId };
    if (brandId) {
      if (isDefaultBrand) {
        productsQuery.$or = [{ brandId }, { brandId: { $exists: false } }, { brandId: null }];
      } else {
        productsQuery.brandId = brandId;
      }
    }
    const totalProducts = await Product.countDocuments(productsQuery);

    // DM Flows: brand-scoped
    let flowsQuery = { user: userId };
    if (brandId) {
      if (isDefaultBrand) {
        flowsQuery.$or = [{ brandId }, { brandId: { $exists: false } }, { brandId: null }];
      } else {
        flowsQuery.brandId = brandId;
      }
    }
    const totalFlows = await DMFlow.countDocuments(flowsQuery);

    const workspaceStats = {
      totalCreatives,
      totalPosted,
      totalProducts,
      totalFlows
    };

    // Calculate credits used in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivities = await AgentActivity.find({
      user: userId,
      timestamp: { $gte: sevenDaysAgo }
    }).select('message');

    let creditsUsedLast7Days = 0;
    recentActivities.forEach(a => {
      const match = a.message.match(/Spent (\d+) credits/);
      if (match) {
        creditsUsedLast7Days += parseInt(match[1], 10);
      }
    });

    res.json({ metrics, activities, topPost, workspaceStats, creditsUsedLast7Days });
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