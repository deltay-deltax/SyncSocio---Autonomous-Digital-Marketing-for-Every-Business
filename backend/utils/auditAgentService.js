import axios from 'axios';
import BrandProfile from '../models/BrandProfile.js';
import { createNotification } from './notificationHelper.js';
import { logActivity } from './activityLogger.js';

/**
 * Executes a neural audit for a specific user/brand.
 * Pulls Meta metrics, calls the AI agent, and persists the result.
 */
export async function performStrategicAudit(userId, brandProfile) {
  const startTime = Date.now();
  try {
    if (!brandProfile) {
        brandProfile = await BrandProfile.findOne({ user: userId });
    }
    
    if (!brandProfile || !brandProfile.instagramIsConnected) {
        console.log(`[AUDIT] ❌ Skipping: Brand profile not found or not connected for ${userId}.`);
        return;
    }

    console.log(`[AUDIT] 🧠 Starting background audit for ${brandProfile.brandName || brandProfile.instagramUsername || userId}...`);
    
    const API_BASE = 'https://graph.facebook.com/v25.0';
    const accessToken = brandProfile.instagramAccessToken;
    const igId = brandProfile.instagramBusinessAccountId;

    if (!accessToken || !igId) {
      console.log(`[AUDIT] ❌ Skipping ${brandProfile.brandName}: Missing Meta credentials.`);
      return;
    }

    // Log active
    await logActivity(userId, 'Neural Pulse', 'Running strategic performance audit...', 'active');

    // 1. Fetch last 20 posts metrics
    let posts = [];
    try {
      const mediaRes = await axios.get(`${API_BASE}/${igId}/media`, {
        params: {
          fields: 'id,caption,media_type,timestamp,like_count,comments_count',
          limit: 20,
          access_token: accessToken
        }
      });
      posts = mediaRes.data.data || [];
    } catch (apiError) {
      console.warn(`[AUDIT] ⚠️ Failed to fetch media from Meta API for ${brandProfile.brandName || userId}: ${apiError.message}. Proceeding with empty historical posts.`);
    }

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
        
        const likes = p.like_count || 0;
        const comments = p.comments_count || 0;
        const er = reach > 0 ? (((likes + comments + saved) / reach) * 100).toFixed(2) : 0;

        auditPosts.push({
          post_id: p.id,
          type: p.media_type === 'VIDEO' ? 'Reel' : p.media_type === 'CAROUSEL_ALBUM' ? 'Carousel' : 'Static',
          reach,
          likes,
          comments,
          saves: saved,
          engagement_rate: Number(er) || 0,
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
      
      // Map isNew to isFresh for Mongoose compliance
      const formattedLearnings = (learnings || []).map(l => ({
          ...l,
          isFresh: l.isNew !== undefined ? l.isNew : true
      }));

      // 4. Update Database
      await BrandProfile.findOneAndUpdate(
        { user: userId },
        { 
          predictedMix: predicted_mix,
          agentRecommendation: recommendation,
          agentLearnings: formattedLearnings,
          neuralState: 'Optimized',
          lastStrategicAudit: new Date()
        }
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
      await logActivity(userId, 'Neural Pulse', `Strategic audit complete in ${duration}. Mix optimized.`, 'done', duration);

      // 5. Notify User
      /* Commented out per user request to focus on operational events
      await createNotification(
        userId,
        'agent',
        'Strategic Optimization Complete',
        `Agent updated your content strategy. Recommendation: ${recommendation.slice(0, 100)}...`
      );
      */

      console.log(`[AUDIT] ✅ Success! Verdict stored for ${brandProfile.brandName || brandProfile.instagramUsername || userId}.`);
    }

  } catch (error) {
    console.error(`[AUDIT] ❌ Error in background audit for ${userId}:`, error.message);
    await logActivity(userId, 'Neural Pulse', `Audit failed: ${error.message}`, 'error');
  }
}
