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
  targetAudiences: [String],
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
  predictedMix: {
    reels: { type: Number, default: 0 },
    static: { type: Number, default: 0 },
    carousel: { type: Number, default: 0 }
  },
  agentRecommendation: { type: String, default: "" },
  lastStrategicAudit: { type: Date },
  lastPlanGeneratedAt: { type: Date },
  generationCount: { type: Number, default: 0 },
  lastAdsAnalysisAt: { type: Date },
  cachedAdsRecommendations: { type: Array, default: [] },
   primaryCTA: String,
   primaryColor: { type: String, default: '#2563EB' },
   secondaryColor: { type: String, default: '#60A5FA' },
  instagramAccessToken: String,
  instagramPageAccessToken: String,
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
  },
  automations: {
    storyMention: {
      active: { type: Boolean, default: false },
      message: { type: String, default: "Hey! 🙌 Thanks so much for tagging us in your story — we really appreciate it! ❤️" }
    },
    defaultReply: {
      active: { type: Boolean, default: false },
      message: { type: String, default: "Hi there! Thanks for reaching out. How can we help you today? 😊" }
    }
  },
  followerHistory: [{
    date: String, // Format: 'MMM D' e.g. 'Apr 19'
    count: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  agentLearnings: [{
    category: { type: String, enum: ['visual', 'timing', 'audience', 'strategy', 'engagement'] },
    insight: String,
    confidence: Number,
    createdAt: { type: Date, default: Date.now },
    isNew: { type: Boolean, default: true }
  }],
  neuralState: {
    type: String,
    default: 'Idle'
  }
}, { timestamps: true });

export default mongoose.model('BrandProfile', brandProfileSchema);
