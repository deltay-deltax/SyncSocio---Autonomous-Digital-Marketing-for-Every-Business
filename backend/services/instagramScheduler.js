import cron from 'node-cron';
import axios from 'axios';
import PostAnalysis from '../models/PostAnalysis.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const startInstagramScheduler = () => {
    console.log("🚀 Starting Instagram Native Scheduler (Runs every minute)");
    
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            
            // Find posts scheduled for Instagram where the time has arrived.
            // NOTE: We exclude 'publishing' to prevent the race condition where a slow
            // publish call causes the next cron tick to pick up the same post again.
            const duePosts = await PostAnalysis.find({
                isScheduled: true,
                status: 'scheduled',
                'platforms.instagram': true,
                scheduledAt: { $lte: now }
            });

            if (duePosts.length > 0) {
                console.log(`⏱️ [IG SCHEDULER] Found ${duePosts.length} due posts to publish to Instagram.`);
            }

            for (const post of duePosts) {
                try {
                    // ── RACE CONDITION FIX ──────────────────────────────────────────
                    // Atomically claim the post by setting status → 'publishing'.
                    // If another cron tick already claimed it (status changed), this
                    // findOneAndUpdate returns null and we skip — preventing double publish.
                    const claimed = await PostAnalysis.findOneAndUpdate(
                        { _id: post._id, status: 'scheduled' }, // only claim if still 'scheduled'
                        { $set: { status: 'publishing' } },
                        { new: false }
                    );

                    if (!claimed) {
                        console.log(`⏱️ [IG SCHEDULER] Post ${post._id} already being processed — skipping.`);
                        continue;
                    }
                    // ────────────────────────────────────────────────────────────────

                    console.log(`⏱️ [IG SCHEDULER] Triggering immediate IG publish for Post: ${post._id}`);
                    
                    // Call the AI service but override payload for immediate Instagram publish.
                    // We set scheduledAt to null so it doesn't trigger the skip logic in post_validator.
                    const aiResponse = await axios.post(
                        `${AI_SERVICE_URL}/schedule-post/${post._id}`,
                        { 
                            platforms: { instagram: true, facebook: false }, 
                            scheduledAt: null 
                        },
                        { timeout: 120000 }
                    );

                    const isSuccess = aiResponse.data.status === 'published';
                    
                    if (isSuccess) {
                        await PostAnalysis.findByIdAndUpdate(post._id, { $set: { status: 'published' } });
                        console.log(`✅ [IG SCHEDULER] Successfully published to Instagram for Post: ${post._id}`);
                    } else {
                        // Revert to 'scheduled' so it can be retried on the next cron tick
                        await PostAnalysis.findByIdAndUpdate(post._id, { $set: { status: 'scheduled' } });
                        console.log(`❌ [IG SCHEDULER] Publish failed for Post: ${post._id} — reverted to scheduled`);
                    }

                } catch (publishError) {
                    console.error(`❌ [IG SCHEDULER] Error publishing post ${post._id}:`, publishError.message);
                    // Revert to 'scheduled' on error so it can be retried
                    try {
                        await PostAnalysis.findByIdAndUpdate(post._id, { $set: { status: 'scheduled' } });
                    } catch (_) {}
                }
                
                // Add a small delay between requests to avoid tripping infrastructure rate limits (429 Too Many Requests)
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.error("⏱️ [IG SCHEDULER] Global error:", error);
        }
    });
};
