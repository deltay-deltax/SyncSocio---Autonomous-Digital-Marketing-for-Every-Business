import mongoose from 'mongoose';

const creditLedgerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: ['added', 'deducted'],
  },
  reason: {
    type: String,
    required: true,
  },
}, { timestamps: true });

export default mongoose.model('CreditLedger', creditLedgerSchema);
