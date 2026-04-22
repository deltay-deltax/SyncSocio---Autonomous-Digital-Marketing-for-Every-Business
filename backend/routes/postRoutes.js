import express from 'express';
import { validatePost, schedulePost, getPostHistory } from '../controllers/postController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// GET /api/posts/history — Fetch past posts
router.get('/history', protect, getPostHistory);

// POST /api/posts/validate — Upload + analyze a post
router.post('/validate', protect, upload.array('files', 10), validatePost);

// POST /api/posts/schedule/:id — Trigger auto-publish
router.post('/schedule/:id', protect, schedulePost);

export default router;
