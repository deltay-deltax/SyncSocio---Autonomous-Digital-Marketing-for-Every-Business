import axios from 'axios';
import BrandProfile from '../models/BrandProfile.js';
import { createNotification } from './notificationHelper.js';

/**
 * Executes a neural audit for a specific user/brand.
 * Pulls Meta metrics, calls the AI agent, and persists the result.
 */
export async function performStrategicAudit(userId, brandProfile) {
  try {
    if (!brandProfile) {
        brandProfile = await BrandProfile.findOne({ user: userId });
    }
    
    if (!brandProfile || !brandProfile.instagramIsConnected) {
        console.log(`[AUDIT] ❌ Skipping: Brand profile not found or not connected for ${userId}.`);
        return;
    }

    console.log(`[AUDIT] 🧠 Starting background audit for ${brandProfile.brandName || brandProfile.instagramUsername || userId}...`);
    
    const API_BASE = 'https://graph.facebook.com/v25.0'; // Updated to v25.0 to match other routes
    const accessToken = brandProfile.instagramAccessToken;
    const igId = brandProfile.instagramBusinessAccountId;

    if (!accessToken || !igId) {
      console.log(`[AUDIT] ❌ Skipping ${brandProfile.brandName}: Missing Meta credentials.`);
      return;
    }

    // 1. Fetch last 20 posts metrics
    const mediaRes = await axios.get(`${API_BASE}/${igId}/media`, {
      params: {
        fields: 'id,caption,media_type,timestamp,like_count,comments_count',
        limit: 20,
        access_token: accessToken
      }
    });

    const posts = mediaRes.data.data || [];
    const auditPosts = [];

    for (const p of posts) {
      try {
        const insightsRes = await axios.get(`${API_BASE}/${p.id}/insights`, {
          params: {
            metric: 'reach,saved',
            access_token: accessToken
          }
        });
        const insData = insightsRes.data.data || [];
        const reach = insData.find(m => m.name === 'reach')?.values[0]?.value || 0;
        const saved = insData.find(m => m.name === 'saved')?.values[0]?.value || 0;
        const er = reach > 0 ? (((p.like_count + p.comments_count + saved) / reach) * 100).toFixed(2) : 0;

        auditPosts.push({
          post_id: p.id,
          type: p.media_type === 'VIDEO' ? 'Reel' : p.media_type === 'CAROUSEL_ALBUM' ? 'Carousel' : 'Static',
          reach,
          likes: p.like_count,
          comments: p.comments_count,
          saves: saved,
          engagement_rate: er,
          timestamp: p.timestamp
        });
      } catch (e) {
        // Skip individual post error
      }
    }

    // 2. Prepare Payload
    const contentMix = brandProfile.contentMix || { reels: 40, static: 35, carousel: 25 };
    const auditPayload = {
      userId: userId,
      brandName: brandProfile.brandName || "Growth Partner",
      businessCategory: brandProfile.businessCategory || "General",
      historical_posts: auditPosts,
      current_mix: contentMix
    };

    // 3. Call Agent
    const agentUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';
    console.log(`[AUDIT] 📡 Calling AI Agent for ${brandProfile.brandName}...`);
    
    const agentRes = await axios.post(`${agentUrl}/audit-performance`, auditPayload);
    
    if (agentRes.data) {
      const { predicted_mix, recommendation, learnings } = agentRes.data;
      
      // 4. Update Database
      await BrandProfile.findOneAndUpdate(
        { user: userId },
        { 
          predictedMix: predicted_mix,
          agentRecommendation: recommendation,
          agentLearnings: learnings || [],
          neuralState: 'Optimized',
          lastStrategicAudit: new Date()
        }
      );
      // 5. Notify User
      /* Commented out per user request to focus on operational events
      await createNotification(
        userId,
        'agent',
        'Strategic Optimization Complete',
        `Agent updated your content strategy. Recommendation: ${recommendation.slice(0, 100)}...`
      );
      */

      console.log(`[AUDIT] ✅ Success! Verdict stored for ${brandProfile.brandName}.`);
    }

  } catch (error) {
    console.error(`[AUDIT] ❌ Error in background audit for ${userId}:`, error.message);
  }
}
