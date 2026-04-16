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
      socialPlatforms: profile.socialPlatforms
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
