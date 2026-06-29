import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiryDate: {
    type: Date,
    required: false
  },
  timesUsed: {
    type: Number,
    default: 0
  },
  maxUses: {
    type: Number,
    default: null // null = unlimited
  }
}, { timestamps: true });

export default mongoose.model('Coupon', couponSchema);
