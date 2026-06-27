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
import adsRoutes from './routes/adsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import strategyAssetRoutes from './routes/strategyAssetRoutes.js';
import productRoutes from './routes/productRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import creditsRoutes from './routes/creditsRoutes.js';
import {
  receiveInstagramWebhook,
  verifyInstagramWebhook,
} from './controllers/instagramWebhookController.js';
import { startPolling } from './services/commentPoller.js';

import { startStrategicPoller } from './utils/strategicPoller.js';
import { startKeepAlivePoller } from './utils/keepAlivePoller.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true, parameterLimit: 200000 }));

// Serve static uploads with public caching
app.use('/uploads', express.static('uploads', {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
}));

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
app.use('/api/ads', adsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/strategy-assets', strategyAssetRoutes);
app.use('/api/products', productRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/credits', creditsRoutes);

// Basic health check route
app.get('/', (req, res) => {
  res.send('SyncSocio Backend is running');
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
        // Start keep-alive pingers for Render free tier
        startKeepAlivePoller();
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
