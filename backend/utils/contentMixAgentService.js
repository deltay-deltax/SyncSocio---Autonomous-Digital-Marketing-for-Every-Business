import axios from 'axios';
import BrandProfile from '../models/BrandProfile.js';

export async function generateContentMix(userId) {
  try {
    const brandProfile = await BrandProfile.findOne({ user: userId });
    
    if (!brandProfile) {
        throw new Error("Brand profile not found");
    }

    const accessToken = brandProfile.instagramAccessToken;
    const igId = brandProfile.instagramBusinessAccountId;
    let historical_posts = [];

    // Optional: fetch real live metrics if connected
    if (accessToken && igId) {
       try {
           const API_BASE = 'https://graph.facebook.com/v25.0';
           const mediaRes = await axios.get(`${API_BASE}/${igId}/media`, {
             params: {
               fields: 'id,caption,media_type,timestamp,like_count,comments_count',
               limit: 20,
               access_token: accessToken
             }
           });
           
           const posts = mediaRes.data.data || [];
           for (const p of posts) {
             try {
               const insightsRes = await axios.get(`${API_BASE}/${p.id}/insights`, {
                 params: { metric: 'reach,saved', access_token: accessToken }
               });
               const insData = insightsRes.data.data || [];
               const reach = insData.find(m => m.name === 'reach')?.values[0]?.value || 0;
               const saved = insData.find(m => m.name === 'saved')?.values[0]?.value || 0;
               historical_posts.push({
                 post_id: p.id,
                 type: p.media_type === 'VIDEO' ? 'Reel' : p.media_type === 'CAROUSEL_ALBUM' ? 'Carousel' : 'Static',
                 reach,
                 likes: p.like_count || 0,
                 comments: p.comments_count || 0,
                 saves: saved
               });
             } catch(e) { /* skip */ }
           }
       } catch (e) {
           console.log("Skipping ig fetch due to err");
       }
    }

    const payload = {
      userId: userId,
      brand_info: brandProfile,
      historical_posts: historical_posts
    };

    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://127.0.0.1:8000';
    console.log(`📡 Calling AI Predict Mix Agent for ${brandProfile.brandName}...`);
    
    const agentRes = await axios.post(`${agentUrl}/predict-mix`, payload);
    const data = agentRes.data;
    return data;
  } catch (error) {
    console.error(`❌ Error in predicted mix:`, error.message);
    throw error;
  }
}
