import axios from 'axios';
import BrandProfile from '../models/BrandProfile.js';
import ContentCalendar from '../models/ContentCalendar.js';

export const generateStrategy = async (req, res) => {
  try {
    const profile = await BrandProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: 'Brand profile not found' });

    // 1. Send data to Python AI service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    const response = await axios.post(`${aiServiceUrl}/generate-strategy`, {
      userId: req.user._id.toString(),
      brandName: profile.brandName,
      businessCategory: profile.businessCategory,
      mainGoal: profile.mainGoal,
      targetAudiences: profile.targetAudiences,
      brandTone: profile.brandTone,
      visualVibe: profile.visualVibe,
      contentMix: profile.contentMix,
      socialPlatforms: profile.socialPlatforms,
      primaryColor: profile.primaryColor,
      secondaryColor: profile.secondaryColor,
      productBrief: req.body.productBrief,
      suggestedMix: req.body.suggestedMix
    });

    // Strategy is already saved to Mongo by the Python service
    // We just return it to the frontend
    res.status(200).json(response.data);
  } catch (error) {
    console.error('AI Strategy Error:', error);
    res.status(500).json({ message: 'Error generating content strategy' });
  }
};

export const getCalendar = async (req, res) => {
  try {
    const calendars = await ContentCalendar.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    
    if (!calendars || calendars.length === 0) {
      return res.status(404).json({ message: 'No strategy found' });
    }

    res.status(200).json(calendars[0]); // Return the latest one
  } catch (error) {
    res.status(500).json({ message: 'Error fetching calendar' });
  }
};

import { overlayText } from '../utils/visualOptimizer.js';

export const processVisual = async (req, res) => {
  try {
    const { image, metadata, brandColors } = req.body;
    
    if (!image) {
      return res.status(400).json({ message: 'Image data is required' });
    }

    // Convert base64 to buffer if needed
    let inputBuffer = image;
    if (typeof image === 'string' && image.includes('base64,')) {
      inputBuffer = Buffer.from(image.split('base64,')[1], 'base64');
    } else if (typeof image === 'string') {
      inputBuffer = Buffer.from(image, 'base64');
    }

    const processedBuffer = await overlayText(inputBuffer, {
      ...metadata,
      primaryColor: brandColors?.primary || '#ffffff',
      secondaryColor: brandColors?.secondary || '#f0f0f0'
    });

    const processedBase64 = `data:image/png;base64,${processedBuffer.toString('base64')}`;
    
    res.status(200).json({ image: processedBase64 });
  } catch (error) {
    console.error('Visual Process Error:', error);
    res.status(500).json({ message: 'Error processing visual overlay' });
  }
};

