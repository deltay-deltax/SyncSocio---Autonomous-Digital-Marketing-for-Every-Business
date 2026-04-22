import axios from 'axios';
import BrandProfile from '../models/BrandProfile.js';

export async function generateCaptionsAndHashtags(userId, posts) {
  try {
    const brandProfile = await BrandProfile.findOne({ user: userId });
    if (!brandProfile) throw new Error("Brand profile not found");

    const payload = {
      brandName: brandProfile.brandName || 'Unknown',
      businessCategory: brandProfile.businessCategory || 'General',
      brandTone: brandProfile.brandTone || 'Professional',
      posts: posts || []
    };

    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://127.0.0.1:8000';
    console.log(`📡 Generating captions for ${brandProfile.brandName}...`);

    const agentRes = await axios.post(`${agentUrl}/generate-captions`, payload, {
      timeout: 90000
    });
    const data = agentRes.data;

    // Persist captions to the latest calendar
    try {
      const ContentCalendar = (await import('../models/ContentCalendar.js')).default;
      const latestCalendar = await ContentCalendar.findOne({ userId }).sort({ createdAt: -1 });
      if (latestCalendar) {
        const captionMap = {};
        (data.captions || []).forEach(c => { captionMap[c.day_index] = c; });
        latestCalendar.captions = captionMap;
        await latestCalendar.save();
        console.log(`✅ Captions persisted to calendar for ${userId}`);
      }
    } catch (e) {
      console.error("Failed to persist captions to DB", e.message);
    }

    return data;
  } catch (error) {
    console.error(`❌ Error in caption generation:`, error.message);
    throw error;
  }
}
