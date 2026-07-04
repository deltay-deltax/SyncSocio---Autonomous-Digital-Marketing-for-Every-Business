import mongoose from 'mongoose';

const brandProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
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
  generationLockoutUntil: { type: Date },
  generationCount: { type: Number, default: 0 },
  lastAdsAnalysisAt: { type: Date },
  cachedAdsRecommendations: { type: Array, default: [] },
  cachedMetrics: { type: Object, default: {} },
  cachedMedia: { type: Array, default: [] },
  lastMetricsUpdate: { type: Date },
   primaryCTA: String,
   primaryColor: { type: String, default: '#2563EB' },
   secondaryColor: { type: String, default: '#60A5FA' },
   logo: { type: String, default: "" },
   typography: { type: String, default: "" },
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
  gmailEmail: {
    type: String,
    default: ""
  },
  gmailIsConnected: {
    type: Boolean,
    default: false
  },
  whatsappNumber: {
    type: String,
    default: ""
  },
  whatsappIsConnected: {
    type: Boolean,
    default: false
  },
  whatsappPhoneId: {
    type: String,
    default: ""
  },
  whatsappAccessToken: {
    type: String,
    default: ""
  },
  selectedPlan: {
    type: String,
    default: 'Free'
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  DM_Automation_Service: {
    type: Boolean,
    default: false
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
    isFresh: { type: Boolean, default: true }
  }],
  neuralState: {
    type: String,
    default: 'Idle'
  },
  isTesterEnabled: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model('BrandProfile', brandProfileSchema);
