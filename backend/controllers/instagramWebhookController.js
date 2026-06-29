import axios from 'axios';
import BrandProfile from '../models/BrandProfile.js';
import DMFlowFollowUp from '../models/DMFlowFollowUp.js';
import DMConversation from '../models/DMConversation.js';
import DMFlow, { normalizeKeywordInput } from '../models/DMFlow.js';
import {
  buildPublicCommentReplyText,
  buildPublicCommentReplyTextFromTemplate,
  claimCommentReply,
  markCommentReplyDmSent,
  markCommentReplyPublicSent,
  sendPublicCommentReply,
} from '../services/instagramCommentReplyService.js';

const FB_API_VERSION = 'v25.0';
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;
let clickTrackingBaseUrl = (process.env.BACKEND_PUBLIC_URL || process.env.WEBHOOK_PUBLIC_URL || '').trim();

const safeTrim = (value) => (typeof value === 'string' ? value.trim() : '');

const getConnectedProfileUrl = (profile) => {
  const username = safeTrim(profile?.instagramUsername);
  return username ? `https://instagram.com/${username}` : 'https://instagram.com';
};

const normalizeBaseUrl = (value) => safeTrim(value).replace(/\/+$/, '');

const setClickTrackingBaseUrlFromRequest = (req) => {
  if (clickTrackingBaseUrl) return;
  const host = safeTrim(req?.headers?.host);
  if (!host) return;
  const protocol = safeTrim(req?.headers?.['x-forwarded-proto']) || req?.protocol || 'https';
  clickTrackingBaseUrl = normalizeBaseUrl(`${protocol}://${host}`);
};

const buildTrackedButtonUrl = ({ flowId, buttonId, targetUrl }) => {
  const base = normalizeBaseUrl(clickTrackingBaseUrl);
  if (!base || !safeTrim(targetUrl)) {
    return targetUrl;
  }

  const trackUrl = new URL('/api/dm-flows/track-click', base);
  trackUrl.searchParams.set('flowId', String(flowId));
  trackUrl.searchParams.set('buttonId', String(buttonId || ''));
  trackUrl.searchParams.set('url', targetUrl);
  return trackUrl.toString();
};

const getWebhookVerifyToken = () => {
  return process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || process.env.JWT_SECRET || '';
};

const createFlowQuery = ({ userId, brandId, mediaId }) => {
  const query = {
    user: userId,
    $or: [{ brandId }, { brandId: { $exists: false } }],
    active: true,
    trigger: 'comment',
  };

  if (safeTrim(mediaId)) {
    query.$or = [
      { targetType: 'all' },
      { targetType: 'specific', targetMediaId: safeTrim(mediaId) },
    ];
    // Need to preserve user/brand filter context inside $or group
    if (brandId) {
      query.$and = [
        { user: userId },
        { $or: [{ brandId }, { brandId: { $exists: false } }] }
      ];
    }
  } else {
    query.targetType = 'all';
  }

  return query;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const keywordMatchScore = (incomingText, configuredKeyword) => {
  const incoming = normalizeKeywordInput(incomingText);
  const keyword = normalizeKeywordInput(configuredKeyword);

  if (!incoming || !keyword) {
    return 0;
  }

  if (incoming === keyword) {
    return 3;
  }

  const boundaryRegex = new RegExp(`(^|\\W)${escapeRegExp(keyword)}(\\W|$)`, 'i');
  if (boundaryRegex.test(incoming)) {
    return 2;
  }

  if (incoming.includes(keyword)) {
    return 1;
  }

  return 0;
};

const findBestFlowMatch = async ({ userId, brandId, incomingText, mediaId }) => {
  const query = createFlowQuery({ userId, brandId, mediaId });
  const candidates = await DMFlow.find(query).sort({ updatedAt: -1 }).limit(50);

  let bestFlow = null;
  let bestScore = 0;

  for (const flow of candidates) {
    const score = keywordMatchScore(incomingText, flow.keywordNormalized || flow.keyword);
    if (score > bestScore) {
      bestScore = score;
      bestFlow = flow;
      if (bestScore === 3) {
        break;
      }
    }
  }

  return {
    flow: bestFlow,
    score: bestScore,
    candidateCount: candidates.length,
  };
};

const buildDmMessagePayload = (flow, profile) => {
  if (!Array.isArray(flow.messages) || flow.messages.length === 0) return null;
  const hookMessage = flow.messages[0];
  const hookText = safeTrim(hookMessage?.text) || 'Thanks for reaching out!';
  const buttons = hookMessage?.buttons || [];

  if (buttons.length === 0) return { text: hookText.slice(0, 1000) };

  const formattedButtons = buttons.slice(0, 3).map((btn) => {
    if (btn.type === 'url' || btn.type === 'visit_profile' || btn.type === 'follow') {
      let url = safeTrim(btn.url);
      if (btn.type === 'visit_profile' || btn.type === 'follow') {
        url = getConnectedProfileUrl(profile);
      }
      if (btn.type === 'url') {
        url = buildTrackedButtonUrl({ flowId: flow._id, buttonId: btn.id, targetUrl: url });
      }
      return {
        type: 'web_url',
        url: url || getConnectedProfileUrl(profile),
        title: safeTrim(btn.label) || 'Open Link',
      };
    } else {
      return {
        type: 'postback',
        title: safeTrim(btn.label) || 'Continue',
        payload: `FLOW_${flow._id}_MSG_${hookMessage.id}_BTN_${btn.id}`,
      };
    }
  });

  return {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'generic',
        elements: [
          {
            title: hookText.slice(0, 80),
            subtitle: hookText.length > 80 ? hookText.slice(80, 150) : undefined,
            buttons: formattedButtons,
          },
        ],
      },
    },
  };
};

const getPendingFollowUpMessageIndex = (flow) => {
  if (!Array.isArray(flow?.messages)) return -1;
  return flow.messages.length > 1 ? 1 : -1;
};

const queueFollowUpMessage = async ({ profile, flow, commentId, recipientId }) => {
  const followUpMessageIndex = getPendingFollowUpMessageIndex(flow);
  if (followUpMessageIndex === -1 || !safeTrim(recipientId)) {
    return null;
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return DMFlowFollowUp.findOneAndUpdate(
    {
      user: profile.user,
      flow: flow._id,
      recipientId: safeTrim(recipientId),
      status: 'pending',
    },
    {
      $set: {
        commentId: safeTrim(commentId),
        followUpMessageIndex,
        initialReplyAt: new Date(),
        respondedAt: null,
        completedAt: null,
        expiresAt,
        status: 'pending',
      },
    },
    {
      upsert: true,
      new: true,
    }
  );
};

const claimPendingFollowUp = async ({ profile, senderId }) => {
  const pending = await DMFlowFollowUp.findOne({
    user: profile.user,
    recipientId: safeTrim(senderId),
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).sort({ updatedAt: -1 });

  if (!pending) {
    return null;
  }

  const flow = await DMFlow.findOne({ _id: pending.flow, active: true });
  if (!flow) {
    return null;
  }

  const messageObj = flow.messages?.[pending.followUpMessageIndex];
  if (!messageObj) {
    return null;
  }

  return { pending, flow, messageObj };
};

const matchesFollowUpConfirmation = (flow, pending, incomingText) => {
  const normalizedIncoming = normalizeKeywordInput(incomingText);
  if (!normalizedIncoming) return false;

  const promptMessage = flow.messages?.[pending.followUpMessageIndex - 1];
  if (!promptMessage?.buttons?.length) return false;

  return promptMessage.buttons.some(
    (button) => button.type === 'next' && normalizeKeywordInput(button.label) === normalizedIncoming
  );
};

const extractCommentEvents = (entry = {}) => {
  const changes = Array.isArray(entry.changes) ? entry.changes : [];
  const events = [];

  for (const change of changes) {
    const value = change.value;
    if (!value || value.verb !== 'add') continue;

    if (change.field === 'comments') {
      const commentId = safeTrim(value?.id || value?.comment_id);
      const text = safeTrim(value?.text || value?.message);
      if (!commentId || !text) continue;

      events.push({
        commentId,
        text,
        mediaId: safeTrim(value?.media?.id || value?.media_id),
        actorId: safeTrim(value?.from?.id),
        actorUsername: safeTrim(value?.from?.username),
      });
    } else if (change.field === 'feed' && value.item === 'comment') {
      const commentId = safeTrim(value?.comment_id);
      const text = safeTrim(value?.message);
      if (!commentId || !text) continue;

      events.push({
        commentId,
        text,
        mediaId: safeTrim(value?.post_id),
        actorId: safeTrim(value?.from?.id),
        actorUsername: safeTrim(value?.from?.name),
      });
    }
  }
  return events;
};

const processedMessageIds = new Set();
const processedMentionMediaIds = new Set();

const resolvePageToken = async (profile) => {
  if (profile.instagramPageAccessToken) return profile.instagramPageAccessToken;

  console.log('[WEBHOOK] Page token missing, fetching on the fly...');
  try {
    const res = await axios.get(`${FB_API_BASE}/me/accounts`, {
      params: { fields: 'id,access_token', access_token: profile.instagramAccessToken },
    });
    const page = res.data.data.find((p) => String(p.id) === String(profile.instagramPageId));
    if (page?.access_token) {
        profile.instagramPageAccessToken = page.access_token; // Cache it in memory for this run
        return page.access_token;
    }
  } catch (err) {
      console.error('[WEBHOOK] Failed to resolve page token on the fly');
  }
  return null;
};

const checkUserFollows = async (profile, senderId) => {
  if (!senderId) return false;
  try {
    if (profile.instagramBusinessAccountId) {
      try {
          const url = `${FB_API_BASE}/${profile.instagramBusinessAccountId}/followers`;
          const res = await axios.get(url, {
            params: { user_id: senderId, access_token: profile.instagramAccessToken },
            timeout: 10000,
          });
          if (res.data?.data && res.data.data.length > 0) return true;
      } catch (igErr) {
          // Meta API restricts /followers edge often. If it throws #100, we trust the user.
          console.warn('[WEBHOOK] IG Follow check failed (expected privacy block), trusting user');
          return true; 
      }
    }
    if (profile.instagramPageId) {
      try {
          const pageToken = await resolvePageToken(profile);
          if (!pageToken) return false;
          const url = `${FB_API_BASE}/${profile.instagramPageId}/likes`;
          const res = await axios.get(url, {
            params: { user_id: senderId, access_token: pageToken },
            timeout: 10000,
          });
          if (res.data?.data && res.data.data.length > 0) return true;
      } catch (fbErr) {
          console.warn('[WEBHOOK] FB Like check failed');
      }
    }
    return false;
  } catch (err) {
    console.error('Error checking follows:', err?.response?.data || err.message);
    return false;
  }
};

const extractMentionEvents = (entry = {}) => {
  const changes = Array.isArray(entry.changes) ? entry.changes : [];
  const messaging = Array.isArray(entry.messaging) ? entry.messaging : [];
  const events = [];

  for (const change of changes) {
    if (change.field !== 'mentions') continue;
    const value = change.value;
    if (!value) continue;

    const mediaId = safeTrim(value.media_id || value.id);
    const senderId = safeTrim(value.sender?.id || value.user?.id);

    if (!mediaId || !senderId) continue;

    if (processedMentionMediaIds.has(mediaId)) continue;
    processedMentionMediaIds.add(mediaId);
    if (processedMentionMediaIds.size > 10000) processedMentionMediaIds.delete(processedMentionMediaIds.keys().next().value);

    events.push({ mediaId, senderId });
  }

  // Meta may deliver story mentions as messaging attachments instead of changes[].
  for (const msg of messaging) {
    if (msg?.message?.is_echo) continue;

    const senderId = safeTrim(msg?.sender?.id);
    if (!senderId) continue;

    const attachments = Array.isArray(msg?.message?.attachments) ? msg.message.attachments : [];
    const storyMention = attachments.find((a) => safeTrim(a?.type).toLowerCase() === 'story_mention');
    if (!storyMention) continue;

    const mentionUrl = safeTrim(storyMention?.payload?.url);
    let mediaId = '';

    if (mentionUrl) {
      try {
        const url = new URL(mentionUrl);
        mediaId = safeTrim(url.searchParams.get('asset_id'));
      } catch {
        mediaId = '';
      }
    }

    if (!mediaId) {
      mediaId = safeTrim(msg?.message?.mid) || `${senderId}_${safeTrim(String(msg?.timestamp || ''))}`;
    }

    if (!mediaId) continue;
    if (processedMentionMediaIds.has(mediaId)) continue;

    processedMentionMediaIds.add(mediaId);
    if (processedMentionMediaIds.size > 10000) processedMentionMediaIds.delete(processedMentionMediaIds.keys().next().value);

    events.push({ mediaId, senderId });
  }

  return events;
};

const extractMessageEvents = (entry = {}) => {
  const messaging = Array.isArray(entry.messaging) ? entry.messaging : [];
  const events = [];

  for (const msg of messaging) {
    if (msg.message && msg.message.is_echo) continue;

    const mid = msg.message?.mid;
    if (mid) {
      if (processedMessageIds.has(mid)) continue;
      processedMessageIds.add(mid);
      if (processedMessageIds.size > 10000) processedMessageIds.delete(processedMessageIds.keys().next().value);
    }

    let text = null;
    if (msg.message && msg.message.text) {
      text = msg.message.text;
    } else if (msg.postback) {
      text = msg.postback.title || msg.postback.payload;
    }

    if (!text) continue;

    events.push({
      senderId: safeTrim(msg.sender?.id),
      text: safeTrim(text),
      pageId: safeTrim(msg.recipient?.id),
    });
  }
  return events;
};

const findProfilesForEntry = async (entryId) => {
  const normalizedId = safeTrim(entryId);
  if (!normalizedId) {
    return [];
  }

  return BrandProfile.find({
    instagramIsConnected: true,
    $or: [
      { instagramBusinessAccountId: normalizedId },
      { instagramPageId: normalizedId },
    ],
  })
    .select('user instagramAccessToken instagramPageAccessToken instagramBusinessAccountId instagramPageId instagramUsername automations')
    .sort({ updatedAt: -1 })
    .lean();
};

const sendPrivateReply = async ({ pageToken, commentId, messagePayload, pageId }) => {
  const response = await axios.post(
    `${FB_API_BASE}/${pageId}/messages`,
    {
      recipient: { comment_id: commentId },
      message: messagePayload,
    },
    {
      params: { access_token: pageToken },
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000,
    }
  );

  return response.data;
};

const processCommentEventForProfile = async (profile, event) => {
  console.log(`processCommentEventForProfile: Starting for id="${event.commentId}", text="${event.text}", actor="${event.actorUsername}"`);

  if (safeTrim(event.commentId)) {
    const alreadyProcessed = await DMFlowFollowUp.findOne({ commentId: event.commentId }).lean();
    if (alreadyProcessed) {
      console.log(`Skipping: Comment ${event.commentId} already processed.`);
      return false;
    }
  }

  if (!safeTrim(profile.instagramAccessToken)) {
    console.log('Skipping: no instagramAccessToken on profile');
    return false;
  }

  const matchResult = await findBestFlowMatch({
    userId: profile.user,
    brandId: profile._id,
    incomingText: event.text,
    mediaId: event.mediaId,
  });

  const flow = matchResult.flow;
  if (!flow) {
    console.log(`Skipping: No active DM flow matched for keyword="${event.text}" and mediaId="${event.mediaId}" (candidates=${matchResult.candidateCount})`);
    return false;
  }
  console.log(`Found matching flow: ${flow._id} (matchScore=${matchResult.score})`);

  const publicReplyText = buildPublicCommentReplyTextFromTemplate(
    event.actorUsername,
    flow.commentReplyMessage || ''
  );
  const claim = await claimCommentReply({
    user: profile.user,
    commentId: event.commentId,
    flow: flow._id,
    mediaId: event.mediaId,
    actorUsername: event.actorUsername,
    commentText: event.text,
    publicReplyText,
  });

  if (!claim) {
    console.log(`Skipping: Comment ${event.commentId} already processed.`);
    return false;
  }

  await DMFlow.updateOne({ _id: flow._id }, { $inc: { 'stats.triggered': 1 } });

  const messagePayload = buildDmMessagePayload(flow, profile);
  if (!messagePayload) {
    console.log('Skipping: message generated from flow was empty');
    return false;
  }
  
  console.log(`Sending message preview payload:`, JSON.stringify(messagePayload));

  try {
    // We MUST use the Page Access Token to send DMs. If not present in DB, fetch it on the fly
    let pageToken = profile.instagramPageAccessToken;
    if (!pageToken) {
      console.log('Page Token missing in DB. Fetching on the fly for Page ID:', profile.instagramPageId);
      const accountsRes = await axios.get(`${FB_API_BASE}/me/accounts`, {
        params: { fields: 'id,access_token', access_token: profile.instagramAccessToken }
      });
      const pageData = accountsRes.data.data.find(p => String(p.id) === String(profile.instagramPageId));
      if (pageData) pageToken = pageData.access_token;
    }

    if (!pageToken) throw new Error('Could not resolve Page Access Token required for messaging');

    try {
      const publicReplyResult = await sendPublicCommentReply({
        pageToken,
        commentId: event.commentId,
        message: publicReplyText,
      });

      await markCommentReplyPublicSent({
        user: profile.user,
        commentId: event.commentId,
        publicReplyText,
      });

      console.log('Instagram public comment reply sent', {
        flowId: flow._id.toString(),
        commentId: event.commentId,
        actorUsername: event.actorUsername,
        publicReplyResult,
      });
    } catch (publicReplyError) {
      console.error('Instagram public comment reply failed', {
        flowId: flow._id.toString(),
        commentId: event.commentId,
        actorUsername: event.actorUsername,
        providerError: publicReplyError?.response?.data || publicReplyError?.message,
      });
    }

    const result = await sendPrivateReply({
      pageToken,
      commentId: event.commentId,
      messagePayload,
      pageId: profile.instagramPageId,
    });

    await queueFollowUpMessage({
      profile,
      flow,
      commentId: event.commentId,
      recipientId: result?.recipient_id,
    });

    await markCommentReplyDmSent({
      user: profile.user,
      commentId: event.commentId,
      recipientId: result?.recipient_id,
    });

    await DMFlow.updateOne({ _id: flow._id }, { $inc: { 'stats.replied': 1 } });

    console.log('Instagram private reply sent', {
      flowId: flow._id.toString(),
      commentId: event.commentId,
      actorUsername: event.actorUsername,
      result,
    });

    // Notify user of new lead
    try {
      const { createNotification } = await import('../utils/notificationHelper.js');
      await createNotification(
        profile.user,
        'insight',
        'New Lead Captured',
        `User ${event.actorUsername || 'on Instagram'} triggered your "${flow.name}" flow via a comment.`
      );
    } catch (e) {}

    return true;
  } catch (error) {
    const providerError = error?.response?.data?.error || error?.response?.data || error?.message;
    console.error('Instagram private reply failed', {
      flowId: flow._id.toString(),
      commentId: event.commentId,
      actorUsername: event.actorUsername,
      providerError,
    });

    return false;
  }
};

const findNextMessageForText = async (incomingText) => {
  const normIncoming = normalizeKeywordInput(incomingText);
  if (!normIncoming) return null;
  const flows = await DMFlow.find({ active: true }).sort({ updatedAt: -1 }).lean();

  for (const flow of flows) {
    if (!Array.isArray(flow.messages)) continue;
    for (let i = 0; i < flow.messages.length - 1; i++) {
        const currentMsg = flow.messages[i];
        const matchingBtn = currentMsg.buttons?.find(
          (btn) => btn.type === 'next' && normalizeKeywordInput(btn.label) === normIncoming
        );
        
        if (matchingBtn) {
            // Find all potential next messages
            const nextMessages = flow.messages.slice(i + 1);
            return { flow, nextMessages, matchingMsgIndex: i };
        }
    }
  }
  return null;
};

const buildMessagePayloadForNextMessage = (flow, messageObj, profile, options = {}) => {
  const { forcePrimaryLinkOnly = false } = options;
  const hookText = safeTrim(messageObj.text) || 'Next step!';
  const rawButtons = messageObj.buttons || [];
  const isFinalFollowStep = forcePrimaryLinkOnly || messageObj?.conditional === 'if_following';
  const buttons = isFinalFollowStep
    ? rawButtons.filter((btn) => btn.type === 'url' || btn.type === 'visit_profile').slice(0, 1)
    : rawButtons;

  if (buttons.length === 0) return { text: hookText.slice(0, 1000) };

  const formattedButtons = buttons.slice(0, 3).map((btn) => {
    if (btn.type === 'url' || btn.type === 'visit_profile' || btn.type === 'follow') {
      let url = safeTrim(btn.url);
      if (btn.type === 'visit_profile' || btn.type === 'follow') {
        url = getConnectedProfileUrl(profile);
      }
      if (btn.type === 'url') {
        url = buildTrackedButtonUrl({ flowId: flow._id, buttonId: btn.id, targetUrl: url });
      }
      return {
        type: 'web_url',
        url: url || getConnectedProfileUrl(profile),
        title: safeTrim(btn.label) || 'Open Link',
      };
    } else {
      return {
        type: 'postback',
        title: safeTrim(btn.label) || 'Continue',
        payload: `FLOW_${flow._id}_MSG_${messageObj.id}_BTN_${btn.id}`,
      };
    }
  });

  return {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'generic',
        elements: [
          {
            title: hookText.slice(0, 80),
            subtitle: hookText.length > 80 ? hookText.slice(80, 150) : undefined,
            buttons: formattedButtons,
          },
        ],
      },
    },
  };
};

const sendStandardMessage = async ({ pageToken, igScopedId, messagePayload, pageId }) => {
  return axios.post(
    `${FB_API_BASE}/${pageId}/messages`,
    {
      recipient: { id: igScopedId },
      message: messagePayload,
      messaging_type: 'RESPONSE'
    },
    {
      params: { access_token: pageToken },
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000,
    }
  );
};

const processMentionEventForProfile = async (profile, event) => {
  console.log(`processMention: sender="${event.senderId}"`);

  const automations = profile.automations || {};
  if (!automations.storyMention?.active) {
    console.log('processMention: storyMention automation is inactive. Skipping.');
    return false;
  }

  const messagePayload = { text: automations.storyMention.message || "Hey! 🙌 Thanks so much for tagging us in your story — we really appreciate it! ❤️" };

  try {
    const pageToken = await resolvePageToken(profile);
    if (!pageToken) {
        console.error('Mention DM check failed: Could not resolve page token.');
        return false;
    }
    const result = await sendStandardMessage({
      pageToken,
      igScopedId: event.senderId,
      messagePayload,
      pageId: profile.instagramPageId
    });

    // Notify user of successful story thanks
    try {
      const { createNotification } = await import('../utils/notificationHelper.js');
      await createNotification(
        profile.user,
        'success',
        'Story Thanks Sent',
        `Agent automatically thanked a user for mentioning you in their story.`
      );
    } catch (e) {}

    return true;
  } catch (err) {
    console.error('Mention DM send failed', err?.response?.data || err.message);
    return false;
  }
};

const processMessageEventForProfile = async (profile, event) => {
  console.log(`processMsg: text="${event.text}", sender="${event.senderId}"`);

  const pendingFollowUp = await claimPendingFollowUp({ profile, senderId: event.senderId });
  if (pendingFollowUp && matchesFollowUpConfirmation(pendingFollowUp.flow, pendingFollowUp.pending, event.text)) {
    const messages = pendingFollowUp.flow.messages || [];
    let currentIndex = pendingFollowUp.pending.followUpMessageIndex;
    let matchedMsg = messages[currentIndex];

    if (matchedMsg && matchedMsg.conditional) {
       const isFollowing = await checkUserFollows(profile, event.senderId);
       matchedMsg = null;
       for (let i = currentIndex; i < messages.length; i++) {
           if (messages[i].conditional === 'if_following' && isFollowing) {
               matchedMsg = messages[i]; break;
           }
           if (messages[i].conditional === 'if_not_following' && !isFollowing) {
               matchedMsg = messages[i]; break;
           }
           if (!messages[i].conditional) {
               matchedMsg = messages[i]; break;
           }
       }
       if (!matchedMsg) matchedMsg = messages[currentIndex];
    }

    const messagePayload = buildMessagePayloadForNextMessage(
      pendingFollowUp.flow,
      matchedMsg,
      profile,
      { forcePrimaryLinkOnly: matchedMsg?.conditional === 'if_following' }
    );
    
    if (!messagePayload) {
      return false;
    }

    try {
      const pageToken = profile.instagramPageAccessToken || profile.instagramAccessToken;
      if (!pageToken) {
        return false;
      }

      await sleep(1500);

      await sendStandardMessage({
        pageToken,
        igScopedId: event.senderId,
        messagePayload,
        pageId: profile.instagramPageId,
      });

      await DMFlowFollowUp.updateOne(
        { _id: pendingFollowUp.pending._id },
        {
          $set: {
            status: 'completed',
            respondedAt: new Date(),
            completedAt: new Date(),
          },
        }
      );

      await DMFlow.updateOne({ _id: pendingFollowUp.flow._id }, { $inc: { 'stats.replied': 1 } });
      return true;
    } catch (err) {
      console.error('Pending follow-up DM failed', err?.response?.data || err.message);
      return false;
    }
  }
  
  const match = await findNextMessageForText(event.text);
  if (match && match.nextMessages.length > 0) {
    const { flow, nextMessages, matchingMsgIndex } = match;
    let targetMessage = nextMessages[0];
    const previousMessage = flow.messages[matchingMsgIndex];

    if (targetMessage && targetMessage.conditional) {
       const isFollowing = await checkUserFollows(profile, event.senderId);
       let foundMatchingSeqMsg = null;
       
       for (const msg of nextMessages) {
           if (msg.conditional === 'if_following' && isFollowing) {
               foundMatchingSeqMsg = msg; break;
           }
           if (msg.conditional === 'if_not_following' && !isFollowing) {
               foundMatchingSeqMsg = msg; break;
           }
           if (!msg.conditional) {
               foundMatchingSeqMsg = msg; break;
           }
       }
       targetMessage = foundMatchingSeqMsg || previousMessage;
    }

    const messagePayload = buildMessagePayloadForNextMessage(flow, targetMessage, profile, {
      forcePrimaryLinkOnly: targetMessage?.conditional === 'if_following'
    });
    
    try {
      const pageToken = await resolvePageToken(profile);
      if (!pageToken) {
          console.error('Standard DM failed: Could not resolve page token.');
          return false;
      }

      await sleep(1500);

      await sendStandardMessage({
        pageToken,
        igScopedId: event.senderId,
        messagePayload,
        pageId: profile.instagramPageId
      });
      return true;
    } catch (err) {
      console.error('Standard DM send failed', err?.response?.data || err.message);
      return false;
    }
  }

  // Auto-reply fallback for ANY DM
  try {
    const automations = profile.automations || {};
    const isActive = automations.defaultReply?.active;
    
    console.log(`processMessage: evaluating defaultReply for ${profile.instagramUsername}. active=${isActive}`);
    
    if (!isActive) {
      return false;
    }

    // ─── 24 HOUR WINDOW CHECK ───
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const now = new Date();
    
    let convo = await DMConversation.findOne({ user: profile.user, senderId: event.senderId });
    
    if (convo && convo.lastDefaultReplyAt) {
      const timeSinceLastReply = now.getTime() - convo.lastDefaultReplyAt.getTime();
      if (timeSinceLastReply < TWENTY_FOUR_HOURS_MS) {
        console.log(`processMessage: Sent auto-reply recently (${Math.round(timeSinceLastReply/3600000)}h ago). Skipping to avoid spam.`);
        return false;
      }
    }

    const pageToken = profile.instagramPageAccessToken || profile.instagramAccessToken;
    if (!pageToken) {
      console.log('processMessage: No token found. Skipping.');
      return false;
    }

    const messagePayload = { text: automations.defaultReply.message || "Hi there! How can we help you today?" };

    await sleep(2000);

    await sendStandardMessage({
      pageToken,
      igScopedId: event.senderId,
      messagePayload,
      pageId: profile.instagramPageId,
    });

    // Update the last reply time
    if (!convo) {
      await DMConversation.create({
        user: profile.user,
        senderId: event.senderId,
        lastDefaultReplyAt: now
      });
    } else {
      await DMConversation.updateOne(
        { _id: convo._id },
        { $set: { lastDefaultReplyAt: now } }
      );
    }

    console.log('processMessage: Default auto-reply sent and timestamp updated.');
    return true;
  } catch (err) {
    console.error('Auto-reply DM send failed', err?.response?.data || err.message);
    return false;
  }
};

const processWebhookPayload = async (payload) => {
  console.log('--- WEBHOOK PAYLOAD DEBUG ---', JSON.stringify(payload, null, 2));
  
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    console.log(`Processing entry ID: ${entry?.id}`);
    const profiles = await findProfilesForEntry(entry?.id);
    console.log(`Found ${profiles.length} profiles for entry ID ${entry?.id}`);
    
    if (profiles.length === 0) {
      console.log('No matched profiles found in DB for this entry ID. Skipping.');
      continue;
    }

    const commentEvents = extractCommentEvents(entry);
    const messageEvents = extractMessageEvents(entry);
    
    // Process comments
    for (const event of commentEvents) {
      let handled = false;
      for (const profile of profiles) {
        console.log(`Evaluating comment for profile ${profile.instagramUsername}:`, event);
        const didHandle = await processCommentEventForProfile(profile, event);
        if (didHandle) {
          handled = true;
          break;
        }
      }
    }

    // Process standard DMs
    for (const event of messageEvents) {
      let handled = false;
      for (const profile of profiles) {
        console.log(`Evaluating DM for profile ${profile.instagramUsername}:`, event);
        const didHandle = await processMessageEventForProfile(profile, event);
        if (didHandle) {
          handled = true;
          break;
        }
      }
    }

    // Process mentions
    const mentionEvents = extractMentionEvents(entry);
    for (const event of mentionEvents) {
      let handled = false;
      for (const profile of profiles) {
        console.log(`Evaluating Mention for profile ${profile.instagramUsername}:`, event);
        const didHandle = await processMentionEventForProfile(profile, event);
        if (didHandle) {
          handled = true;
          break;
        }
      }
    }
  }
};

export const verifyInstagramWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = getWebhookVerifyToken();

  console.log('[IG WEBHOOK VERIFY] Incoming verification request', {
    mode,
    hasToken: Boolean(token),
    hasChallenge: Boolean(challenge),
  });

  if (!verifyToken) {
    console.error('[IG WEBHOOK VERIFY] Missing INSTAGRAM_WEBHOOK_VERIFY_TOKEN/JWT_SECRET');
    return res.status(500).send('Webhook verify token is not configured.');
  }

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[IG WEBHOOK VERIFY] Verification succeeded');
    return res.status(200).send(challenge || '');
  }

  console.warn('[IG WEBHOOK VERIFY] Verification failed', {
    mode,
    tokenMatched: token === verifyToken,
  });

  return res.sendStatus(403);
};

export const receiveInstagramWebhook = async (req, res) => {
  setClickTrackingBaseUrlFromRequest(req);
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = req.body || {};

  console.log(`[IG WEBHOOK ${requestId}] Incoming webhook request`, {
    path: req.originalUrl,
    method: req.method,
    contentType: req.headers['content-type'] || '',
    object: payload?.object || null,
    entryCount: Array.isArray(payload?.entry) ? payload.entry.length : 0,
  });

  res.status(200).send('EVENT_RECEIVED');

  // Process asynchronously so Meta receives a fast 200 response.
  setImmediate(async () => {
    try {
      await processWebhookPayload(payload);
      console.log(`[IG WEBHOOK ${requestId}] Processing completed`);
    } catch (error) {
      console.error(`[IG WEBHOOK ${requestId}] Processing error`, error);
    }
  });
};

/**
 * Test endpoint: simulates a webhook event so you can verify the full pipeline
 * (profile lookup → flow match → DM send) without waiting for Meta.
 *
 * POST /api/auth/instagram/webhook/test
 * Body: { commentText: "LINK", commentId: "optional_real_comment_id" }
 */
export const testWebhook = async (req, res) => {
  const { commentText, commentId } = req.body || {};

  if (!commentText) {
    return res.status(400).json({ message: 'commentText is required in body' });
  }

  // Find all connected profiles
  const profiles = await BrandProfile.find({ instagramIsConnected: true })
    .select('user instagramAccessToken instagramPageAccessToken instagramBusinessAccountId instagramPageId instagramUsername')
    .lean();

  if (profiles.length === 0) {
    return res.status(400).json({ message: 'No connected Instagram profiles found in DB' });
  }

  const profile = profiles[0];
  console.log('\n=== TEST WEBHOOK START ===');
  console.log('Profile:', profile.instagramUsername, '| IG ID:', profile.instagramBusinessAccountId);
  console.log('Has page token:', Boolean(profile.instagramPageAccessToken));
  console.log('Has user token:', Boolean(profile.instagramAccessToken));
  console.log('Comment text:', commentText);

  // Find matching flow
  const matchResult = await findBestFlowMatch({
    userId: profile.user,
    brandId: profile._id,
    incomingText: commentText,
    mediaId: '',
  });

  if (!matchResult.flow) {
    console.log('No matching flow found. Candidates searched:', matchResult.candidateCount);
    return res.status(200).json({
      success: false,
      step: 'flow_match',
      message: `No active flow matched keyword "${commentText}". Found ${matchResult.candidateCount} candidate(s).`,
    });
  }

  console.log('Matched flow:', matchResult.flow._id, '| Score:', matchResult.score);

  const messagePayload = buildDmMessagePayload(matchResult.flow, profile);
  if (!messagePayload) {
    return res.status(200).json({
      success: false,
      step: 'message_build',
      message: 'Flow matched but produced empty message payload.',
    });
  }

  console.log('Message payload to send:', JSON.stringify(messagePayload, null, 2));

  // If no real commentId provided, just do a dry run
  if (!commentId) {
    console.log('=== DRY RUN (no commentId provided) ===');
    return res.status(200).json({
      success: true,
      dryRun: true,
      flowId: matchResult.flow._id,
      matchScore: matchResult.score,
      messagePreview: messagePayload,
      tokenUsed: profile.instagramPageAccessToken ? 'pageToken' : 'userToken',
      note: 'Provide a real commentId in body to actually send the DM.',
    });
  }

  // Actually try to send the DM
  try {
    let pageToken = profile.instagramPageAccessToken;
    if (!pageToken) {
      const accountsRes = await axios.get(`${FB_API_BASE}/me/accounts`, {
        params: { fields: 'id,access_token', access_token: profile.instagramAccessToken }
      });
      const pageData = accountsRes.data.data.find(p => String(p.id) === String(profile.instagramPageId));
      if (pageData) pageToken = pageData.access_token;
    }

    const publicReplyText = buildPublicCommentReplyTextFromTemplate(
      profile.instagramUsername,
      matchResult.flow.commentReplyMessage || ''
    );

    try {
      const publicReplyResult = await sendPublicCommentReply({
        pageToken,
        commentId,
        message: publicReplyText,
      });

      await markCommentReplyPublicSent({
        user: profile.user,
        commentId,
        publicReplyText,
      });

      console.log('=== PUBLIC COMMENT REPLY SENT ===', publicReplyResult);
    } catch (publicReplyError) {
      console.error('=== PUBLIC COMMENT REPLY FAILED ===', publicReplyError?.response?.data || publicReplyError?.message);
    }

    const result = await sendPrivateReply({
      pageToken,
      commentId,
      messagePayload,
      pageId: profile.instagramPageId,
    });

    await queueFollowUpMessage({
      profile,
      flow: matchResult.flow,
      commentId,
      recipientId: result?.recipient_id,
    });

    await markCommentReplyDmSent({
      user: profile.user,
      commentId,
      recipientId: result?.recipient_id,
    });

    console.log('=== DM SENT SUCCESSFULLY ===', result);
    return res.status(200).json({
      success: true,
      dryRun: false,
      flowId: matchResult.flow._id,
      result,
    });
  } catch (error) {
    const providerError = error?.response?.data?.error || error?.response?.data || error?.message;
    console.error('=== DM SEND FAILED ===', providerError);
    return res.status(200).json({
      success: false,
      step: 'send_dm',
      error: providerError,
    });
  }
};
