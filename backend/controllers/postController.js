import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import PostAnalysis from '../models/PostAnalysis.js';
import { createNotification } from '../utils/notificationHelper.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// POST /api/posts/validate
export const validatePost = async (req, res) => {
  try {
    const { contentType, description } = req.body;
    const userId = req.user._id.toString();
    const uploadedFiles = req.files || [];

    if (!contentType || !description) {
      return res.status(400).json({ message: 'Content type and description are required.' });
    }

    // Forward to Python AI service with the files
    const form = new FormData();
    form.append('userId', userId);
    form.append('contentType', contentType);
    form.append('description', description);

    if (Array.isArray(uploadedFiles)) {
      uploadedFiles.forEach(file => {
        form.append('files', fs.createReadStream(file.path), {
          filename: file.originalname,
          contentType: file.mimetype
        });
      });
    }

    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/validate-post`,
      form,
      { headers: form.getHeaders(), timeout: 120000 } // 2 min timeout
    );

    // Notify user that analysis is complete
    await createNotification(
      req.user._id,
      'success',
      'Analysis Complete',
      `Your ${contentType} has been optimized and is ready for publishing.`
    );

    res.status(200).json(aiResponse.data);
  } catch (error) {
    // ...
  }
};

// POST /api/posts/schedule/:id
export const schedulePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt, platforms } = req.body;
    
    const post = await PostAnalysis.findById(id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.status = 'scheduled';
    post.isScheduled = !!scheduledAt;
    if (scheduledAt) post.scheduledAt = new Date(scheduledAt);
    if (platforms) post.platforms = platforms;
    await post.save();

    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/schedule-post/${id}`,
      { platforms, scheduledAt },
      { timeout: 120000 }
    );

    // Notify user based on REAL agent outcome
    const isSuccess = aiResponse.data.status === 'published';
    
    if (isSuccess) {
      await createNotification(
        req.user._id,
        'success',
        'Post Live! 🚀',
        `Your content is now live on ${platforms?.instagram ? 'Instagram' : ''}${platforms?.instagram && platforms?.facebook ? ' & ' : ''}${platforms?.facebook ? 'Facebook' : ''}.`
      );
    } else {
      await createNotification(
        req.user._id,
        'alert',
        'Publishing Failed',
        `Meta rejected the post: ${aiResponse.data.error || 'Unknown Error'}. Check your connection.`
      );
    }

    res.status(200).json(aiResponse.data);
  } catch (error) {
    console.error('Schedule Post Error:', error?.response?.data || error.message);
    res.status(500).json({
      message: 'Error scheduling post',
      detail: error?.response?.data?.detail || error.message
    });
  }
};

// POST /api/posts/publish-direct
export const directPublish = async (req, res) => {
  try {
    const { contentType, description, platforms, scheduledAt } = req.body;
    const userId = req.user._id.toString();
    const uploadedFiles = req.files || [];

    const form = new FormData();
    form.append('userId', userId);
    form.append('contentType', contentType);
    form.append('description', description);
    form.append('platforms', typeof platforms === 'string' ? platforms : JSON.stringify(platforms));
    if (scheduledAt) form.append('scheduledAt', scheduledAt);

    if (Array.isArray(uploadedFiles)) {
      uploadedFiles.forEach(file => {
        form.append('files', fs.createReadStream(file.path), {
          filename: file.originalname,
          contentType: file.mimetype
        });
      });
    }

    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/direct-publish`,
      form,
      { headers: form.getHeaders(), timeout: 120000 }
    );

    if (aiResponse.data.status === 'published') {
      await createNotification(
        req.user._id,
        'success',
        'Directly Published! 🚀',
        `Your content was sent straight to ${platforms?.instagram ? 'Instagram' : ''}${platforms?.instagram && platforms?.facebook ? ' & ' : ''}${platforms?.facebook ? 'Facebook' : ''}.`
      );
    }

    res.status(200).json(aiResponse.data);
  } catch (error) {
    console.error('Direct Publish Error:', error?.response?.data || error.message);
    res.status(500).json({
      message: 'Error in direct publishing',
      detail: error?.response?.data?.detail || error.message
    });
  }
};

// GET /api/posts/history
export const getPostHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Just get the last 50 posts, let the frontend find the nearest scheduled one
    const history = await PostAnalysis.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.status(200).json(history);
  } catch (error) {
    console.error('Get History Error:', error.message);
    res.status(500).json({ message: 'Error fetching post history' });
  }
};
