import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import PostAnalysis from '../models/PostAnalysis.js';
import { createNotification } from '../utils/notificationHelper.js';
import { logActivity } from '../utils/activityLogger.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// POST /api/posts/validate
export const validatePost = async (req, res) => {
  const startTime = Date.now();
  try {
    const { contentType, description } = req.body;
    const userId = req.user._id.toString();
    const uploadedFiles = req.files || [];

    // Log active
    await logActivity(userId, 'G-Factor', 'Analysis started for pending content...', 'active');

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
      { headers: form.getHeaders(), timeout: 900000 } // 2 min timeout
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
    await logActivity(userId, 'G-Factor', `Analysis complete for pending ${contentType}. Optimized in ${duration}.`, 'done', duration);

    // Notify user that analysis is complete
    await createNotification(
      req.user._id,
      'success',
      'Analysis Complete',
      `Your ${contentType} has been optimized and is ready for publishing.`
    );

    res.status(200).json(aiResponse.data);
  } catch (error) {
    console.error('Post Validation Error:', error?.response?.data || error.message);
    await logActivity(req.user._id.toString(), 'G-Factor', `Analysis failed: ${error.message}`, 'error');
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
    const { scheduledAt, platforms } = req.body;
    
    // Ensure user cannot schedule past their plan expiration date
    if (scheduledAt && req.user.planExpiresAt) {
      if (new Date(scheduledAt) > new Date(req.user.planExpiresAt)) {
        return res.status(400).json({ message: 'You cannot schedule posts beyond your current plan expiration date. Please renew or upgrade your plan to schedule further ahead.' });
      }
    }

    const post = await PostAnalysis.findOne({ _id: id, userId: req.user._id });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.status = 'scheduled';
    post.isScheduled = !!scheduledAt;
    if (scheduledAt) post.scheduledAt = new Date(scheduledAt);
    if (platforms) post.platforms = platforms;
    await post.save();

    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/schedule-post/${id}`,
      { platforms, scheduledAt },
      { timeout: 900000 }
    );

    const isSuccess = aiResponse.data.status === 'published';
    
    if (isSuccess) {
      post.status = 'published';
      post.isScheduled = false;
      await post.save();

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
      { headers: form.getHeaders(), timeout: 900000 }
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
    const brandId = req.user.activeBrandId;
    const BrandProfile = (await import('../models/BrandProfile.js')).default;
    const defaultBrand = await BrandProfile.findOne({ user: userId }).sort({ createdAt: 1 });
    const isDefaultBrand = defaultBrand && String(defaultBrand._id) === String(brandId);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    let query = { userId };
    if (isDefaultBrand) {
      query.$or = [{ brandId }, { brandId: { $exists: false } }, { brandId: null }];
    } else {
      query.brandId = brandId;
    }

    const history = await PostAnalysis.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await PostAnalysis.countDocuments(query);
    
    res.status(200).json({
      data: history,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get History Error:', error.message);
    res.status(500).json({ message: 'Error fetching post history' });
  }
};

// POST /api/posts/recommend-schedule
export const recommendSchedulePosts = async (req, res) => {
  try {
    const { postIds, startDate, endDate, platforms } = req.body;
    const userId = req.user._id;

    // Ensure user cannot schedule past their plan expiration date
    if (endDate && req.user.planExpiresAt) {
      if (new Date(endDate) > new Date(req.user.planExpiresAt)) {
        return res.status(400).json({ message: 'You cannot schedule posts beyond your current plan expiration date. Please adjust the end date or renew your plan.' });
      }
    }

    const BrandProfile = (await import('../models/BrandProfile.js')).default;
    const StrategyCreative = (await import('../models/StrategyCreative.js')).default;

    const brandProfile = await BrandProfile.findOne({ user: userId, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: userId });
    if (!brandProfile) {
      return res.status(404).json({ message: 'Brand profile not found' });
    }

    const creatives = await StrategyCreative.find({
      _id: { $in: postIds },
      user: userId,
      status: { $in: ['hearted', 'scheduled', 'posted'] }
    });
    console.log('[DEBUG] recommendSchedule incoming postIds:', postIds);
    console.log('[DEBUG] recommendSchedule fetched creatives count:', creatives.length);
    if (creatives.length > 0) {
       console.log('[DEBUG] First creative fetched:', creatives[0]._id, creatives[0].status, creatives[0].user);
    }

    if (creatives.length === 0) {
      return res.status(400).json({ message: 'No valid creatives found to recommend schedules for.' });
    }

    // Fetch online followers activity (ground reality metrics)
    const accessToken = brandProfile.instagramAccessToken;
    const igId = brandProfile.instagramBusinessAccountId;
    let hourly_data = [];

    if (accessToken && igId) {
      try {
        const API_BASE = 'https://graph.facebook.com/v25.0';
        const insRes = await axios.get(`${API_BASE}/${igId}/insights`, {
          params: {
            metric: 'online_followers',
            period: 'lifetime',
            access_token: accessToken
          }
        });
        const metrics = insRes.data?.data;
        const onlineMetric = metrics?.find(m => m.name === 'online_followers');
        if (onlineMetric && onlineMetric.values && onlineMetric.values.length > 0) {
          const hours = onlineMetric.values[0].value;
          for (let i = 0; i < 24; i++) {
            hourly_data.push({
              hour: i,
              value: hours[i.toString()] || 0
            });
          }
        }
      } catch (e) {
        console.warn('Skipping hourly insights fetch in recommend schedule:', e.message);
      }
    }

    // Call python scheduler agent
    const payload = {
      brand_info: brandProfile,
      posts: creatives,
      startDate,
      endDate,
      platforms,
      hourly_data
    };

    console.log(`📡 Requesting schedule recommendations for ${creatives.length} posts...`);
    const agentRes = await axios.post(`${AI_SERVICE_URL}/smart-schedule`, payload, { timeout: 900000 });
    const recommendedSchedules = agentRes.data.schedule || [];

    // Map creative thumbnails / fields so frontend has rich info
    const recommendations = recommendedSchedules.map(rec => {
      const creative = creatives.find(c => c._id.toString() === rec.id);
      return {
        ...rec,
        postId: rec.id,  // explicit postId so frontend always has the correct key
        type: creative?.type || 'image',
        idea: creative?.idea || '',
        caption: creative?.caption || '',
        thumbnailBase64: creative?.thumbnailBase64 || '',
        slides: creative?.slides || []
      };
    });

    res.status(200).json({ success: true, recommendations });
  } catch (error) {
    console.error('Recommend Schedule Posts Error:', error?.response?.data || error.message);
    res.status(500).json({
      message: 'Error recommending schedules for posts',
      detail: error?.response?.data?.detail || error.message
    });
  }
};

// POST /api/posts/smart-schedule
export const smartSchedulePosts = async (req, res) => {
  try {
    const { postIds, startDate, endDate, platforms, schedules } = req.body;
    const userId = req.user._id;

    console.log('\n=== [SMART-SCHEDULE] Request received ===');
    console.log('[SMART-SCHEDULE] userId:', userId);
    console.log('[SMART-SCHEDULE] postIds:', JSON.stringify(postIds));
    console.log('[SMART-SCHEDULE] platforms:', JSON.stringify(platforms));
    console.log('[SMART-SCHEDULE] schedules:', JSON.stringify(schedules));
    console.log('[SMART-SCHEDULE] startDate:', startDate, '| endDate:', endDate);

    // Ensure user cannot schedule past their plan expiration date
    if (req.user.planExpiresAt) {
      if (endDate && new Date(endDate) > new Date(req.user.planExpiresAt)) {
        return res.status(400).json({ message: 'You cannot schedule posts beyond your current plan expiration date. Please adjust the end date or renew your plan.' });
      }
      if (schedules && schedules.length > 0) {
        for (const s of schedules) {
          if (new Date(s.scheduledAt) > new Date(req.user.planExpiresAt)) {
            return res.status(400).json({ message: 'One or more posts are scheduled beyond your current plan expiration date.' });
          }
        }
      }
    }

    const BrandProfile = (await import('../models/BrandProfile.js')).default;
    const StrategyCreative = (await import('../models/StrategyCreative.js')).default;
    const { writeCreativeToFiles } = await import('../utils/tempWriter.js');

    const brandProfile = await BrandProfile.findOne({ user: userId, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: userId });
    if (!brandProfile) {
      console.log('[SMART-SCHEDULE] ❌ No brand profile found for user:', userId);
      return res.status(404).json({ message: 'Brand profile not found' });
    }
    console.log('[SMART-SCHEDULE] ✅ Brand profile found:', brandProfile._id);

    const creatives = await StrategyCreative.find({
      _id: { $in: postIds },
      user: userId,
      status: { $in: ['hearted', 'scheduled', 'posted'] }
    });

    console.log('[SMART-SCHEDULE] Queried postIds count:', postIds?.length);
    console.log('[SMART-SCHEDULE] Found creatives count:', creatives.length);
    if (creatives.length === 0) {
      // Extra debug: check if they exist at all (without status filter)
      const anyCreatives = await StrategyCreative.find({ _id: { $in: postIds }, user: userId });
      console.log('[SMART-SCHEDULE] ❌ No creatives with valid status. Found WITHOUT status filter:', anyCreatives.length);
      anyCreatives.forEach(c => console.log(`  - _id: ${c._id}, status: ${c.status}`));
      return res.status(400).json({ message: 'No valid creatives found to schedule.' });
    }
    creatives.forEach(c => console.log(`[SMART-SCHEDULE] Creative: ${c._id}, status: ${c.status}, type: ${c.type}`));

    let recommendedSchedules = schedules;
    console.log('[SMART-SCHEDULE] Using provided schedules:', recommendedSchedules?.length ?? 0, 'items');

    if (!recommendedSchedules || recommendedSchedules.length === 0) {
      // Fetch online followers activity (ground reality metrics)
      const accessToken = brandProfile.instagramAccessToken;
      const igId = brandProfile.instagramBusinessAccountId;
      let hourly_data = [];

      if (accessToken && igId) {
        try {
          const API_BASE = 'https://graph.facebook.com/v25.0';
          const insRes = await axios.get(`${API_BASE}/${igId}/insights`, {
            params: {
              metric: 'online_followers',
              period: 'lifetime',
              access_token: accessToken
            }
          });
          const metrics = insRes.data?.data;
          const onlineMetric = metrics?.find(m => m.name === 'online_followers');
          if (onlineMetric && onlineMetric.values && onlineMetric.values.length > 0) {
            const hours = onlineMetric.values[0].value;
            for (let i = 0; i < 24; i++) {
              hourly_data.push({
                hour: i,
                value: hours[i.toString()] || 0
              });
            }
          }
        } catch (e) {
          console.warn('Skipping hourly insights fetch in smart schedule:', e.message);
        }
      }

      // Call python scheduler agent
      const payload = {
        brand_info: brandProfile,
        posts: creatives,
        startDate,
        endDate,
        platforms,
        hourly_data
      };

      console.log(`📡 Requesting schedule recommendations for ${creatives.length} posts...`);
      const agentRes = await axios.post(`${AI_SERVICE_URL}/smart-schedule`, payload, { timeout: 900000 });
      recommendedSchedules = agentRes.data.schedule || [];
    }

    const results = [];

    // Save each scheduled post and call publish service
    console.log('[SMART-SCHEDULE] Processing', recommendedSchedules.length, 'schedule items...');
    for (const recommendation of recommendedSchedules) {
      // Support both `id` (from AI agent) and `postId` (from frontend direct submit)
      const matchId = recommendation.postId || recommendation.id;
      console.log('[SMART-SCHEDULE] Looking up creative for matchId:', matchId);
      const creative = creatives.find(c => c._id.toString() === matchId);
      if (!creative) {
        console.log('[SMART-SCHEDULE] ❌ No creative found for matchId:', matchId, '| Available IDs:', creatives.map(c => c._id.toString()));
        continue;
      }
      console.log('[SMART-SCHEDULE] ✅ Matched creative:', creative._id, 'type:', creative.type);

      // Decode base64 images and save to temp files
      const filePaths = await writeCreativeToFiles(creative);

      // Create new PostAnalysis record
      const postAnalysis = await PostAnalysis.create({
        userId: userId,
        brandId: req.user.activeBrandId,
        mediaUrl: filePaths[0] || '',
        mediaUrls: filePaths,
        contentType: creative.type === 'image' ? 'static' : (creative.type === 'video' ? 'reel' : 'carousel'),
        description: creative.caption,
        growthFactor: 0,
        analysis: {
          strengths: recommendation.logic || [],
          weaknesses: [],
          recommendations: [recommendation.reason],
          seoKeywords: []
        },
        isScheduled: true,
        status: 'scheduled',
        scheduledAt: new Date(recommendation.scheduledAt),
        platforms: platforms,
        isAgentAssisted: true
      });

      // Triggers publishing to Meta Graph API
      try {
        console.log(`Scheduling post ${postAnalysis._id} on Meta for time ${recommendation.scheduledAt}`);
        const aiResponse = await axios.post(
          `${AI_SERVICE_URL}/schedule-post/${postAnalysis._id}`,
          { platforms, scheduledAt: recommendation.scheduledAt },
          { timeout: 900000 }
        );

        if (aiResponse.data.status === 'failed') {
          postAnalysis.status = 'failed';
          await postAnalysis.save();
          results.push({ id: creative._id, status: 'failed', error: aiResponse.data.error });
        } else {
          // Meta scheduling accepted! Move creative status out of hearted list
          const isDirect = aiResponse.data.status === 'published';
          if (isDirect) {
            creative.status = 'posted';
            postAnalysis.status = 'published';
            postAnalysis.isScheduled = false;
          } else {
            creative.status = 'scheduled';
            creative.scheduledAt = new Date(recommendation.scheduledAt);
          }
          await creative.save();
          await postAnalysis.save();
          
          await createNotification(
            userId,
            isDirect ? 'success' : 'scheduled',
            isDirect ? 'Post Live! 🚀' : 'Post Scheduled! 📅',
            isDirect 
              ? `Your ${creative.type} was published directly to your platforms.`
              : `Your ${creative.type} is successfully scheduled for ${new Date(recommendation.scheduledAt).toLocaleString('en-IN')}.`
          );

          results.push({ 
            id: creative._id, 
            status: isDirect ? 'published' : 'scheduled', 
            scheduledAt: recommendation.scheduledAt 
          });
        }
      } catch (err) {
        console.error(`[SMART-SCHEDULE] ❌ Error scheduling post ${postAnalysis._id} via python agent:`, err.message);
        postAnalysis.status = 'failed';
        await postAnalysis.save();
        results.push({ id: creative._id, status: 'failed', error: err.message });
      }
    }

    console.log('[SMART-SCHEDULE] ✅ Done. Results:', JSON.stringify(results));
    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('Smart Schedule Posts Error:', error?.response?.data || error.message);
    res.status(500).json({
      message: 'Error smart scheduling posts',
      detail: error?.response?.data?.detail || error.message
    });
  }
};

