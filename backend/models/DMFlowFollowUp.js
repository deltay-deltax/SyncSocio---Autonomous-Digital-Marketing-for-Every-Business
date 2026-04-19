import mongoose from 'mongoose';

const dmFlowFollowUpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    flow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DMFlow',
      required: true,
      index: true,
    },
    recipientId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    commentId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    followUpMessageIndex: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
      index: true,
    },
    initialReplyAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'dm_flow_followups',
  }
);

dmFlowFollowUpSchema.index({ user: 1, recipientId: 1, status: 1, updatedAt: -1 });
dmFlowFollowUpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('DMFlowFollowUp', dmFlowFollowUpSchema);
