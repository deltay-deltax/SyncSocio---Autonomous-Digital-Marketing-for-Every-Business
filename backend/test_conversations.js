require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const FB_API_BASE = 'https://graph.facebook.com/v25.0';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/syncsocio');
  const BrandProfile = require('./models/BrandProfile.js').default;
  const profile = await BrandProfile.findOne({ instagramIsConnected: true }).lean();
  
  if(!profile) { console.log('no profile'); return; }

  const pageToken = profile.instagramPageAccessToken;
  const pageId = profile.instagramPageId;

  console.log('Fetching conversations for page', pageId);
  try {
    const res = await axios.get(`${FB_API_BASE}/${pageId}/conversations`, {
      params: { platform: 'instagram', access_token: pageToken }
    });
    console.log(JSON.stringify(res.data, null, 2));
    
    if(res.data.data && res.data.data.length > 0) {
       const convId = res.data.data[0].id;
       const msgRes = await axios.get(`${FB_API_BASE}/${convId}/messages`, {
         params: { fields: 'id,message,from,created_time', access_token: pageToken }
       });
       console.log('Messages:', JSON.stringify(msgRes.data, null, 2));
    }
  } catch(e) {
    console.error(e.response?.data || e.message);
  }
  process.exit(0);
}
run();
