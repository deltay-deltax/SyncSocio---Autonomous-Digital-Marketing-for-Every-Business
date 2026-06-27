import 'dotenv/config';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const brandProfile = await mongoose.connection.db.collection('brandprofiles').findOne({ brandName: "Amazon Web Services (AWS)" });
    if (!brandProfile) {
      console.log("No AWS brand profile found");
      process.exit(1);
    }

    const userId = String(brandProfile.user);
    console.log("Generating JWT for user ID:", userId);
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your_super_secret_jwt_key', { expiresIn: '1d' });

    console.log("Calling GET /api/instagram/metrics (directly executing backend code)...");
    const start = Date.now();
    
    // Instead of localhost:5050 (which is running the old server), let's import the route handlers or make the HTTP request to the running server to see if it throws 500.
    try {
      const res = await axios.get("http://localhost:5050/api/instagram/metrics", {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`Response received in ${((Date.now() - start)/1000).toFixed(2)}s:`, JSON.stringify(res.data, null, 2));
    } catch (err) {
      console.error("HTTP Request Error:", err.response?.status, JSON.stringify(err.response?.data, null, 2));
    }
  } catch (error) {
    console.error("Test execution error:", error);
  } finally {
    process.exit(0);
  }
});
