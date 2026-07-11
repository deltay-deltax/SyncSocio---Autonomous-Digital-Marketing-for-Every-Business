import cron from 'node-cron';
import axios from 'axios';
import PostAnalysis from '../models/PostAnalysis.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const startInstagramScheduler = () => {
    console.log("🚀 Starting Instagram Native Scheduler (Runs every minute)");
    
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            
            // Find posts scheduled for Instagram where the time has arrived
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
                    console.log(`⏱️ [IG SCHEDULER] Triggering immediate IG publish for Post: ${post._id}`);
                    
                    // Call the AI service but override payload for immediate Instagram publish
                    // We set scheduledAt to null so it doesn't trigger the skip logic in post_validator
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
                        post.status = 'published';
                        await post.save();
                        console.log(`✅ [IG SCHEDULER] Successfully published to Instagram for Post: ${post._id}`);
                    } else {
                        console.log(`❌ [IG SCHEDULER] Publish failed for Post: ${post._id}`);
                    }

                } catch (publishError) {
                    console.error(`❌ [IG SCHEDULER] Error publishing post ${post._id}:`, publishError.message);
                }
                
                // Add a small delay between requests to avoid tripping infrastructure rate limits (429 Too Many Requests)
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.error("⏱️ [IG SCHEDULER] Global error:", error);
        }
    });
};
