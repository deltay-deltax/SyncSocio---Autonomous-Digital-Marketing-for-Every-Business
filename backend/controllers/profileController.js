import BrandProfile from '../models/BrandProfile.js';
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
    
    let profile = await BrandProfile.findOne({ user: req.user._id });
    const hadExistingProfile = Boolean(profile);
    const previousSelectedPlan = profile?.selectedPlan?.trim() || '';
    const wasGmailConnected = profile ? profile.gmailIsConnected : false;
    const wasWhatsappConnected = profile ? profile.whatsappIsConnected : false;
    
    if (profile) {
      profile = await BrandProfile.findOneAndUpdate(
        { user: req.user._id },
        profileData,
        { returnDocument: 'after', runValidators: true }
      );
    } else {
      profile = await BrandProfile.create(profileData);
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
    const profile = await BrandProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

export const terminateAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(`[TERMINATE] ⚠️ Wiping all data for user ${userId}...`);

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
      User.findByIdAndDelete(userId)
    ]);

    console.log(`[TERMINATE] ✅ User ${userId} and all associated data erased.`);
    res.status(200).json({ message: 'Account and all associated data erased successfully.' });
  } catch (error) {
    console.error('Termination Error:', error);
    res.status(500).json({ message: 'Server error during account termination' });
  }
};
