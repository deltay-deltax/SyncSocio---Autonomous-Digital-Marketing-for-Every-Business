import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const profile = await mongoose.connection.db.collection('brandprofiles').findOne({ instagramUsername: 'wefix_25' });

// 1. Fetch the Page Access Token manually since it was missed during OAuth
console.log('Fetching Page Access Token...');
let pageToken = '';
try {
  const accountsData = await axios.get(`https://graph.facebook.com/v25.0/me/accounts`, {
    params: {
      fields: 'id,name,access_token',
      access_token: profile.instagramAccessToken
    }
  });
  
  const page = accountsData.data.data.find(p => String(p.id) === String(profile.instagramPageId));
  if (page) {
    pageToken = page.access_token;
    console.log('Successfully grabbed Page Access Token!');
  } else {
    console.log('Page not found in accounts list');
    process.exit(1);
  }
} catch(e) {
  console.log('Error getting page token');
  process.exit(1);
}

// 2. Test the messaging API
console.log('\nTesting Message API with Page Token...');
try {
  const result = await axios.post(
    `https://graph.facebook.com/v25.0/${profile.instagramPageId}/messages`,
    {
      recipient: { comment_id: "17841405822304914" }, // Dummy comment ID
      message: { text: "This is a test message from VelocityDM" }
    },
    {
      params: { access_token: pageToken },
      headers: { 'Content-Type': 'application/json' }
    }
  );
  console.log('SUCCESS:', result.data);
} catch (error) {
  const metaError = error.response?.data?.error || error.message;
  console.log('META ERROR:', JSON.stringify(metaError, null, 2));
}

await mongoose.disconnect();
