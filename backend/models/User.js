import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: false // Optional, because OAuth users don't have passwords
  },
  googleId: {
    type: String,
    required: false
  },
  appleId: {
    type: String,
    required: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  otpCode: {
    type: String,
    required: false
  },
  otpExpiry: {
    type: Date,
    required: false
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  instagramId: String,
  instagramAccessToken: String,
  instagramTokenExpire: Date,
  credits: {
    type: Number,
    default: 0
  },
  totalCreditsPurchased: {
    type: Number,
    default: 0
  },
  totalCreditsConsumed: {
    type: Number,
    default: 0
  },
  plan: {
    type: String,
    default: ''
  },
  planExpiresAt: {
    type: Date,
    required: false
  },
  activeBrandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BrandProfile'
  },
  billingAddress: {
    fullName: String,
    email: String,
    streetAddress: String,
    city: String,
    postalCode: String,
    country: { type: String, default: 'India' }
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  deviceFingerprint: {
    type: String,
    required: false
  },
  freeTrialUsed: {
    type: Boolean,
    default: false
  },
  // ── Email Campaign Quota ──────────────────────────────────────────────────
  email_sends_this_month: {
    type: Number,
    default: 0
  },
  email_quota_reset_at: {
    type: Date,
    default: Date.now
  },
  // ── Referral System ───────────────────────────────────────────────────────
  referredBy: {
    type: String,
    required: false
  },
  referralCreator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Creator',
    required: false,
    index: true
  },
  referralDate: {
    type: Date,
    required: false
  },
  // Immutable commission terms accepted when this user signed up through a
  // creator link. Existing referrals without this snapshot use the creator's
  // current terms as a backwards-compatible fallback.
  referralTerms: {
    initialCommissionRate: { type: Number, min: 0, max: 100 },
    initialCommissionMonths: { type: Number, min: 0, max: 60 },
    retentionCommissionRate: { type: Number, min: 0, max: 100 },
    retentionCommissionMonths: { type: Number, min: 0, max: 60 }
  }
  // ─────────────────────────────────────────────────────────────────────────
}, { timestamps: true });

export default mongoose.model('User', userSchema);
