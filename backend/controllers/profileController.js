import BrandProfile from '../models/BrandProfile.js';
import User from '../models/User.js';
import { sendWelcomeEmail } from '../utils/sendWelcomeEmail.js';

const inferAuthProvider = (user) => {
  if (user?.googleId) return 'google';
  if (user?.appleId) return 'apple';
  return 'email';
};

export const createOrUpdateProfile = async (req, res) => {
  try {
    const profileData = { ...req.body, user: req.user._id };
    const incomingSelectedPlan = typeof req.body.selectedPlan === 'string'
      ? req.body.selectedPlan.trim()
      : '';
    
    let profile = await BrandProfile.findOne({ user: req.user._id });
    const hadExistingProfile = Boolean(profile);
    const previousSelectedPlan = profile?.selectedPlan?.trim() || '';
    
    if (profile) {
      profile = await BrandProfile.findOneAndUpdate(
        { user: req.user._id },
        profileData,
        { new: true, runValidators: true }
      );
    } else {
      profile = await BrandProfile.create(profileData);
    }

    const shouldSendPlanWelcomeEmail = Boolean(incomingSelectedPlan) && incomingSelectedPlan !== previousSelectedPlan;
    if (shouldSendPlanWelcomeEmail) {
      try {
        const user = await User.findById(req.user._id).select('name email googleId appleId');
        if (user?.email) {
          const mailInfo = await sendWelcomeEmail({
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
