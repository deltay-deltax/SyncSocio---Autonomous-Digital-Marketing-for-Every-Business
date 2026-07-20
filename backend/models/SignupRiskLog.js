import mongoose from 'mongoose';

const signupRiskLogSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: false
  },
  fingerprint: {
    type: String,
    required: false
  },
  riskScore: {
    type: Number,
    default: 0
  },
  reason: {
    type: String,
    required: false
  }
}, { timestamps: true });

// Indexes to quickly find all signups by same IP or fingerprint
signupRiskLogSchema.index({ ipAddress: 1 });
signupRiskLogSchema.index({ fingerprint: 1 });

export default mongoose.model('SignupRiskLog', signupRiskLogSchema);
