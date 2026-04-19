const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: '/Users/aaruhi/Velocity_AaaS_MajorProject/backend/.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const profileSchema = new mongoose.Schema({}, { strict: false });
    const BrandProfile = mongoose.model('BrandProfile', profileSchema, 'brandprofiles');
    const profile = await BrandProfile.findOne({ instagramAccessToken: { $exists: true } });
    const token = profile.get('instagramAccessToken');
    const igId = profile.get('instagramBusinessAccountId');
    
    try {
        const mediaUrl = `https://graph.facebook.com/v25.0/${igId}/media`;
        const res = await axios.get(mediaUrl, {
            params: { 
                fields: 'id,caption,media_type,timestamp,like_count,comments_count',
                limit: 2,
                access_token: token 
            }
        });
        console.log('Media:', JSON.stringify(res.data.data, null, 2));

        if (res.data.data?.length > 0) {
            const pId = res.data.data[0].id;
            try {
                const insRes = await axios.get(`https://graph.facebook.com/v25.0/${pId}/insights`, {
                    params: { metric: 'reach,saved', access_token: token } // omitted views to see if it causes error on IMAGE
                });
                console.log('Insights:', JSON.stringify(insRes.data.data, null, 2));
            } catch (e) {
                console.error('Insights Error:', e.response?.data?.error || e.message);
            }
        }
    } catch(err) {
        console.error('Error:', err.response?.data?.error || err.message);
    }
    mongoose.connection.close();
});
