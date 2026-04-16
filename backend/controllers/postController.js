import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import PostAnalysis from '../models/PostAnalysis.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// POST /api/posts/validate
export const validatePost = async (req, res) => {
  try {
    const { contentType, description } = req.body;
    const userId = req.user._id.toString();
    const file = req.file;

    if (!contentType || !description) {
      return res.status(400).json({ message: 'Content type and description are required.' });
    }

    // Forward to Python AI service with the file
    const form = new FormData();
    form.append('userId', userId);
    form.append('contentType', contentType);
    form.append('description', description);

    if (file) {
      form.append('file', fs.createReadStream(file.path), {
        filename: file.originalname,
        contentType: file.mimetype
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

    res.status(200).json(aiResponse.data);
  } catch (error) {
    console.error('Schedule Post Error:', error?.response?.data || error.message);
    res.status(500).json({
      message: 'Error scheduling post',
      detail: error?.response?.data?.detail || error.message
    });
  }
};
