import 'dotenv/config';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first'); // Force IPv4 globally to fix Render IPv6 ENETUNREACH for Gmail
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
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
import emailSetupRoutes from './routes/emailSetupRoutes.js';
import creditsRoutes from './routes/creditsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import siteRoutes from './routes/siteRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import avatarRoutes from './routes/avatarRoutes.js';
import leadScraperRoutes from './routes/lead_scraper.js';
import {
  receiveInstagramWebhook,
  verifyInstagramWebhook,
  seedWebhookCache,
} from './controllers/instagramWebhookController.js';
import { startPolling } from './services/commentPoller.js';

// import { startStrategicPoller } from './utils/strategicPoller.js';
import { startKeepAlivePoller } from './utils/keepAlivePoller.js';
import { startMetricsPoller } from './services/metricsPoller.js';
import { startInstagramScheduler } from './services/instagramScheduler.js';

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://www.syncsocio.com',
    'https://syncsocio.com',
    'http://localhost:4173',
    'https://www.velocitydm.com',
    'https://velocitydm.com',
    process.env.FRONTEND_URL,
    process.env.FRONTEND_BASE_URL
  ].filter(Boolean),
  credentials: true
}));
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
app.use('/api/promotions', adsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/strategy-assets', strategyAssetRoutes);
app.use('/api/products', productRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/campaigns', emailSetupRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/site', siteRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/avatars', avatarRoutes);
app.use('/api/admin/scraper', leadScraperRoutes);

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
      
      // Drop the unique user_1 index on brandprofiles dynamically if it exists
      mongoose.connection.db.collection('brandprofiles').dropIndex('user_1').then(() => {
        console.log('Successfully dropped unique user_1 index on brandprofiles');
      }).catch((err) => {
        // Safe to ignore if index does not exist or has already been dropped
      });

      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        // Seed in-memory webhook dedup caches from DB (prevents double-sends after restarts)
        seedWebhookCache();
        // Start polling for Instagram comments (bypasses webhook delivery issues)
        startPolling();
        // Start autonomous strategic audit agent
        // startStrategicPoller();
        // Start keep-alive pingers for Render free tier
        startKeepAlivePoller();
        // Start Meta metrics background caching
        startMetricsPoller();
        // Start Instagram native scheduler background queue
        startInstagramScheduler();
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

export default app;
