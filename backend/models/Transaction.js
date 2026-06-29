import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
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
    enum: ['completed', 'failed', 'refunded'],
    default: 'completed'
  }
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
