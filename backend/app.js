import 'dotenv/config';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first'); // Force IPv4 globally to fix Render IPv6 ENETUNREACH for Gmail
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import waitlistRoutes from './routes/waitlistRoutes.js';
import instagramRoutes from './routes/instagramRoutes.js';
import { responseFormatter } from './middleware/responseFormatter.js';
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
import nexaRoutes from './routes/nexaRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import {
  receiveInstagramWebhook,
  verifyInstagramWebhook,
  seedWebhookCache,
} from './controllers/instagramWebhookController.js';
import { publicRateLimiter, authenticatedRateLimiter } from './middleware/rateLimitMiddleware.js';
import { startPolling } from './services/commentPoller.js';

// import { startStrategicPoller } from './utils/strategicPoller.js';
import { startKeepAlivePoller } from './utils/keepAlivePoller.js';
import { startMetricsPoller } from './services/metricsPoller.js';
import { startInstagramScheduler } from './services/instagramScheduler.js';
import { startNexaNudgeScheduler } from './services/nexaNudgeScheduler.js';

const app = express();

// Trust first proxy (Railway / Render) so req.ip reflects the real client IP
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://www.syncsocio.com',
    'https://syncsocio.com',
    'http://localhost:4173',
    'http://localhost:5174',
    'http://localhost:5175',
    'https://www.syncsocio.com',
    'https://syncsocio.com',
    process.env.FRONTEND_URL,
    process.env.FRONTEND_BASE_URL
  ].filter(Boolean),
  credentials: true
}));

// --- SECURITY FIX: Reduced payload limits to prevent OOM / DoS ---
// Standard API payloads should never exceed a few MBs. 
// Large file uploads should use multipart/form-data via Multer.
app.use(express.json({ 
  limit: '5mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ limit: '5mb', extended: true }));
// ---------------------------------------------------------------

app.use(cookieParser());

// Static uploads serving has been removed for security (isolated storage).

// Compatibility webhook routes. Meta setups often use "/webhook" directly;
// keep these in sync with "/api/auth/instagram/webhook" routes.
app.get('/webhook', verifyInstagramWebhook);
app.post('/webhook', receiveInstagramWebhook);

// Routes
app.use('/api', responseFormatter);
// ── Auth routes (have their own strict rate limiters applied per-route) ──
app.use('/api/auth', authRoutes);
app.use('/api/auth/instagram', instagramRoutes);

// ── Admin routes (no rate limiting — admin-only system) ──
app.use('/api/admin', adminRoutes);
app.use('/api/admin/scraper', leadScraperRoutes);

// ── Public routes (moderate rate limiting) ──
app.use('/api/waitlist', publicRateLimiter, waitlistRoutes);
app.use('/api/analytics', publicRateLimiter, analyticsRoutes);
app.use('/api/site', publicRateLimiter, siteRoutes);
app.use('/api/leads', publicRateLimiter, leadRoutes);

// ── Authenticated routes (loose rate limiting) ──
app.use('/api/profile', authenticatedRateLimiter, profileRoutes);
app.use('/api/dashboard', authenticatedRateLimiter, dashboardRoutes);
app.use('/api/ai', authenticatedRateLimiter, aiRoutes);
app.use('/api/posts', authenticatedRateLimiter, postRoutes);
app.use('/api/instagram', authenticatedRateLimiter, instagramMetricsRoutes);
app.use('/api/dm-flows', authenticatedRateLimiter, dmFlowRoutes);
app.use('/api/promotions', authenticatedRateLimiter, adsRoutes);
app.use('/api/notifications', authenticatedRateLimiter, notificationRoutes);
app.use('/api/assets', authenticatedRateLimiter, assetRoutes);
app.use('/api/strategy-assets', authenticatedRateLimiter, strategyAssetRoutes);
app.use('/api/products', authenticatedRateLimiter, productRoutes);
app.use('/api/campaigns', authenticatedRateLimiter, campaignRoutes);
app.use('/api/campaigns', authenticatedRateLimiter, emailSetupRoutes);
app.use('/api/credits', authenticatedRateLimiter, creditsRoutes);
app.use('/api/coupons', authenticatedRateLimiter, couponRoutes);
app.use('/api/payment', authenticatedRateLimiter, paymentRoutes);
app.use('/api/whatsapp', authenticatedRateLimiter, whatsappRoutes);
app.use('/api/avatars', authenticatedRateLimiter, avatarRoutes);
app.use('/api/nexa', authenticatedRateLimiter, nexaRoutes);
app.use('/api/support', authenticatedRateLimiter, supportRoutes);

// Basic health check route
app.get('/', (req, res) => {
  res.send('SyncSocio Backend is running');
});

import { errorHandler } from './middleware/errorHandler.js';
app.use(errorHandler);

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
        // Start Nexa DM sales agent nudge scheduler
        startNexaNudgeScheduler();
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
