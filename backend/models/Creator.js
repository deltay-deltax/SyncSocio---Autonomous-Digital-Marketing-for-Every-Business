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
