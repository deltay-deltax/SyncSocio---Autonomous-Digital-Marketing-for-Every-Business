import express from 'express';
import VisitorLog from '../models/VisitorLog.js';

const router = express.Router();

// POST /api/analytics/visit
router.post('/visit', async (req, res) => {
  try {
    const { sessionToken, path } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // We only log if sessionToken is provided, and we can debounce or unique check if needed
    // But since frontend handles sending once per session, we just insert.
    await VisitorLog.create({
      ipAddress,
      userAgent,
      path: path || '/',
      sessionToken: sessionToken || 'unknown',
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging visit:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
