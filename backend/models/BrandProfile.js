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
  whatsappWABAId: {
    type: String,
    default: ""
  },
  selectedPlan: {
    type: String,
    default: 'Free'
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  DM_Automation_Service: {
    type: Boolean,
    default: false
  },
  // ── Nexa DM Sales Agent Settings ──────────────────────────────────────────
  nexa: {
    nexa_enabled:        { type: Boolean, default: false },
    razorpay_key_id:     { type: String, default: null },    // AES-GCM encrypted
    razorpay_key_secret: { type: String, default: null },    // AES-GCM encrypted, never logged
    razorpay_connected:  { type: Boolean, default: false },
    cod_enabled:         { type: Boolean, default: false },
    upi_id:              { type: String, default: '' },      // brand's UPI ID for manual payments
    upi_qr_code_url:     { type: String, default: '' },      // URL of the uploaded UPI QR code image
    bank_details:        { type: String, default: '' },      // bank details for manual payments
    min_discount:        { type: Number, default: 0 },       // % minimum Nexa can offer
    max_discount:        { type: Number, default: 10 },      // % maximum before escalating
    business_context:    { type: String, default: '' },      // Free-text for store policies and info
    knowledge_base: [{
      question: String,
      answer: String,
      addedAt: { type: Date, default: Date.now },
      autoLearned: { type: Boolean, default: false }
    }]
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
  },

  // ── Email Domain Authentication (SendGrid per-brand domain) ──────────────
  has_selected_email_sender: { type: Boolean, default: false },
  use_generic_email_sender: { type: Boolean, default: false },
  email_from: { type: String, default: '' },
  email_domain: { type: String, default: '' },
  sendgrid_domain_id: { type: Number, default: null },
  email_domain_verified: { type: Boolean, default: false },
  email_verified_at: { type: Date, default: null },
  dns_records: {
    mail_cname: {
      host: { type: String, default: '' },
      data: { type: String, default: '' },
      valid: { type: Boolean, default: false }
    },
    dkim1: {
      host: { type: String, default: '' },
      data: { type: String, default: '' },
      valid: { type: Boolean, default: false }
    },
    dkim2: {
      host: { type: String, default: '' },
      data: { type: String, default: '' },
      valid: { type: Boolean, default: false }
    }
  },
  email_setup_started_at: { type: Date, default: null },
  email_setup_step: { type: Number, default: 1 }
}, { timestamps: true });

export default mongoose.model('BrandProfile', brandProfileSchema);
