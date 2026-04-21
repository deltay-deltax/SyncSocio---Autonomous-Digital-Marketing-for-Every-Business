import axios from 'axios';
import BrandProfile from '../models/BrandProfile.js';

export async function generateContentPlan(userId, mix) {
  try {
    const brandProfile = await BrandProfile.findOne({ user: userId });
    if (!brandProfile) throw new Error("Brand profile not found");

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

    const payload = {
      brandName: brandProfile.brandName || 'Unknown',
      businessCategory: brandProfile.businessCategory || 'General',
      brandTone: brandProfile.brandTone || 'Professional',
      mix: mix || { reels: 3, image: 2, carousel: 2 },
      hourly_data
    };

    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://127.0.0.1:8000';
    console.log(`📡 Generating 7-day plan for ${brandProfile.brandName}...`);

    const agentRes = await axios.post(`${agentUrl}/generate-plan`, payload, {
      timeout: 90000
    });
    const data = agentRes.data;

    console.log("\n=========================================");
    console.log("Generating 7-Day Plan");
    if (data.prompts && data.prompts.length > 0) {
      data.prompts.forEach((p, i) => {
        console.log(`Agent prompt ${i + 1}:`);
        console.log(p);
      });
    }
    console.log("Agent res:");
    console.log(JSON.stringify(data.plan || data, null, 2));
    console.log("=========================================\n");

    return data;
  } catch (error) {
    console.error(`❌ Error in content plan:`, error.message);
    throw error;
  }
}
