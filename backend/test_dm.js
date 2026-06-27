import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const profile = await mongoose.connection.db.collection('brandprofiles').findOne({ instagramUsername: 'wefix_25' });

if (!profile) {
  console.log('Profile not found.');
  process.exit(1);
}

const igId = profile.instagramBusinessAccountId;
const token = profile.instagramPageAccessToken || profile.instagramAccessToken;

console.log('Token Type:', profile.instagramPageAccessToken ? 'PAGE' : 'USER');

try {
  // Try sending a message to a random comment ID (will fail with invalid comment ID, but specific error)
  const result = await axios.post(
    `https://graph.facebook.com/v25.0/${igId}/messages`,
    {
      recipient: { comment_id: "17841405822304914" },
      message: { text: "This is a test message from SyncSocio" }
    },
    {
      params: { access_token: token },
      headers: { 'Content-Type': 'application/json' }
    }
  );
  console.log('SUCCESS:', result.data);
} catch (error) {
  const metaError = error.response?.data?.error || error.message;
  console.log('META ERROR:', JSON.stringify(metaError, null, 2));
}

await mongoose.disconnect();
