import express from 'express';
import { validatePost, schedulePost, getPostHistory, directPublish } from '../controllers/postController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// GET /api/posts/history — Fetch past posts
router.get('/history', protect, getPostHistory);

// POST /api/posts/validate — Upload + analyze a post
router.post('/validate', protect, upload.array('files', 10), validatePost);

// POST /api/posts/publish-direct — Skip optimization, just post
router.post('/publish-direct', protect, upload.array('files', 10), directPublish);

// POST /api/posts/schedule/:id — Trigger auto-publish
router.post('/schedule/:id', protect, schedulePost);

export default router;
