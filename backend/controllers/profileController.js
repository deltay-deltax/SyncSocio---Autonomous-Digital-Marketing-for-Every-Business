import BrandProfile from '../models/BrandProfile.js';
import MetaTester from '../models/MetaTester.js';
import User from '../models/User.js';
import AgentActivity from '../models/AgentActivity.js';
import ContentCalendar from '../models/ContentCalendar.js';
import DMConversation from '../models/DMConversation.js';
import DMFlow from '../models/DMFlow.js';
import DMFlowFollowUp from '../models/DMFlowFollowUp.js';
import Notification from '../models/Notification.js';
import PostAnalysis from '../models/PostAnalysis.js';
import { sendSignupWelcomeEmail, sendMetaTesterAdminNotification } from '../utils/sendWelcomeEmail.js';
import { createNotification } from '../utils/notificationHelper.js';
import { uploadBase64ToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryUpload.js';

const inferAuthProvider = (user) => {
  if (user?.googleId) return 'google';
  if (user?.appleId) return 'apple';
  return 'email';
};

export const createOrUpdateProfile = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ message: 'User not authenticated' });
    const profileData = { ...req.body, user: req.user._id };
    const incomingSelectedPlan = typeof req.body.selectedPlan === 'string'
      ? req.body.selectedPlan.trim()
      : '';
    
    let profile = null;
    if (req.body.createNewBrand === true) {
      profile = null;
    } else if (req.body.brandId) {
      profile = await BrandProfile.findOne({ user: req.user._id, _id: req.body.brandId });
    } else {
      profile = await BrandProfile.findOne({ user: req.user._id, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: req.user._id });
    }
    
    const hadExistingProfile = Boolean(profile);
    const previousSelectedPlan = profile?.selectedPlan?.trim() || '';
    const wasGmailConnected = profile ? profile.gmailIsConnected : false;
    const wasWhatsappConnected = profile ? profile.whatsappIsConnected : false;

    // Upload logo to Cloudinary if it's base64
    if (profileData.logo && !profileData.logo.startsWith('http')) {
      try {
        if (profile && profile.logo && profile.logo.startsWith('http')) {
          await deleteFromCloudinary(profile.logo).catch(() => {});
        }
        profileData.logo = await uploadBase64ToCloudinary(profileData.logo, 'syncsocio/logos');
      } catch (uploadErr) {
        console.error('[Profile] Cloudinary logo upload failed:', uploadErr.message);
      }
    }
    
    if (profile) {
      profile = await BrandProfile.findOneAndUpdate(
        { _id: profile._id },
        profileData,
        { returnDocument: 'after', runValidators: true }
      );
    } else {
      // Backend enforcement: Check brand limits based on user's plan
      const existingBrandsCount = await BrandProfile.countDocuments({ user: req.user._id });
      const userDoc = await User.findById(req.user._id);
      const planName = (userDoc?.plan || 'starter').toLowerCase();
      const hasPro = planName.includes('pro');
      const hasGrowth = planName.includes('growth');
      const hasAgency = planName.includes('agency');
      
      const maxBrands = hasAgency ? 8 : 1;

      if (existingBrandsCount >= maxBrands) {
        return res.status(403).json({ 
          message: `Plan limit reached. Your current plan allows a maximum of ${maxBrands} brand profile(s). Please upgrade to add more.` 
        });
      }

      profile = await BrandProfile.create(profileData);
      // Automatically set this brand as active
      await User.findByIdAndUpdate(req.user._id, { activeBrandId: profile._id });
      req.user.activeBrandId = profile._id;

      // Create notification in the Notification Center
      await createNotification(
        req.user._id,
        'success',
        'Brand Profile Created',
        `A new brand profile for ${profile.brandName} has been successfully added.`
      );
    }

    if (req.body.gmailIsConnected === true) {
      const emailStr = req.body.gmailEmail || 'Gmail';
      await createNotification(
        req.user._id,
        'success',
        wasGmailConnected ? 'Gmail Reconnected Successfully' : 'Gmail Connected Successfully',
        `Your connection to Google (${emailStr}) has been updated and all systems are online.`
      );
    }

    if (req.body.whatsappIsConnected === true) {
      const numStr = req.body.whatsappNumber || 'WhatsApp';
      await createNotification(
        req.user._id,
        'success',
        wasWhatsappConnected ? 'WhatsApp Reconnected Successfully' : 'WhatsApp Connected Successfully',
        `Your WhatsApp Business Account (${numStr}) has been linked and is ready to broadcast campaigns.`
      );
    }

    const shouldSendPlanWelcomeEmail = Boolean(incomingSelectedPlan) && incomingSelectedPlan !== previousSelectedPlan;
    if (shouldSendPlanWelcomeEmail) {
      try {
        const user = await User.findById(req.user._id).select('name email googleId appleId');
        if (user?.email) {
          const mailInfo = await sendSignupWelcomeEmail({
            to: user.email,
            name: user.name,
            provider: inferAuthProvider(user),
            plan: incomingSelectedPlan,
          });

          console.log('✅ Plan welcome email sent:', {
            to: user.email,
            selectedPlan: incomingSelectedPlan,
            messageId: mailInfo.messageId,
          });
        }
      } catch (mailError) {
        console.error('❌ Plan welcome email failed:', mailError.message);
      }
    }
    
    res.status(hadExistingProfile ? 200 : 201).json(profile);
  } catch (error) {
    console.error('Profile Error:', error);
    res.status(500).json({ message: 'Server error saving profile' });
  }
};

export const getProfile = async (req, res) => {
  try {
    let profile = null;
    if (req.user.activeBrandId) {
      profile = await BrandProfile.findOne({ user: req.user._id, _id: req.user.activeBrandId });
    }
    if (!profile) {
      profile = await BrandProfile.findOne({ user: req.user._id });
    }
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    
    const user = await User.findById(req.user._id).select('planExpiresAt credits plan email');
    const profileObj = profile.toObject();
    profileObj.userPlanExpiresAt = user?.planExpiresAt;
    profileObj.userCredits = user?.credits;
    profileObj.userPlan = user?.plan;
    profileObj.userEmail = user?.email;

    // ── Plan-derived feature flags (single source of truth) ──────────────────
    const planLower = (user?.plan || '').toLowerCase();
    const isGrowthPlan  = planLower.includes('growth');
    const isProPlan     = planLower.includes('pro');
    const isAgencyPlan = planLower.includes('agency');
    const hasDMAddon   = planLower.includes('+ dm automation');

    // Nexa is included in Pro & Growth, or available via the DM add-on
    profileObj.nexaIncluded       = isProPlan || isGrowthPlan || isAgencyPlan || hasDMAddon;
    // Base profiles get 1 brand.
    profileObj.brandLimit = isAgencyPlan ? 8 : 1;

    // Total brands this user owns (for UI enforcement)
    const totalBrands = await BrandProfile.countDocuments({ user: req.user._id });
    profileObj.totalBrands = totalBrands;
    
    // Check if there is a pending Meta Tester request
    const pendingTester = await MetaTester.findOne({ userId: req.user._id, status: 'pending' });
    
    if (pendingTester) {
      profileObj.metaTesterStatus = 'pending';
    }
    
    res.status(200).json(profileObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

export const listBrands = async (req, res) => {
  try {
    const brands = await BrandProfile.find({ user: req.user._id }).select('brandName socialHandle instagramUsername selectedPlan logo isLocked _id');
    res.json({ brands });
  } catch (error) {
    res.status(500).json({ message: 'Server error listing brands' });
  }
};

export const switchBrand = async (req, res) => {
  try {
    const { brandId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'Brand ID is required' });

    const brand = await BrandProfile.findOne({ user: req.user._id, _id: brandId });
    if (!brand) return res.status(404).json({ message: 'Brand profile not found' });
    if (brand.isLocked) return res.status(403).json({ message: 'This brand profile is locked on your current plan. Please upgrade to access it.' });

    // Update active brand ID on user
    await User.findByIdAndUpdate(req.user._id, { activeBrandId: brandId });

    res.json({ success: true, activeBrand: brand });
  } catch (error) {
    res.status(500).json({ message: 'Server error switching brands' });
  }
};

import StrategyCreative from '../models/StrategyCreative.js';
import Product from '../models/Product.js';

export const deleteBrand = async (req, res) => {
  try {
    const brandId = req.params.id;
    const userId = req.user._id;

    console.log(`[DELETE BRAND] ⚠️ Deleting brand ${brandId} for user ${userId}...`);

    const brand = await BrandProfile.findOne({ _id: brandId, user: userId });
    if (!brand) return res.status(404).json({ message: 'Brand not found' });

    // Clean up Cloudinary assets
    try {
      if (brand.logo && brand.logo.startsWith('http')) {
        await deleteFromCloudinary(brand.logo).catch(() => {});
      }
      
      const creatives = await StrategyCreative.find({ brand_id: brandId });
      for (const creative of creatives) {
        if (creative.thumbnailBase64 && creative.thumbnailBase64.startsWith('http')) {
          await deleteFromCloudinary(creative.thumbnailBase64).catch(() => {});
        }
        if (creative.slides?.length) {
          creative.slides.forEach(s => {
            if (s.image?.startsWith('http')) deleteFromCloudinary(s.image).catch(() => {});
          });
        }
      }

      const products = await Product.find({ brandId: brandId });
      for (const prod of products) {
        if (prod.imageBase64 && prod.imageBase64.startsWith('http')) {
          await deleteFromCloudinary(prod.imageBase64).catch(() => {});
        }
      }
    } catch (cleanErr) {
      console.warn('[DELETE BRAND] Cloudinary cleanup warning:', cleanErr.message);
    }

    // Wipe all related records
    await Promise.all([
      StrategyCreative.deleteMany({ brand_id: brandId }),
      Product.deleteMany({ brandId: brandId }),
      import('../models/NexaConversation.js').then(m => m.default.deleteMany({ brand_id: brandId })),
      import('../models/DMFlow.js').then(m => m.default.deleteMany({ brandId: brandId })),
      import('../models/DMFlowFollowUp.js').then(m => m.default.deleteMany({ brandId: brandId })),
    ]);

    await BrandProfile.deleteOne({ _id: brandId });

    // Reset user activeBrandId if it was this one
    const user = await User.findById(userId);
    if (user.activeBrandId && user.activeBrandId.toString() === brandId.toString()) {
      const remainingBrand = await BrandProfile.findOne({ user: userId });
      user.activeBrandId = remainingBrand ? remainingBrand._id : null;
      await user.save();
    }

    res.json({ success: true, message: 'Brand deleted permanently' });
  } catch (error) {
    console.error('[DELETE BRAND] Error:', error.message);
    res.status(500).json({ message: 'Server error deleting brand' });
  }
};

export const terminateAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(`[TERMINATE] ⚠️ Wiping all data for user ${userId}...`);

    // Clean up Cloudinary assets
    try {
      const brand = await BrandProfile.findOne({ user: userId });
      if (brand && brand.logo && brand.logo.startsWith('http')) {
        await deleteFromCloudinary(brand.logo).catch(() => {});
      }
      
      const creatives = await StrategyCreative.find({ user: userId });
      for (const creative of creatives) {
        if (creative.thumbnailBase64 && creative.thumbnailBase64.startsWith('http')) {
          await deleteFromCloudinary(creative.thumbnailBase64).catch(() => {});
        }
        if (creative.slides?.length) {
          creative.slides.forEach(s => {
            if (s.image?.startsWith('http')) deleteFromCloudinary(s.image).catch(() => {});
          });
        }
      }

      const products = await Product.find({ user: userId });
      for (const prod of products) {
        if (prod.imageBase64 && prod.imageBase64.startsWith('http')) {
          await deleteFromCloudinary(prod.imageBase64).catch(() => {});
        }
      }
    } catch (cleanErr) {
      console.warn('[TERMINATE] Cloudinary cleanup warning:', cleanErr.message);
    }

    // Delete everything in parallel
    await Promise.all([
      BrandProfile.deleteOne({ user: userId }),
      AgentActivity.deleteMany({ user: userId }),
      ContentCalendar.deleteMany({ userId: userId }),
      DMConversation.deleteMany({ user: userId }),
      DMFlow.deleteMany({ user: userId }),
      DMFlowFollowUp.deleteMany({ user: userId }),
      Notification.deleteMany({ userId: userId }),
      PostAnalysis.deleteMany({ userId: userId }),
      StrategyCreative.deleteMany({ user: userId }),
      Product.deleteMany({ user: userId }),
      User.findByIdAndDelete(userId)
    ]);

    console.log(`[TERMINATE] ✅ User ${userId} and all associated data erased.`);
    res.status(200).json({ message: 'Account and all associated data erased successfully.' });
  } catch (error) {
    console.error('Termination Error:', error);
    res.status(500).json({ message: 'Server error during account termination' });
  }
};

export const requestMetaTester = async (req, res) => {
  try {
    const { igHandle } = req.body;
    if (!igHandle) {
      return res.status(400).json({ message: 'Instagram username is required.' });
    }

    const testerRequest = await MetaTester.create({
      userId: req.user._id,
      brandId: req.user.activeBrandId || undefined,
      igHandle
    });

    try {
      console.log(`[TEST] Creating Meta Tester request for user ${req.user._id}`);
      const userDoc = await User.findById(req.user._id);
      if (userDoc) {
        console.log(`[TEST] Found user ${userDoc.email}, triggering sendMetaTesterAdminNotification...`);
        await sendMetaTesterAdminNotification({
          userName: userDoc.name,
          userEmail: userDoc.email,
          igHandle
        });
      } else {
        console.warn(`[TEST] User ${req.user._id} not found in DB. Skipping email notification.`);
      }
    } catch (emailErr) {
      console.error('[TEST] Exception caught while triggering Meta Tester admin notification:', emailErr);
    }

    res.status(201).json({ success: true, request: testerRequest });
  } catch (error) {
    console.error('Request Meta Tester Error:', error);
    res.status(500).json({ message: 'Server error requesting Meta tester access.' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    let profile = null;
    if (req.user.activeBrandId) {
      profile = await BrandProfile.findOneAndUpdate(
        { user: req.user._id, _id: req.user.activeBrandId },
        { $set: req.body },
        { new: true }
      );
    }
    if (!profile) {
      profile = await BrandProfile.findOneAndUpdate(
        { user: req.user._id },
        { $set: req.body },
        { new: true }
      );
    }
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

export const lockExcessBrands = async (req, res) => {
  try {
    const { keepBrandIds } = req.body;
    if (!Array.isArray(keepBrandIds)) {
      return res.status(400).json({ message: 'keepBrandIds must be an array' });
    }

    const userDoc = await User.findById(req.user._id);
    const planName = (userDoc?.plan || 'starter').toLowerCase();
    const hasAgency = planName.includes('agency');
    const hasElite = planName.includes('elite');
    const maxBrands = hasAgency ? 8 : hasElite ? 2 : 1;

    if (keepBrandIds.length > maxBrands) {
      return res.status(400).json({ 
        message: `You can only keep ${maxBrands} brand(s) active on your current plan.` 
      });
    }

    // Lock brands not in the keep array
    await BrandProfile.updateMany(
      { user: req.user._id, _id: { $nin: keepBrandIds } },
      { $set: { isLocked: true } }
    );

    // Explicitly unlock the kept ones (in case they upgrade later and want to unlock previously locked ones, though this specific route is mainly for locking excess)
    await BrandProfile.updateMany(
      { user: req.user._id, _id: { $in: keepBrandIds } },
      { $set: { isLocked: false } }
    );

    // If active brand is now locked, switch active brand to the first kept brand
    if (userDoc.activeBrandId && !keepBrandIds.includes(userDoc.activeBrandId.toString()) && keepBrandIds.length > 0) {
      await User.findByIdAndUpdate(req.user._id, { activeBrandId: keepBrandIds[0] });
    }

    res.status(200).json({ success: true, message: 'Excess brands locked successfully.' });
  } catch (error) {
    console.error('lockExcessBrands Error:', error);
    res.status(500).json({ message: 'Server error locking brands' });
  }
};
