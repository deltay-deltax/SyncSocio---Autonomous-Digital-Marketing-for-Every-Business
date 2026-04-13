import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import waitlistRoutes from './routes/waitlistRoutes.js';
import instagramRoutes from './routes/instagramRoutes.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/auth/instagram', instagramRoutes);

// Basic health check route
app.get('/', (req, res) => {
  res.send('Velocity AaaS Backend is running');
});

const PORT = process.env.PORT || 5050;

// Connect to MongoDB
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log('Connected to MongoDB');
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
    });
} else {
  console.warn('No MONGO_URI provided in environment variables. Starting server without DB connection.');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (No DB)`);
  });
}
