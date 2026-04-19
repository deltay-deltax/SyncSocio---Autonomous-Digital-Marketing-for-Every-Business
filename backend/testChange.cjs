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
        const res = await axios.get(`https://graph.facebook.com/v25.0/${igId}/insights`, {
            params: { metric: 'follower_count', period: 'day', date_preset: 'last_30_days', access_token: token }
        });
        console.log('Follower history:', JSON.stringify(res.data.data, null, 2));
    } catch(err) {
        console.error('Error follower_count:', err.response?.data?.error || err.message);
    }
    mongoose.connection.close();
});
