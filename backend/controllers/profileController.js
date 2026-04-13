import BrandProfile from '../models/BrandProfile.js';

export const createOrUpdateProfile = async (req, res) => {
  try {
    const profileData = { ...req.body, user: req.user._id };
    
    let profile = await BrandProfile.findOne({ user: req.user._id });
    
    if (profile) {
      profile = await BrandProfile.findOneAndUpdate(
        { user: req.user._id },
        profileData,
        { new: true, runValidators: true }
      );
    } else {
      profile = await BrandProfile.create(profileData);
    }
    
    res.status(profile ? 200 : 201).json(profile);
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
