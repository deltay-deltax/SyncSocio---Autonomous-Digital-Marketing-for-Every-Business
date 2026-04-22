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

    res.status(200).json(aiResponse.data);
  } catch (error) {
    console.error('Post Validation Error:', error?.response?.data || error.message);
    res.status(500).json({
      message: 'Error analyzing post',
      detail: error?.response?.data?.detail || error.message
    });
  }
};

// POST /api/posts/schedule/:id
export const schedulePost = async (req, res) => {
  try {
    const { id } = req.params;

    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/schedule-post/${id}`,
      {},
      { timeout: 120000 }
    );

    // Notify user
    await createNotification(
      req.user._id,
      'scheduled',
      'Post Scheduled',
      `Your post is successfully scheduled for ${aiResponse.data.scheduledAt || 'auto-publishing'}.`
    );

    res.status(200).json(aiResponse.data);
  } catch (error) {
    console.error('Schedule Post Error:', error?.response?.data || error.message);
    res.status(500).json({
      message: 'Error scheduling post',
      detail: error?.response?.data?.detail || error.message
    });
  }
};

// GET /api/posts/history
export const getPostHistory = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const history = await PostAnalysis.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.status(200).json(history);
  } catch (error) {
    console.error('Get History Error:', error.message);
    res.status(500).json({ message: 'Error fetching post history' });
  }
};
