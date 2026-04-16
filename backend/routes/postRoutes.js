import express from 'express';
import { validatePost, schedulePost } from '../controllers/postController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// POST /api/posts/validate — Upload + analyze a post
router.post('/validate', protect, upload.single('file'), validatePost);

// POST /api/posts/schedule/:id — Trigger auto-publish
router.post('/schedule/:id', protect, schedulePost);

export default router;
