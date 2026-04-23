import mongoose from 'mongoose';

const instagramCommentReplyLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    commentId: {
      type: String,
      required: true,
      trim: true,
    },
    flow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DMFlow',
      default: null,
      index: true,
    },
    recipientId: {
      type: String,
      trim: true,
      default: '',
    },
    mediaId: {
      type: String,
      trim: true,
      default: '',
    },
    actorUsername: {
      type: String,
      trim: true,
      default: '',
    },
    commentText: {
      type: String,
      trim: true,
      default: '',
    },
    publicReplyText: {
      type: String,
      trim: true,
      default: '',
    },
    publicReplySentAt: {
      type: Date,
      default: null,
    },
    dmSentAt: {
      type: Date,
      default: null,
    },
    claimedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'instagram_comment_reply_logs',
  }
);

instagramCommentReplyLogSchema.index({ user: 1, commentId: 1 }, { unique: true });

export default mongoose.model('InstagramCommentReplyLog', instagramCommentReplyLogSchema);