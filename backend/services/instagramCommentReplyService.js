import axios from 'axios';
import InstagramCommentReplyLog from '../models/InstagramCommentReplyLog.js';

const FB_API_VERSION = 'v25.0';
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

const safeTrim = (value) => (typeof value === 'string' ? value.trim() : '');

export const buildPublicCommentReplyText = (actorUsername) => {
  const username = safeTrim(actorUsername).replace(/^@+/, '');
  return username ? `@${username} Check your DM` : 'Check your DM';
};

export const claimCommentReply = async ({
  user,
  commentId,
  flow,
  recipientId = '',
  mediaId = '',
  actorUsername = '',
  commentText = '',
  publicReplyText = '',
}) => {
  const normalizedCommentId = safeTrim(commentId);
  if (!user || !normalizedCommentId) {
    return null;
  }

  const existing = await InstagramCommentReplyLog.findOne({ user, commentId: normalizedCommentId }).lean();
  if (existing) {
    return null;
  }

  try {
    return await InstagramCommentReplyLog.create({
      user,
      commentId: normalizedCommentId,
      flow: flow || null,
      recipientId: safeTrim(recipientId),
      mediaId: safeTrim(mediaId),
      actorUsername: safeTrim(actorUsername),
      commentText: safeTrim(commentText),
      publicReplyText: safeTrim(publicReplyText),
      claimedAt: new Date(),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return null;
    }
    throw error;
  }
};

export const markCommentReplyPublicSent = async ({ user, commentId, publicReplyText }) => {
  const normalizedCommentId = safeTrim(commentId);
  if (!user || !normalizedCommentId) {
    return null;
  }

  return InstagramCommentReplyLog.updateOne(
    { user, commentId: normalizedCommentId },
    {
      $set: {
        publicReplySentAt: new Date(),
        publicReplyText: safeTrim(publicReplyText),
      },
    }
  );
};

export const markCommentReplyDmSent = async ({ user, commentId, recipientId }) => {
  const normalizedCommentId = safeTrim(commentId);
  if (!user || !normalizedCommentId) {
    return null;
  }

  return InstagramCommentReplyLog.updateOne(
    { user, commentId: normalizedCommentId },
    {
      $set: {
        dmSentAt: new Date(),
        recipientId: safeTrim(recipientId),
      },
    }
  );
};

export const hasCommentReplyLog = async ({ user, commentId }) => {
  const normalizedCommentId = safeTrim(commentId);
  if (!user || !normalizedCommentId) {
    return null;
  }

  return InstagramCommentReplyLog.findOne({ user, commentId: normalizedCommentId }).lean();
};

export const sendPublicCommentReply = async ({ pageToken, commentId, message }) => {
  const response = await axios.post(
    `${FB_API_BASE}/${commentId}/replies`,
    {
      message,
    },
    {
      params: { access_token: pageToken },
      headers: { 'Content-Type': 'application/json' },
      timeout: 20_000,
    }
  );

  return response.data;
};