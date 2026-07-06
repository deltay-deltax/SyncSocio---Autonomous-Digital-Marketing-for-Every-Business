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
import { sendSignupWelcomeEmail } from '../utils/sendWelcomeEmail.js';
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
    
    const user = await User.findById(req.user._id).select('planExpiresAt credits plan');
    const profileObj = profile.toObject();
    profileObj.userPlanExpiresAt = user?.planExpiresAt;
    profileObj.userCredits = user?.credits;
    profileObj.userPlan = user?.plan;
    
    // Check if there is a pending Meta Tester request
    const pendingTester = await MetaTester.findOne({ userId: req.user._id, status: 'pending' });
    console.log('[DEBUG] req.user._id:', req.user._id, typeof req.user._id);
    console.log('[DEBUG] pendingTester found:', !!pendingTester);
    
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
    const brands = await BrandProfile.find({ user: req.user._id }).select('brandName socialHandle instagramUsername selectedPlan logo _id');
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

    // Update active brand ID on user
    await User.findByIdAndUpdate(req.user._id, { activeBrandId: brandId });

    res.json({ success: true, activeBrand: brand });
  } catch (error) {
    res.status(500).json({ message: 'Server error switching brands' });
  }
};

import StrategyCreative from '../models/StrategyCreative.js';
import Product from '../models/Product.js';

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
