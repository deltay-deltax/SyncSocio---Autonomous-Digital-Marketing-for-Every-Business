import mongoose from 'mongoose';

const brandProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  brandName: String,
  socialHandle: String,
  businessCategory: String,
  otherCategory: String,
  mainGoal: String,
  website: String,
  location: {
    country: String,
    city: String
  },
  usp: String,
  competitors: [String],
  targetAudience: String,
  ageRange: String,
  genderFocus: String,
  painPoint: String,
  brandTone: String,
  visualVibe: String,
  brandKeywords: String,
  contentTypes: [String],
  postingFrequency: String,
  socialPlatforms: [String],
  analytics: {
    followers: String,
    reach: String,
    engagement: String
  },
  contentMix: {
    education: Number,
    promotion: Number
  },
  primaryCTA: String,
  instagramAccessToken: String,
  instagramUserId: String,
  instagramUsername: String,
  instagramBusinessAccountId: String,
  instagramPageId: String,
  instagramIsConnected: {
    type: Boolean,
    default: false
  },
  selectedPlan: {
    type: String,
    default: 'Free'
  }
}, { timestamps: true });

export default mongoose.model('BrandProfile', brandProfileSchema);
