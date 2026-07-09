import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from './models/User.js';

dotenv.config();

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/syncsocio');
    const user = await User.findOne({ email: 'hixeriv670@dysonc.com' });
    
    if (!user) {
      console.log('User not found');
      return;
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });
    console.log('Token generated:', token);

    // Call the API
    const API_BASE = "http://localhost:5050/api";
    const res = await fetch(`${API_BASE}/profile/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', data);

  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

test();
