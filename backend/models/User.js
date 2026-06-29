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
  isBlocked: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
