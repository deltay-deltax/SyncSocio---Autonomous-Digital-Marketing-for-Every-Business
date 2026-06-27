import 'dotenv/config';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const brandProfile = await mongoose.connection.db.collection('brandprofiles').findOne({ brandName: "MiniMalist" });
    if (!brandProfile) {
      console.log("No MiniMalist brand profile found");
      process.exit(1);
    }

    const userId = String(brandProfile.user);
    console.log("Generating JWT for user ID:", userId);
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your_super_secret_jwt_key', { expiresIn: '1d' });

    console.log("Calling GET /api/instagram/metrics...");
    const start = Date.now();
    const res = await axios.get("http://localhost:5050/api/instagram/metrics", {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Response received in ${((Date.now() - start)/1000).toFixed(2)}s:`, JSON.stringify(res.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error("Error Status:", error.response.status);
      console.error("Error Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error Message:", error.message);
    }
  } finally {
    process.exit(0);
  }
});
