import axios from 'axios';
import BrandProfile from '../models/BrandProfile.js';
import ContentCalendar from '../models/ContentCalendar.js';

export async function generateContentPlan(userId, mix) {
  try {
    const brandProfile = await BrandProfile.findOne({ user: userId });
    if (!brandProfile) throw new Error("Brand profile not found");

    // Lock feature removed for now per user request

    const accessToken = brandProfile.instagramAccessToken;
    const igId = brandProfile.instagramBusinessAccountId;
    let hourly_data = [];

    // Try to fetch real hourly activity from Instagram
    if (accessToken && igId) {
      try {
        const API_BASE = 'https://graph.facebook.com/v25.0';
        const insRes = await axios.get(`${API_BASE}/${igId}/insights`, {
          params: {
            metric: 'online_followers',
            period: 'lifetime',
            access_token: accessToken
          }
        });
        hourly_data = insRes.data?.data?.[0]?.values || [];
      } catch (e) {
        console.log('Skipping hourly insights fetch:', e.message);
      }
    }

    // Fetch recent topics to avoid repetition
    const pastCalendars = await ContentCalendar.find({ userId }).sort({ createdAt: -1 }).limit(3);
    const recentTopics = pastCalendars.flatMap(cal => cal.posts.map(p => p.topic));
    
    const payload = {
      userId,
      brand_info: brandProfile,
      mix: mix || {},
      recent_topics: recentTopics,
      hourly_data
    };

    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://127.0.0.1:8000';
    console.log(`📡 Generating 7-day plan for ${brandProfile.brandName}...`);

    const agentRes = await axios.post(`${agentUrl}/generate-plan`, payload, {
      timeout: 90000
    });
    
    // Update lock timestamp and generation count
    brandProfile.lastPlanGeneratedAt = new Date();
    brandProfile.generationCount = (brandProfile.generationCount || 0) + 1;
    await brandProfile.save();

    const data = agentRes.data;

    // Persist to database
    if (data.plan && data.plan.length > 0) {
      await ContentCalendar.create({
        userId,
        posts: data.plan
      });
    }

    return data;
  } catch (error) {
    console.error(`❌ Error in content plan:`, error.message);
    throw error;
  }
}
