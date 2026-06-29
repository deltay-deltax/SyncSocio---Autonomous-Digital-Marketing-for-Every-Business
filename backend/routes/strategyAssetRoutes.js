import express from 'express';
import StrategyCreative from '../models/StrategyCreative.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  uploadBase64ToCloudinary,
  uploadCarouselSlidesToCloudinary,
  uploadVideoUrlToCloudinary,
  deleteFromCloudinary,
} from '../utils/cloudinaryUpload.js';

const router = express.Router();

// POST /api/strategy-assets — heart/save a creative
router.post('/', protect, async (req, res) => {
  try {
    const { type, thumbnailBase64, slides, videoUrl, caption, idea, aspectRatio } = req.body;

    let thumbnailUrl = '';
    let savedSlides = slides || [];
    let savedVideoUrl = videoUrl || '';

    // Upload thumbnail to Cloudinary (skip if already a URL)
    if (thumbnailBase64 && !thumbnailBase64.startsWith('http')) {
      try {
        thumbnailUrl = await uploadBase64ToCloudinary(thumbnailBase64, 'syncsocio/creatives');
      } catch (uploadErr) {
        console.error('[StrategyAssets] Cloudinary thumb upload failed:', uploadErr.message);
        thumbnailUrl = thumbnailBase64; // fallback
      }
    } else {
      thumbnailUrl = thumbnailBase64 || '';
    }

    // Upload carousel slides to Cloudinary
    if (type === 'carousel' && Array.isArray(slides) && slides.length > 0) {
      try {
        savedSlides = await uploadCarouselSlidesToCloudinary(slides, 'syncsocio/carousels');
      } catch (uploadErr) {
        console.error('[StrategyAssets] Cloudinary slides upload failed:', uploadErr.message);
        savedSlides = slides; // fallback
      }
    }

    // Upload video file to Cloudinary for permanent storage
    if (type === 'video' && videoUrl && videoUrl.startsWith('http')) {
      try {
        console.log('[StrategyAssets] Uploading generated video to Cloudinary for permanent storage:', videoUrl);
        savedVideoUrl = await uploadVideoUrlToCloudinary(videoUrl, 'syncsocio/videos');
      } catch (uploadErr) {
        console.error('[StrategyAssets] Cloudinary video upload failed:', uploadErr.message);
        savedVideoUrl = videoUrl; // fallback
      }
    }

    const creative = await StrategyCreative.create({
      user: req.user._id,
      brandId: req.user.activeBrandId,
      type,
      thumbnailBase64: thumbnailUrl,
      slides: savedSlides,
      videoUrl: savedVideoUrl,
      caption: caption || '',
      idea: idea || '',
      aspectRatio: aspectRatio || '1:1',
      status: 'hearted',
    });

    const { createNotification } = await import('../utils/notificationHelper.js');
    await createNotification(
      req.user._id,
      'success',
      'Creative Saved to Library',
      `A new ${type} creative has been successfully added to your Asset Library.`
    );

    const { logActivity } = await import('../utils/activityLogger.js');
    const isVideo = type === 'video';
    const agentName = isVideo ? 'Video Agent' : 'Creative Agent';
    await logActivity(
      req.user._id,
      agentName,
      `Saved new ${type} creative to Asset Library.`,
      'done'
    );

    res.status(201).json({ success: true, creative });
  } catch (err) {
    console.error('[StrategyAssets] Save error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/strategy-assets — list all hearted creatives for the authed user
router.get('/', protect, async (req, res) => {
  try {
    const brandId = req.user.activeBrandId;
    const BrandProfile = (await import('../models/BrandProfile.js')).default;
    const defaultBrand = await BrandProfile.findOne({ user: req.user._id }).sort({ createdAt: 1 });

    let query = { 
      user: req.user._id,
      status: { $in: ['hearted', 'scheduled', 'posted'] }
    };
    if (defaultBrand && String(defaultBrand._id) === String(brandId)) {
      query.$or = [{ brandId }, { brandId: { $exists: false } }];
    } else {
      query.brandId = brandId;
    }

    const creatives = await StrategyCreative.find(query).sort({ createdAt: -1 });
    res.json({ success: true, creatives });
  } catch (err) {
    console.error('[StrategyAssets] List error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/strategy-assets/:id — remove from library
router.delete('/:id', protect, async (req, res) => {
  try {
    const creative = await StrategyCreative.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    // Clean up Cloudinary assets (non-critical — don't fail request if this errors)
    if (creative) {
      if (creative.thumbnailBase64 && creative.thumbnailBase64.startsWith('http')) {
        deleteFromCloudinary(creative.thumbnailBase64).catch(() => {});
      }
      if (creative.videoUrl && creative.videoUrl.startsWith('http')) {
        deleteFromCloudinary(creative.videoUrl).catch(() => {});
      }
      if (creative.slides?.length) {
        creative.slides.forEach(s => {
          if (s.image?.startsWith('http')) deleteFromCloudinary(s.image).catch(() => {});
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

