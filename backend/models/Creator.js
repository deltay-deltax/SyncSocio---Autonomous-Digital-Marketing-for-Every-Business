import mongoose from 'mongoose';
import crypto from 'crypto';

const creatorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  dashboardToken: {
    type: String,
    unique: true,
    default: () => crypto.randomUUID()
  },
  clicks: {
    type: Number,
    default: 0
  },
  // These terms are used for new referred signups. They are copied to the user
  // at signup so changing a creator's future offer cannot rewrite past earnings.
  initialCommissionRate: {
    type: Number,
    default: 25,
    min: 0,
    max: 100
  },
  initialCommissionMonths: {
    type: Number,
    default: 2,
    min: 0,
    max: 60
  },
  retentionCommissionRate: {
    type: Number,
    default: 20,
    min: 0,
    max: 100
  },
  retentionCommissionMonths: {
    type: Number,
    default: 2,
    min: 0,
    max: 60
  },
  totalPaid: {
    type: Number,
    default: 0
  },
  payoutRequested: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model('Creator', creatorSchema);
