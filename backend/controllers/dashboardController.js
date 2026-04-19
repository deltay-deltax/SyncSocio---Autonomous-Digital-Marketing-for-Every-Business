/**
 * Dashboard Controller
 * Provides mock data for testing the Velocity Dashboard
 */

import axios from 'axios';
import BrandProfile from '../models/BrandProfile.js';

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
            params: { metric: 'reach', period: 'week', access_token: accessToken }
          });

          let reachThisWeek = 0;
          if (insightsRes.data.data && insightsRes.data.data.length > 0) {
            // Find the reach metric
            const reachMetric = insightsRes.data.data.find(m => m.name === 'reach');
            if (reachMetric && reachMetric.values) {
               reachThisWeek = reachMetric.values.reduce((sum, item) => sum + (item.value || 0), 0);
            }
          }

          // Calculate Posts This Month, Likes This Week, Comments This Week
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
            // This month check
            if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
              postsThisMonth++;
            }
            // This week check
            if (pDate >= sevenDaysAgo) {
              likesThisWeek += (post.like_count || 0);
              commentsThisWeek += (post.comments_count || 0);
              postsFromLast7Days.push(post);
            }
          });

          // TOP POST & POST-LEVEL ENGAGEMENT CALCULATION
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

            // Global Engagement Rate (Calculated from post insights as per PDF)
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

          realMetrics = {
            postsThisMonth,
            reachThisWeek: reachThisWeek.toLocaleString(),
            likesThisWeek: likesThisWeek.toLocaleString(),
            engagementRate: engagementRate + '%',
            topPost: topPostInfo
          };

        } catch (apiError) {
          console.error("Dashboard API fetch error:", apiError?.response?.data || apiError.message);
          fallbackToMock = true; // Fallback to mock if API fails
        }
      }
    }

    let metrics;
    let topPost = null;
    if (fallbackToMock) {
      metrics = [
        { label: 'Posts This Month', value: '12', change: '+3', icon: 'TrendingUp', gradient: 'from-primary/15 to-primary/5' },
        { label: 'Reach This Week', value: '4,200', change: '+18%', icon: 'Eye', gradient: 'from-emerald-500/15 to-emerald-500/5' },
        { label: 'Likes This Week', value: '312', change: '+24%', icon: 'Heart', gradient: 'from-rose-500/15 to-rose-500/5' },
        { label: 'Engagement Rate', value: '6.2%', change: '+0.8%', icon: 'Activity', gradient: 'from-amber-500/15 to-amber-500/5' },
      ];
    } else {
      metrics = [
        { label: 'Posts This Month', value: realMetrics.postsThisMonth.toString(), change: 'Live', icon: 'TrendingUp', gradient: 'from-primary/15 to-primary/5' },
        { label: 'Reach This Week', value: realMetrics.reachThisWeek, change: 'Live', icon: 'Eye', gradient: 'from-emerald-500/15 to-emerald-500/5' },
        { label: 'Likes This Week', value: realMetrics.likesThisWeek, change: 'Live', icon: 'Heart', gradient: 'from-rose-500/15 to-rose-500/5' },
        { label: 'Engagement Rate', value: realMetrics.engagementRate, change: 'Live', icon: 'Activity', gradient: 'from-amber-500/15 to-amber-500/5' },
      ];
      topPost = realMetrics.topPost;
    }

    const activities = [
      { status: 'done', time: '2 hrs ago', message: 'Analysed last 6 posts — Reels winning by 4x' },
      { status: 'done', time: '1 hr ago', message: 'Generated Reel post for tonight' },
      { status: 'done', time: '45 min ago', message: 'Posted to Instagram successfully' },
      { status: 'done', time: '10 min ago', message: 'Post hit 4.2% engagement — above your average' },
      { status: 'active', time: 'Now', message: 'Planning tomorrow\'s content strategy' },
      { status: 'upcoming', time: 'Tonight', message: 'Will post improved Carousel at 8PM' },
    ];

    res.json({ metrics, activities, topPost });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard summary' });
  }
};

// Feed: Instagram Posts
export const getDashboardFeed = async (req, res) => {
  try {
    const posts = [
      { id: 1, type: 'Reel', caption: '5 baking secrets nobody tells you 🍞', time: '2 hours ago', views: '2.1K', likes: '186', engagement: '8.2%', agent: true, emoji: '🎬' },
      { id: 2, type: 'Static', caption: 'Our new sourdough starter — 72 hours in the making', time: '1 day ago', views: '890', likes: '94', engagement: '4.1%', agent: true, emoji: '📸' },
      { id: 3, type: 'Carousel', caption: 'From flour to focaccia — swipe through the process →', time: '2 days ago', views: '1.4K', likes: '128', engagement: '5.6%', agent: true, emoji: '🎠' },
      { id: 4, type: 'Reel', caption: 'Morning bake routine — peaceful ASMR edition ☀️', time: '3 days ago', views: '3.2K', likes: '290', engagement: '9.1%', agent: false, emoji: '🎬' },
      { id: 5, type: 'Static', caption: 'Fresh batch of cinnamon rolls available this weekend!', time: '4 days ago', views: '670', likes: '72', engagement: '3.8%', agent: true, emoji: '📸' },
      { id: 6, type: 'Carousel', caption: 'Top 5 bread mistakes beginners make 🚫', time: '5 days ago', views: '1.8K', likes: '210', engagement: '7.3%', agent: true, emoji: '🎠' },
    ];

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard feed' });
  }
};

// Analytics: Range-based data and insights
export const getDashboardAnalytics = async (req, res) => {
  try {
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      reach: Math.floor(Math.random() * 400) + (i >= 18 && i <= 21 ? 600 : 50),
      peak: i === 20,
    }));

    const postBreakdown = [
      { post: '5 baking secrets...', type: 'Reel', reach: '2.1K', likes: '186', engagement: '8.2%', posted: '2h ago' },
      { post: 'Morning bake routine...', type: 'Reel', reach: '3.2K', likes: '290', engagement: '9.1%', posted: '3d ago' },
      { post: 'Flour to focaccia...', type: 'Carousel', reach: '1.4K', likes: '128', engagement: '5.6%', posted: '2d ago' },
      { post: 'Sourdough starter...', type: 'Static', reach: '890', likes: '94', engagement: '4.1%', posted: '1d ago' },
      { post: 'Cinnamon rolls...', type: 'Static', reach: '670', likes: '72', engagement: '3.8%', posted: '4d ago' },
    ];

    const insights = [
      'Reels consistently outperform static posts by 4x in reach',
      'Posting between 7-9 PM drives 62% of your weekly engagement',
      'Carousel posts have the highest save rate at 3.2%',
      'Your audience is most active on Wednesday and Saturday',
      'Food process videos get 2.8x more shares than finished product shots',
    ];

    res.json({ hourlyData, postBreakdown, insights });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard analytics' });
  }
};

// Ads: Boost Recommendations
export const getDashboardAds = async (req, res) => {
  try {
    const recommendations = [
      {
        emoji: '🎬',
        caption: '5 baking secrets nobody tells you — save this reel! 🍞',
        engagement: '8.2%',
        reasoning: 'This post is outperforming your average by 3.4x — ideal for boosting',
        budget: '₹500',
        duration: '3 days',
        reach: '8,000-12,000',
        audience: 'Foodies · Bangalore · 22-38',
      },
      {
        emoji: '🎬',
        caption: 'Morning bake routine — peaceful ASMR edition ☀️',
        engagement: '9.1%',
        reasoning: 'Highest engagement reel this week — strong boost candidate',
        budget: '₹750',
        duration: '5 days',
        reach: '12,000-18,000',
        audience: 'Foodies · India · 20-35',
      },
    ];

    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard ads' });
  }
};

// Notifications
export const getDashboardNotifications = async (req, res) => {
  try {
    const notifications = [
      { id: 1, type: 'success', icon: 'CheckCircle2', title: 'Post published successfully', desc: 'Your Reel "5 baking secrets" is now live on Instagram', time: '10 min ago', unread: true },
      { id: 2, type: 'insight', icon: 'TrendingUp', title: 'Engagement milestone reached', desc: 'Your account crossed 6% avg engagement rate this week 🎉', time: '1 hr ago', unread: true },
      { id: 3, type: 'agent', icon: 'Zap', title: 'Agent updated content strategy', desc: 'Shifted mix to 70% Reels based on last week\'s performance', time: '2 hrs ago', unread: true },
      { id: 4, type: 'comment', icon: 'MessageSquare', title: 'New comments on your post', desc: '12 new comments on "Morning bake routine" — 3 need replies', time: '3 hrs ago', unread: false },
      { id: 5, type: 'scheduled', icon: 'Clock', title: 'Post scheduled for tonight', desc: 'Carousel post "Flour to focaccia" will go live at 8PM', time: '5 hrs ago', unread: false },
      { id: 6, type: 'success', icon: 'CheckCircle2', title: 'Boost approved & running', desc: 'Your boosted Reel is reaching 2.4K people so far', time: '1 day ago', unread: false },
    ];

    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};