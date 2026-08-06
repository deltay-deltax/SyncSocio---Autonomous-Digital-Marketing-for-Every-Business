import express from 'express';
import { validatePost, schedulePost, getPostHistory, directPublish, smartSchedulePosts, recommendSchedulePosts } from '../controllers/postController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload, validateFileContent } from '../middleware/uploadMiddleware.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import { validatePostSchema, schedulePostSchema, directPublishSchema, recommendScheduleSchema, smartScheduleSchema } from '../validators/postSchemas.js';

const router = express.Router();

// GET /api/posts/history — Fetch past posts
router.get('/history', protect, getPostHistory);

// POST /api/posts/validate — Upload + analyze a post
router.post('/validate', protect, upload.array('files', 10), validateFileContent, validate({ body: validatePostSchema }), validatePost);

// POST /api/posts/publish-direct — Skip optimization, just post
router.post('/publish-direct', protect, upload.array('files', 10), validateFileContent, validate({ body: directPublishSchema }), directPublish);

// POST /api/posts/schedule/:id — Trigger auto-publish
router.post('/schedule/:id', protect, validate({ params: idParamSchema, body: schedulePostSchema }), schedulePost);

// POST /api/posts/smart-schedule — Multi-post intelligent scheduler
router.post('/smart-schedule', protect, validate({ body: smartScheduleSchema }), smartSchedulePosts);

// POST /api/posts/recommend-schedule — Pre-compute AI scheduling recommendations
router.post('/recommend-schedule', protect, validate({ body: recommendScheduleSchema }), recommendSchedulePosts);

export default router;
