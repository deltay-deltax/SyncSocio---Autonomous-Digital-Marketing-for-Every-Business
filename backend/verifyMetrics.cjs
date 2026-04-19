const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: '/Users/aaruhi/Velocity_AaaS_MajorProject/backend/.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const profileSchema = new mongoose.Schema({}, { strict: false });
    const BrandProfile = mongoose.model('BrandProfile', profileSchema, 'brandprofiles');
    const profile = await BrandProfile.findOne({ instagramAccessToken: { $exists: true } });
    if (!profile) {
        console.log('No profile');
        process.exit();
    }
    const accessToken = profile.get('instagramAccessToken');
    const igId = profile.get('instagramBusinessAccountId');
    
    try {
        const mediaUrl = `https://graph.facebook.com/v25.0/${igId}/media`;
        const mediaRes = await axios.get(mediaUrl, {
            params: { 
                fields: 'id,caption,media_type,timestamp,like_count,comments_count',
                summary: 'true',
                limit: 5,
                access_token: accessToken 
            }
        });
        console.log("Media response status:", mediaRes.status);
        console.log("Media posts count:", mediaRes.data.data?.length);
        
        let postBreakdown = [];
        const formatTimeAgo = (timestamp) => {
            const diff = Date.now() - new Date(timestamp).getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor(diff / (1000 * 60 * 60));
            if (days > 0) return `${days}d ago`;
            if (hours > 0) return `${hours}h ago`;
            return 'Just now';
        };

        const posts = mediaRes.data.data || [];
        if (posts.length > 0) {
            postBreakdown = await Promise.all(posts.map(async (p) => {
                let reach = 0;
                let saved = 0;
                try {
                    const insRes = await axios.get(`https://graph.facebook.com/v25.0/${p.id}/insights`, {
                        params: { metric: 'reach,saved', access_token: accessToken }
                    });
                    const getInsight = (name) => {
                        const m = insRes.data.data.find(x => x.name === name);
                        return m && m.values && m.values.length > 0 ? m.values[0].value : 0;
                    };
                    reach = getInsight('reach');
                    saved = getInsight('saved');
                } catch (e) {
                    console.log('Insight error for post', p.id, e.message);
                }
                
                const likes = p.like_count || 0;
                const comments = p.comments_count || 0;
                let engagement = "0.0%";
                if (reach > 0) {
                    engagement = (((likes + comments + saved) / reach) * 100).toFixed(1) + "%";
                }
                
                let reachStr = reach.toString();
                if (reach >= 1000) reachStr = (reach / 1000).toFixed(1) + "K";
                
                let type = "Static";
                if (p.media_type === "VIDEO") type = "Reel";
                if (p.media_type === "CAROUSEL_ALBUM") type = "Carousel";

                return {
                    post: p.caption ? p.caption.substring(0, 25) + '...' : 'Untitled Post',
                    type,
                    reach: reachStr,
                    likes,
                    engagement,
                    posted: formatTimeAgo(p.timestamp)
                };
            }));
        }
        console.log("Post breakdown:", postBreakdown);
    } catch(err) {
        console.error('Error fetching media:', err.response?.data?.error || err.message);
    }
    mongoose.connection.close();
});
