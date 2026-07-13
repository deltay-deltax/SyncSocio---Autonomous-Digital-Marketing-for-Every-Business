import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('d:\\Major_Project\\backend\\.env') });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const PostAnalysis = (await import('../models/PostAnalysis.js')).default;
        
        const posts = await PostAnalysis.find({
            isScheduled: true,
            status: 'scheduled'
        });
        
        console.log(`Found ${posts.length} scheduled posts.`);
        posts.forEach(post => {
            console.log(`Post ID: ${post._id}`);
            console.log(`Scheduled At: ${post.scheduledAt}`);
            console.log(`Platforms: ${JSON.stringify(post.platforms)}`);
            console.log('---');
        });
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
