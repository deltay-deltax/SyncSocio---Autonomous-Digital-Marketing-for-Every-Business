/**
 * nexaNudgeScheduler.js
 * Polls every 1 minute for NexaConversations that need the 8-minute nudge.
 * Uses node-cron (already in package.json).
 */

import cron from 'node-cron';
import NexaConversation from '../models/NexaConversation.js';
import BrandProfile from '../models/BrandProfile.js';

// sendStandardMessage is imported lazily to avoid circular deps
let _sendStandardMessage;
const getSend = async () => {
  if (!_sendStandardMessage) {
    const mod = await import('../controllers/instagramWebhookController.js');
    _sendStandardMessage = mod.sendStandardMessageExternal;
  }
  return _sendStandardMessage;
};

const NUDGE_TEXT = "Want me to help you place the order? 😊 Just say yes and I'll guide you through it!";

const processDueNudges = async () => {
  try {
    const due = await NexaConversation.find({
      stage: 'AWAITING_FOLLOWUP',
      nudge_due_at: { $lte: new Date() },
      nudge_sent: { $ne: true },
    }).lean();

    if (due.length === 0) return;
    console.log(`[NexaNudge] Processing ${due.length} due nudge(s)...`);

    const send = await getSend();

    for (const convo of due) {
      // Race safety: re-fetch fresh state
      const fresh = await NexaConversation.findById(convo._id);
      if (!fresh || fresh.stage !== 'AWAITING_FOLLOWUP' || fresh.nudge_sent) {
        console.log(`[NexaNudge] Skipping ${convo._id} — state changed.`);
        continue;
      }

      try {
        // Fetch brand profile for tokens
        const brand = await BrandProfile.findById(convo.brand_id).select(
          'instagramPageAccessToken instagramAccessToken instagramPageId instagramUsername user'
        ).lean();

        if (!brand?.instagramPageId) {
          console.warn(`[NexaNudge] Brand ${convo.brand_id} missing page credentials. Skipping.`);
          continue;
        }

        const pageToken = brand.instagramPageAccessToken || brand.instagramAccessToken;
        if (!pageToken) {
          console.warn(`[NexaNudge] No page token for brand ${brand.instagramUsername}. Skipping.`);
          continue;
        }

        if (send) {
          await send({
            pageToken,
            igScopedId: convo.ig_user_id,
            messagePayload: { text: NUDGE_TEXT },
            pageId: brand.instagramPageId,
          });
        }

        // Mark nudge as sent but keep stage at AWAITING_FOLLOWUP.
        // When the customer replies, the Nexa handler will properly transition the stage.
        await NexaConversation.updateOne(
          { _id: convo._id },
          {
            $set: { nudge_sent: true },
            $push: {
              conversation_history: {
                role: 'nexa',
                text: NUDGE_TEXT,
                ts: new Date(),
              },
            },
          }
        );

        console.log(`[NexaNudge] ✅ Nudge sent to ${convo.ig_user_id} for brand ${brand.instagramUsername}`);

        // Notify brand owner
        try {
          const { createNotification } = await import('../utils/notificationHelper.js');
          await createNotification(
            brand.user,
            'insight',
            '🤖 Nexa: Follow-up Nudge Sent',
            `Nexa sent a follow-up to a warm lead who showed interest via comment.`
          );
        } catch (e) {}

      } catch (err) {
        console.error(`[NexaNudge] Failed for conversation ${convo._id}:`, err?.response?.data || err.message);
      }
    }
  } catch (err) {
    console.error('[NexaNudge] Scheduler error:', err.message);
  }
};

export const startNexaNudgeScheduler = () => {
  // Run every 1 minute
  cron.schedule('* * * * *', processDueNudges);
  console.log('[NexaNudge] ⏰ Nudge scheduler started (every 1 minute)');
};
