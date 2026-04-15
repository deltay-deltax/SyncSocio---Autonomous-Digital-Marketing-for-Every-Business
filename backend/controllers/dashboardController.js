/**
 * Dashboard Controller
 * Provides mock data for testing the Velocity Dashboard
 */

// Summary: Metrics and Activity Feed
export const getDashboardSummary = async (req, res) => {
  try {
    const metrics = [
      { label: 'Posts This Month', value: '12', change: '+3', icon: 'TrendingUp', gradient: 'from-primary/15 to-primary/5' },
      { label: 'Reach This Week', value: '4,200', change: '+18%', icon: 'Eye', gradient: 'from-emerald-500/15 to-emerald-500/5' },
      { label: 'Likes This Week', value: '312', change: '+24%', icon: 'Heart', gradient: 'from-rose-500/15 to-rose-500/5' },
      { label: 'Engagement Rate', value: '6.2%', change: '+0.8%', icon: 'Activity', gradient: 'from-amber-500/15 to-amber-500/5' },
    ];

    const activities = [
      { status: 'done', time: '2 hrs ago', message: 'Analysed last 6 posts — Reels winning by 4x' },
      { status: 'done', time: '1 hr ago', message: 'Generated Reel post for tonight' },
      { status: 'done', time: '45 min ago', message: 'Posted to Instagram successfully' },
      { status: 'done', time: '10 min ago', message: 'Post hit 4.2% engagement — above your average' },
      { status: 'active', time: 'Now', message: 'Planning tomorrow\'s content strategy' },
      { status: 'upcoming', time: 'Tonight', message: 'Will post improved Carousel at 8PM' },
    ];

    res.json({ metrics, activities });
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
