import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const profile = await mongoose.connection.db.collection('brandprofiles').findOne({ instagramUsername: 'wefix_25' });

console.log('Fetching recent media for IG Account:', profile.instagramBusinessAccountId);

try {
  // 1. Get recent media
  const mediaRes = await axios.get(`https://graph.facebook.com/v25.0/${profile.instagramBusinessAccountId}/media`, {
    params: {
      fields: 'id,caption',
      access_token: profile.instagramAccessToken
    }
  });

  const media = mediaRes.data.data;
  if (!media || media.length === 0) {
    console.log('No media found.');
    process.exit(0);
  }

  const latestMediaId = media[0].id;
  console.log(`Found Latest Media ID: ${latestMediaId} | Caption snippet: ${media[0].caption?.substring(0, 30)}...`);

  // 2. Fetch comments on that media
  const commentsRes = await axios.get(`https://graph.facebook.com/v25.0/${latestMediaId}/comments`, {
    params: {
      fields: 'id,text,username',
      access_token: profile.instagramAccessToken
    }
  });

  const comments = commentsRes.data.data;
  if (!comments || comments.length === 0) {
    console.log('No comments found on this post.');
  } else {
    console.log('\n=== REAL COMMENTS FOUND ===');
    comments.forEach(c => {
      console.log(`Username: ${c.username} | Text: "${c.text}" | ID: ${c.id}`);
    });
    
    // Give curl command for the first valid wor45356 comment
    const validComment = comments.find(c => c.username === 'wor45356');
    if (validComment) {
      console.log('\n✅ FOUND REAL COMMENT BY wor45356! RUN THIS EXACT COMMAND IN TERMINAL TO SEND THE REAL DM:');
      console.log(`curl -X POST http://localhost:5050/api/auth/instagram/webhook/test -H "Content-Type: application/json" -d '{"commentText":"${validComment.text}", "commentId":"${validComment.id}"}'`);
    } else {
       console.log('\n❌ Graph API did not return any comments by wor45356. They might not be a verified Tester, or the privacy settings blocked it.');
    }
  }

} catch (error) {
  const metaError = error.response?.data?.error || error.message;
  console.log('ERROR:', JSON.stringify(metaError, null, 2));
}

await mongoose.disconnect();
