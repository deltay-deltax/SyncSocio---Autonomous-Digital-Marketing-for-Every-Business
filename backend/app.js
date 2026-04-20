import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import waitlistRoutes from './routes/waitlistRoutes.js';
import instagramRoutes from './routes/instagramRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import postRoutes from './routes/postRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import instagramMetricsRoutes from './routes/instagramMetricsRoutes.js';
import dmFlowRoutes from './routes/dmFlowRoutes.js';
import {
  receiveInstagramWebhook,
  verifyInstagramWebhook,
} from './controllers/instagramWebhookController.js';
import { startPolling } from './services/commentPoller.js';

import { startStrategicPoller } from './utils/strategicPoller.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true, parameterLimit: 200000 }));

// Compatibility webhook routes. Meta setups often use "/webhook" directly;
// keep these in sync with "/api/auth/instagram/webhook" routes.
app.get('/webhook', verifyInstagramWebhook);
app.post('/webhook', receiveInstagramWebhook);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/auth/instagram', instagramRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/instagram', instagramMetricsRoutes);
app.use('/api/dm-flows', dmFlowRoutes);

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
        // Start polling for Instagram comments (bypasses webhook delivery issues)
        startPolling();
        // Start autonomous strategic audit agent
        startStrategicPoller();
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
