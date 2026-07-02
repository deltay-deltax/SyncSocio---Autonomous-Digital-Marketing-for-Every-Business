/**
 * Comment Polling Service
 * 
 * Bypasses Meta's webhook delivery restriction for unpublished apps by
 * polling the Instagram Graph API for new comments every 30 seconds.
 * When a new comment is detected, it runs it through the same DM flow
 * matching and private-reply pipeline used by the webhook handler.
 */

import axios from 'axios';
import BrandProfile from '../models/BrandProfile.js';
import DMFlowFollowUp from '../models/DMFlowFollowUp.js';
import DMFlow, { normalizeKeywordInput } from '../models/DMFlow.js';
import {
  buildPublicCommentReplyText,
  buildPublicCommentReplyTextFromTemplate,
  claimCommentReply,
  hasCommentReplyLog,
  markCommentReplyDmSent,
  markCommentReplyPublicSent,
  sendPublicCommentReply,
} from './instagramCommentReplyService.js';

const FB_API_VERSION = 'v25.0';
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;
const POLL_INTERVAL_MS = 300_000; // 5 minutes to avoid rate limits (was 60s for testing)
const clickTrackingBaseUrl = (process.env.BACKEND_PUBLIC_URL || process.env.WEBHOOK_PUBLIC_URL || '').trim();

const safeTrim = (v) => (typeof v === 'string' ? v.trim() : '');

const getConnectedProfileUrl = (profile) => {
  const username = safeTrim(profile?.instagramUsername);
  return username ? `https://instagram.com/${username}` : 'https://instagram.com';
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildTrackedButtonUrl = ({ flowId, buttonId, targetUrl }) => {
  if (!safeTrim(clickTrackingBaseUrl) || !safeTrim(targetUrl)) {
    return targetUrl;
  }

  const trackUrl = new URL('/api/dm-flows/track-click', clickTrackingBaseUrl.replace(/\/+$/, ''));
  trackUrl.searchParams.set('flowId', String(flowId));
  trackUrl.searchParams.set('buttonId', String(buttonId || ''));
  trackUrl.searchParams.set('url', targetUrl);
  return trackUrl.toString();
};

// Track which comments we have already processed so we never double-reply
const processedCommentIds = new Set();
let pollTimer = null;

// ── Keyword matching (duplicated from webhookController to keep this self-contained) ──

const escapeRegExp = (v = '') => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const keywordMatchScore = (incomingText, configuredKeyword) => {
  const incoming = normalizeKeywordInput(incomingText);
  const keyword = normalizeKeywordInput(configuredKeyword);
  if (!incoming || !keyword) return 0;
  if (incoming === keyword) return 3;
  const boundary = new RegExp(`(^|\\W)${escapeRegExp(keyword)}(\\W|$)`, 'i');
  if (boundary.test(incoming)) return 2;
  if (incoming.includes(keyword)) return 1;
  return 0;
};

const findBestFlowMatch = async ({ userId, brandId, incomingText, mediaId }) => {
  const query = {
    user: userId,
    $or: [{ brandId }, { brandId: { $exists: false } }],
    active: true,
    trigger: 'comment'
  };
  if (safeTrim(mediaId)) {
    query.$or = [
      { targetType: 'all' },
      { targetType: 'specific', targetMediaId: safeTrim(mediaId) },
    ];
    if (brandId) {
      query.$and = [
        { user: userId },
        { $or: [{ brandId }, { brandId: { $exists: false } }] }
      ];
    }
  } else {
    query.targetType = 'all';
  }

  const candidates = await DMFlow.find(query).sort({ updatedAt: -1 }).limit(50);
  let bestFlow = null;
  let bestScore = 0;

  for (const flow of candidates) {
    const score = keywordMatchScore(incomingText, flow.keywordNormalized || flow.keyword);
    if (score > bestScore) {
      bestScore = score;
      bestFlow = flow;
      if (bestScore === 3) break;
    }
  }

  return { flow: bestFlow, score: bestScore };
};

// ── Build DM text (same logic as webhook controller) ──

const buildDmMessagePayload = (flow, profile) => {
  if (!Array.isArray(flow.messages) || flow.messages.length === 0) return null;

  const hookMessage = flow.messages[0];
  const hookText = safeTrim(hookMessage?.text) || 'Thanks for reaching out!';
  const buttons = hookMessage?.buttons || [];

  if (buttons.length === 0) {
    return { text: hookText.slice(0, 1000) };
  }

  // Map only our first button to the Instagram UI button (Meta limit is 3, but 1 is cleanest)
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

const buildCommentReplyText = (actorUsername, template) => buildPublicCommentReplyTextFromTemplate(actorUsername, template);

const getPendingFollowUpMessageIndex = (flow) => {
  if (!Array.isArray(flow?.messages)) return -1;

  return flow.messages.findIndex((message, index) => index > 0 && message?.conditional === 'if_following');
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

// ── Send Private Reply via Messaging API ──

const sendPrivateReply = async ({ pageToken, commentId, messagePayload, pageId }) => {
    console.log(`[POLLER] 📡 POSTING to: ${FB_API_BASE}/${pageId}/messages`);
    const response = await axios.post(
      `${FB_API_BASE}/${pageId}/messages`,
      { recipient: { comment_id: commentId }, message: messagePayload },
      {
        params: { access_token: pageToken },
      headers: { 'Content-Type': 'application/json' },
      timeout: 20_000,
    }
  );
  return response.data;
};

// ── Resolve Page Access Token ──

const resolvePageToken = async (profile) => {
  if (profile.instagramPageAccessToken) return profile.instagramPageAccessToken;

  console.log('[POLLER] Page token missing, fetching on the fly...');
  const res = await axios.get(`${FB_API_BASE}/me/accounts`, {
    params: { fields: 'id,access_token', access_token: profile.instagramAccessToken },
  });
  const page = res.data.data.find((p) => String(p.id) === String(profile.instagramPageId));
  return page?.access_token || null;
};

// ── Core polling logic ──

const pollProfileComments = async (profile) => {
  const igId = profile.instagramBusinessAccountId;
  const token = profile.instagramAccessToken;

  if (!igId || !token) return;

  console.log(`[POLLER] 🔍 Checking for new comments on ${profile.instagramUsername || profile.instagramPageId}...`);

  try {
    // 1. Fetch recent media (last 5 posts)
    const mediaRes = await axios.get(`${FB_API_BASE}/${igId}/media`, {
      params: { fields: 'id', limit: 5, access_token: token },
    });

    const mediaItems = mediaRes.data?.data || [];
    if (mediaItems.length === 0) return;

    for (const media of mediaItems) {
      // 2. Fetch comments on each media
      const commentsRes = await axios.get(`${FB_API_BASE}/${media.id}/comments`, {
        params: { fields: 'id,text,username,timestamp', access_token: token },
      });

      const comments = commentsRes.data?.data || [];

      for (const comment of comments) {
        // 1. Skip already-processed comments in-memory
        if (processedCommentIds.has(comment.id)) continue;

        const existingReplyLog = await hasCommentReplyLog({ user: profile.user, commentId: comment.id });
        if (existingReplyLog) {
          processedCommentIds.add(comment.id);
          continue;
        }

        // 2. Double-check database to prevent double-replies across server restarts
        const alreadyProcessed = await DMFlowFollowUp.findOne({ commentId: comment.id }).lean();
        if (alreadyProcessed) {
          processedCommentIds.add(comment.id);
          continue;
        }

        // Mark as processed IMMEDIATELY to prevent double-processing
        processedCommentIds.add(comment.id);

        // 3. Skip old comments (older than 5 minutes) to avoid replying to historical data
        const commentAge = Date.now() - new Date(comment.timestamp).getTime();
        if (commentAge > 5 * 60 * 1000) {
          processedCommentIds.add(comment.id);
          continue;
        }

        console.log(`[POLLER] New comment detected! ID: ${comment.id} | Text: "${comment.text}" | By: ${comment.username}`);

        // 3. Match against DM flows
        const matchResult = await findBestFlowMatch({
          userId: profile.user,
          brandId: profile._id,
          incomingText: comment.text,
          mediaId: media.id,
        });

        if (!matchResult.flow) {
          console.log(`[POLLER] No flow matched for "${comment.text}"`);
          continue;
        }

        console.log(`[POLLER] Matched flow: ${matchResult.flow.name} (score=${matchResult.score})`);

        const publicReplyText = buildCommentReplyText(comment.username, matchResult.flow.commentReplyMessage || '');
        const claim = await claimCommentReply({
          user: profile.user,
          commentId: comment.id,
          flow: matchResult.flow._id,
          mediaId: media.id,
          actorUsername: comment.username,
          commentText: comment.text,
          publicReplyText,
        });

        if (!claim) {
          console.log(`[POLLER] Skipping comment ${comment.id} because it was already claimed.`);
          continue;
        }

        // 4. Build message
        const messagePayload = buildDmMessagePayload(matchResult.flow, profile);
        if (!messagePayload) {
          console.log('[POLLER] Empty message from flow, skipping');
          continue;
        }

        // 5. Increment triggered stat
        await DMFlow.updateOne({ _id: matchResult.flow._id }, { $inc: { 'stats.triggered': 1 } });

        // 6. Send the DM
        try {
          const pageToken = await resolvePageToken(profile);
          if (!pageToken) {
            console.error('[POLLER] Could not resolve page token, skipping DM');
            continue;
          }

          try {
            const publicReplyResult = await sendPublicCommentReply({
              pageToken,
              commentId: comment.id,
              message: publicReplyText,
            });

            await markCommentReplyPublicSent({
              user: profile.user,
              commentId: comment.id,
              publicReplyText,
            });

            console.log('[POLLER] Public comment reply sent:', publicReplyResult);
          } catch (publicReplyError) {
            console.error('[POLLER] Public comment reply failed:', publicReplyError?.response?.data || publicReplyError?.message);
          }

          // Humanize: wait 1.5s before replying
          await sleep(1500);

          console.log('[POLLER] Sending DM payload:', JSON.stringify(messagePayload));

          const result = await sendPrivateReply({
            pageToken,
            commentId: comment.id,
            messagePayload: messagePayload,
            pageId: profile.instagramPageId,
          });

          await queueFollowUpMessage({
            profile,
            flow: matchResult.flow,
            commentId: comment.id,
            recipientId: result?.recipient_id,
          });

          await markCommentReplyDmSent({
            user: profile.user,
            commentId: comment.id,
            recipientId: result?.recipient_id,
          });

          await DMFlow.updateOne({ _id: matchResult.flow._id }, { $inc: { 'stats.replied': 1 } });

          console.log(`[POLLER] ✅ DM SENT SUCCESSFULLY to ${comment.username}!`, {
            commentId: comment.id,
            flowName: matchResult.flow.name,
            recipientId: result.recipient_id,
          });
        } catch (dmError) {
          const metaErr = dmError?.response?.data?.error || dmError.message;
          console.error(`[POLLER] ❌ DM send failed for comment ${comment.id}:`, metaErr);
        }
      }
    }
  } catch (error) {
    const metaErr = error?.response?.data?.error || error.message;
    // Don't spam logs for token issues - just log once
    if (metaErr?.code === 190 || (metaErr?.code === 100 && metaErr?.error_subcode === 33)) {
      console.error(`[POLLER] Access token invalid or missing permissions for ${profile.instagramUsername || profile.instagramPageId}. Marking as disconnected.`);
      // Mark as disconnected in DB so feed/auditor endpoints stop hitting the dead token
      try {
        await BrandProfile.findOneAndUpdate(
          { _id: profile._id },
          { $set: { instagramIsConnected: false } }
        );
      } catch (_) { /* best effort */ }
      return; // Skip this profile, poller will try others
    }
    if (metaErr?.code === 80002 || metaErr?.code === 4 || metaErr?.code === 17 || metaErr?.code === 32) {
      console.error('[POLLER] Rate limit hit. Sleeping for 15 minutes to recover.');
      await sleep(15 * 60 * 1000); // Recursive setTimeout will wait for this to finish
      return;
    }
    console.error('[POLLER] Error during polling cycle:', metaErr);
  }
};

const runPollCycle = async () => {
  try {
    // Find all profiles with Instagram connected
    const profiles = await BrandProfile.find({
      instagramIsConnected: true,
      instagramAccessToken: { $exists: true, $ne: '' },
      instagramBusinessAccountId: { $exists: true, $ne: '' },
    }).lean();

    if (profiles.length === 0) return;

    // Deduplicate profiles by instagramBusinessAccountId to avoid duplicate requests and hitting rate limits
    const uniqueProfiles = [];
    const seenAccountIds = new Set();

    for (const profile of profiles) {
      const accountId = profile.instagramBusinessAccountId;
      if (!seenAccountIds.has(accountId)) {
        seenAccountIds.add(accountId);
        uniqueProfiles.push(profile);
      }
    }

    for (const profile of uniqueProfiles) {
      await pollProfileComments(profile);
    }
  } catch (err) {
    console.error('[POLLER] Unexpected error in poll cycle:', err.message);
  }
};

// ── Public API ──

export const startPolling = () => {
  if (pollTimer) return; // Already running

  console.log(`[POLLER] 🚀 Comment polling started (every ${POLL_INTERVAL_MS / 1000}s)`);

  // Run the first cycle after a short delay to let the server finish starting
  pollTimer = setTimeout(async () => {
    console.log('[POLLER] Seeding previously replied comments from DB...');
    try {
      const existingReplies = await DMFlowFollowUp.find({ commentId: { $exists: true } }).select('commentId').lean();
      for (const reply of existingReplies) {
        if (reply.commentId) processedCommentIds.add(reply.commentId);
      }
      console.log(`[POLLER] Seeded ${processedCommentIds.size} comments from database.`);
    } catch (e) {
      console.error('[POLLER] Database seeding failed:', e.message);
    }

    console.log('[POLLER] ✅ Now actively watching for new comments...');
    
    // Now start the regular recursive polling to prevent overlaps
    const loop = async () => {
      await runPollCycle();
      pollTimer = setTimeout(loop, POLL_INTERVAL_MS);
    };
    loop();
  }, 5000);
};

export const stopPolling = () => {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
    console.log('[POLLER] Polling stopped');
  }
};
