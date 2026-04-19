const axios = require('axios');
const mongoose = require('mongoose');
const FB_API_BASE = 'https://graph.facebook.com/v25.0';

async function run() {
  await mongoose.connect('mongodb://aaditya303gupta_db_user:9BYuNNvzSla0gSRo@ac-hagoozx-shard-00-00.lzjkbau.mongodb.net:27017,ac-hagoozx-shard-00-01.lzjkbau.mongodb.net:27017,ac-hagoozx-shard-00-02.lzjkbau.mongodb.net:27017/?ssl=true&replicaSet=atlas-5j7gs0-shard-0&authSource=admin&retryWrites=true&w=majority');
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
