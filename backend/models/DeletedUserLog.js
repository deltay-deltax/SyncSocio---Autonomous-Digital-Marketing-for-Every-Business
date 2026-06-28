import mongoose from 'mongoose';

const deletedUserLogSchema = new mongoose.Schema({
  originalUserId: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  name: {
    type: String,
  },
  deletedByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  deletedAt: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.model('DeletedUserLog', deletedUserLogSchema);
