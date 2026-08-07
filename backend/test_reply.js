import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import User from './models/User.js';

async function testApi() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/syncsocio');
  
  try {
    const user = await User.findOne({});
    if (!user) throw new Error("No user found");
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });
    
    // 1. Get conversations
    const resGet = await axios.get('http://localhost:5051/api/nexa/conversations?limit=1', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const convoId = resGet.data.conversations[0]?._id;
    if (!convoId) {
      console.log('No conversation found to test reply');
      return;
    }
    
    console.log('Testing reply on convo:', convoId);
    
    // 2. Post reply
    try {
      const resPost = await axios.post(`http://localhost:5051/api/nexa/conversations/${convoId}/reply`, {
        replyText: 'Test reply from script',
        learn: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Reply Success:', resPost.status);
    } catch (apiErr) {
      console.log('API Error Status:', apiErr.response?.status);
      console.log('API Error Data:', apiErr.response?.data);
      console.log('API Error Message:', apiErr.message);
    }

  } catch (err) {
    console.error('Script Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testApi();
