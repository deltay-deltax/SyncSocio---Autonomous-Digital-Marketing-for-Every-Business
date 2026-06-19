import express from 'express';
import StrategyCreative from '../models/StrategyCreative.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/strategy-assets — heart/save a creative
router.post('/', protect, async (req, res) => {
  try {
    const { type, thumbnailBase64, slides, videoUrl, caption, idea, aspectRatio } = req.body;

    const creative = await StrategyCreative.create({
      user: req.user._id,
      type,
      thumbnailBase64: thumbnailBase64 || '',
      slides: slides || [],
      videoUrl: videoUrl || '',
      caption: caption || '',
      idea: idea || '',
      aspectRatio: aspectRatio || '1:1',
      status: 'hearted',
    });

    res.status(201).json({ success: true, creative });
  } catch (err) {
    console.error('[StrategyAssets] Save error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/strategy-assets — list all hearted creatives for the authed user
router.get('/', protect, async (req, res) => {
  try {
    const creatives = await StrategyCreative.find({
      user: req.user._id,
      status: { $in: ['hearted', 'scheduled', 'posted'] },
    }).sort({ createdAt: -1 });

    res.json({ success: true, creatives });
  } catch (err) {
    console.error('[StrategyAssets] List error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/strategy-assets/:id — remove from library
router.delete('/:id', protect, async (req, res) => {
  try {
    await StrategyCreative.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
