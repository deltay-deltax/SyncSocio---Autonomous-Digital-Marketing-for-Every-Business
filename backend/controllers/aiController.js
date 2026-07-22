import axios from 'axios';
import BrandProfile from '../models/BrandProfile.js';
import ContentCalendar from '../models/ContentCalendar.js';
import { logActivity } from '../utils/activityLogger.js';
import crypto from 'crypto';

const asyncJobs = new Map();

export const startAsyncGeneration = async (req, res) => {
    try {
        const { endpoint, payload } = req.body;
        const jobId = crypto.randomUUID();
        
        asyncJobs.set(jobId, { status: 'processing', data: null, error: null });
        
        res.status(202).json({ jobId, status: 'processing' });
        
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        
        axios.post(`${aiServiceUrl}/${endpoint}`, payload, { timeout: 900000 }) // 15 minute timeout for long AI videos
            .then(response => {
                asyncJobs.set(jobId, { status: 'success', data: response.data, error: null });
            })
            .catch(error => {
                console.error('[AsyncJob] Error in background task:', error.message);
                const errorMsg = error.response?.data?.detail || error.message || 'Generation failed';
                asyncJobs.set(jobId, { status: 'error', data: null, error: errorMsg });
            });
            
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getAsyncJobStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = asyncJobs.get(jobId);
        
        if (!job) {
            return res.status(404).json({ error: 'Job not found or already consumed.' });
        }
        
        if (job.status !== 'processing') {
            asyncJobs.delete(jobId);
        }
        
        res.json(job);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const generateStrategy = async (req, res) => {
  try {
    const profile = await BrandProfile.findOne({ user: req.user._id, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: req.user._id });
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
      location: profile.location,
      // Rich brand context for the planner agent
      usp: profile.usp,
      painPoint: profile.painPoint,
      brandKeywords: profile.brandKeywords
    });

    // Strategy is already saved to Mongo by the Python service
    // We just return it to the frontend
    const { createNotification } = await import('../utils/notificationHelper.js');
    await createNotification(
      req.user._id,
      'success',
      'Strategy Synthesis Complete',
      `Your custom strategy for ${profile.brandName} has been generated successfully by the agent.`
    );

    await logActivity(
      req.user._id,
      'Creative Agent',
      `Generated content strategy recommendations for ${profile.brandName}.`,
      'done'
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('AI Strategy Error:', error);
    res.status(500).json({ message: 'Error generating content strategy' });
  }
};

export const regenerateStrategy = async (req, res) => {
  try {
    const profile = await BrandProfile.findOne({ user: req.user._id, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: req.user._id });
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
      location: profile.location,
      // Rich brand context
      usp: profile.usp,
      painPoint: profile.painPoint,
      brandKeywords: profile.brandKeywords,
      selectedPlan: profile.selectedPlan || 'SyncSocio Starter'
    });

    const { createNotification } = await import('../utils/notificationHelper.js');
    await createNotification(
      req.user._id,
      'success',
      'Strategy Regenerated',
      `Your strategy for ${profile.brandName} has been regenerated with new options.`
    );

    await logActivity(
      req.user._id,
      'Creative Agent',
      `Regenerated custom content strategy for ${profile.brandName}.`,
      'done'
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('AI Strategy Regeneration Error:', error);
    res.status(500).json({ message: 'Error regenerating content strategy' });
  }
};

export const getCalendar = async (req, res) => {
  try {
    const brandId = req.user.activeBrandId;
    const calendars = await ContentCalendar.find({
      userId: req.user._id,
      $or: [{ brandId }, { brandId: { $exists: false } }]
    }).sort({ createdAt: -1 });
    
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
    const brandId = req.user.activeBrandId;
    const latestCalendar = await ContentCalendar.findOne({
      userId: req.user._id,
      $or: [{ brandId }, { brandId: { $exists: false } }]
    }).sort({ createdAt: -1 });
    
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
    const profile = await BrandProfile.findOne({ user: req.user._id, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: req.user._id });
    
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
      const brandId = req.user.activeBrandId;
      const latestCalendar = await ContentCalendar.findOne({
        userId: req.user._id,
        $or: [{ brandId }, { brandId: { $exists: false } }]
      }).sort({ createdAt: -1 });
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
          brandId: req.user.activeBrandId,
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
    const brandId = req.user.activeBrandId;
    const latestCalendar = await ContentCalendar.findOne({
      userId: req.user._id,
      $or: [{ brandId }, { brandId: { $exists: false } }]
    }).sort({ createdAt: -1 });
    
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

export const generateAutopilotCampaign = async (req, res) => {
  try {
    const profile = await BrandProfile.findOne({ user: req.user._id, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: 'Brand profile not found' });

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    const response = await axios.post(`${aiServiceUrl}/generate-autopilot`, {
      userId: req.user._id.toString(),
      language: req.body.language || 'english',
      weeks: req.body.weeks || 1,
      selectedProductIds: req.body.selectedProductIds || [],
      upcomingFestivals: req.body.upcomingFestivals || []
    });

    const { createNotification } = await import('../utils/notificationHelper.js');
    await createNotification(
      req.user._id,
      'success',
      'Autopilot Campaigns Complete',
      `Your autopilot campaign for the next ${req.body.weeks} week(s) has been generated successfully.`
    );

    await logActivity(
      req.user._id,
      'Autopilot Agent',
      `Generated autopilot campaign posts for ${profile.brandName}.`,
      'done'
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('AI Autopilot Campaign Error:', error);
    res.status(500).json({ message: 'Error generating autopilot campaign' });
  }
};

