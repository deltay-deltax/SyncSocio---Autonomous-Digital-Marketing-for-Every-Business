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
      suggestedMix: req.body.suggestedMix,
      customInstruction: req.body.customInstruction || '',
      durationWeeks: req.body.durationWeeks || 1,
      // Rich brand context for the planner agent
      usp: profile.usp,
      painPoint: profile.painPoint,
      brandKeywords: profile.brandKeywords
    });

    // Strategy is already saved to Mongo by the Python service
    // We just return it to the frontend
    res.status(200).json(response.data);
  } catch (error) {
    console.error('AI Strategy Error:', error);
    res.status(500).json({ message: 'Error generating content strategy' });
  }
};

export const regenerateStrategy = async (req, res) => {
  try {
    const profile = await BrandProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: 'Brand profile not found' });

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    const response = await axios.post(`${aiServiceUrl}/regenerate-strategy`, {
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
      rejectedItems: req.body.rejectedItems || [],
      // Rich brand context
      usp: profile.usp,
      painPoint: profile.painPoint,
      brandKeywords: profile.brandKeywords,
      selectedPlan: profile.selectedPlan || 'SyncSocio Starter'
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('AI Strategy Regeneration Error:', error);
    res.status(500).json({ message: 'Error regenerating content strategy' });
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

export const toggleHeart = async (req, res) => {
  try {
    const { postId } = req.body;
    const latestCalendar = await ContentCalendar.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    
    if (!latestCalendar) {
      return res.status(404).json({ message: 'Calendar not found' });
    }
    
    const hearts = latestCalendar.heartedPostIds || [];
    const index = hearts.indexOf(postId);
    
    if (index > -1) {
      hearts.splice(index, 1);
    } else {
      hearts.push(postId);
    }
    
    latestCalendar.heartedPostIds = hearts;
    await latestCalendar.save();
    
    res.status(200).json({ heartedPostIds: hearts });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling heart' });
  }
};

// Note: Sharp.js processing removed. Text is now handled natively by AI.
export const deployStrategy = async (req, res) => {
  try {
    const { durationWeeks, posts, heartedPostIds } = req.body;
    const profile = await BrandProfile.findOne({ user: req.user._id });
    
    if (!profile) {
      return res.status(404).json({ message: 'Brand profile not found' });
    }
    
    const weeksToLock = durationWeeks || 1;
    const lockoutDate = new Date();
    lockoutDate.setDate(lockoutDate.getDate() + (weeksToLock * 7));
    
    profile.generationLockoutUntil = lockoutDate;
    profile.generationCount = (profile.generationCount || 0) + 1;
    await profile.save();
    
    if (posts && posts.length > 0) {
      const latestCalendar = await ContentCalendar.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
      if (latestCalendar) {
        latestCalendar.posts = posts;
        latestCalendar.status = 'deployed';
        if (heartedPostIds) {
          latestCalendar.heartedPostIds = heartedPostIds;
        }
        await latestCalendar.save();
      } else {
        await ContentCalendar.create({
          userId: req.user._id,
          posts: posts,
          heartedPostIds: heartedPostIds || [],
          status: 'deployed'
        });
      }
    }
    
    res.status(200).json({ 
      message: 'Strategy deployed and generation locked',
      lockoutUntil: lockoutDate
    });
  } catch (error) {
    console.error('Error deploying strategy:', error);
    res.status(500).json({ message: 'Error deploying strategy' });
  }
};

export const updateCalendarPosts = async (req, res) => {
  try {
    const { posts } = req.body;
    const latestCalendar = await ContentCalendar.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    
    if (!latestCalendar) {
      return res.status(404).json({ message: 'Calendar not found' });
    }
    
    latestCalendar.posts = posts;
    await latestCalendar.save();
    
    res.status(200).json({ message: 'Calendar updated successfully', posts: latestCalendar.posts });
  } catch (error) {
    console.error('Error updating calendar posts:', error);
    res.status(500).json({ message: 'Error updating calendar posts' });
  }
};

