import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    required: false
  },
  type: {
    type: String,
    enum: ['topup', 'plan_purchase', 'plan_upgrade', 'plan_renewal'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  creditsAdded: {
    type: Number,
    default: 0
  },
  razorpayOrderId: {
    type: String,
    required: false
  },
  razorpayPaymentId: {
    type: String,
    required: false
  },
  discountPercentage: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  couponCode: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed'
  }
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
