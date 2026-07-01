import User from '../models/User.js';
import { logActivity } from '../utils/activityLogger.js';
import Transaction from '../models/Transaction.js';
import Coupon from '../models/Coupon.js';

// Credit amounts per plan tier (random within range)
const PLAN_CREDITS = {
  'SyncSocio Starter': { min: 1200, max: 1500 },
  'SyncSocio PRO':     { min: 2800, max: 3200 },
  'SyncSocio Elite':   { min: 5500, max: 6000 },
};

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── GET credits ─────────────────────────────────────────────────────
export const getCredits = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('credits plan');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json({ credits: user.credits ?? 0, plan: user.plan ?? '' });
  } catch (err) {
    console.error('[Credits] getCredits error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─── ASSIGN credits (called from onboarding plan selection) ──────────
export const assignCredits = async (req, res) => {
  try {
    const { plan, isDmEnabled, couponCode } = req.body;
    if (!plan) return res.status(400).json({ message: 'Plan is required.' });

    const range = PLAN_CREDITS[plan] || { min: 500, max: 800 };
    const creditsToAdd = randomInRange(range.min, range.max);

    // Calculate billing amount (₹)
    let basePrice = 999;
    const pl = plan.toLowerCase();
    if (pl.includes('growth') || pl.includes('elite') || pl.includes('pro')) basePrice = 1899;
    else basePrice = 599; // Starter/Brand plan
    
    let sum = basePrice + (isDmEnabled ? 399 : 0);
    let discountPercentage = 0;
    let discountAmount = 0;
    
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim(), isActive: true });
      if (coupon && (!coupon.expiryDate || new Date(coupon.expiryDate) > new Date())) {
        discountPercentage = coupon.discountPercentage;
        discountAmount = Math.floor((sum * discountPercentage) / 100);
      }
    }
    
    const finalAmount = sum - discountAmount;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { credits: creditsToAdd }, $set: { plan } },
      { new: true, select: 'credits plan' }
    );

    // Create a transaction record
    await Transaction.create({
      user: req.user._id,
      plan: plan,
      type: 'plan_purchase',
      amount: finalAmount,
      creditsAdded: creditsToAdd,
      discountPercentage,
      discountAmount,
      couponCode: couponCode || '',
      status: 'completed'
    });

    // Create billing notification
    const { createNotification } = await import('../utils/notificationHelper.js');
    await createNotification(
      req.user._id,
      'billing',
      'Plan Activated',
      `Welcome to ${plan}! Your account has been credited with ${creditsToAdd} credits.`
    );

    return res.json({
      credits: user.credits,
      plan: user.plan,
      assigned: creditsToAdd,
      message: `✅ ${creditsToAdd} credits added for ${plan}`,
    });
  } catch (err) {
    console.error('[Credits] assignCredits error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─── DEDUCT credits ───────────────────────────────────────────────────
export const deductCredits = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const cost = parseInt(amount, 10);
    if (!cost || cost <= 0) return res.status(400).json({ message: 'Invalid credit amount.' });

    const user = await User.findById(req.user._id).select('credits plan');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if ((user.credits ?? 0) < cost) {
      return res.status(402).json({
        message: 'Insufficient credits.',
        credits: user.credits ?? 0,
        required: cost,
      });
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { credits: -cost } },
      { new: true, select: 'credits plan' }
    );

    // Log agent activity
    const isVideo = reason && reason.toLowerCase().includes('video');
    const isAllInOne = reason && reason.toLowerCase().includes('all-in-one');
    const agentName = isVideo ? 'Video Agent' : isAllInOne ? 'Drop Agent' : 'Creative Agent';
    const activityMsg = `Asset generation complete. Spent ${cost} credits on ${reason || 'AI generation'}.`;
    await logActivity(req.user._id, agentName, activityMsg, 'done');

    return res.json({
      credits: updated.credits,
      deducted: cost,
      reason: reason || 'generation',
      message: `${cost} credits used for ${reason || 'generation'}.`,
    });
  } catch (err) {
    console.error('[Credits] deductCredits error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─── TOPUP credits (called from purchasing top-ups) ──────────────────
export const topupCredits = async (req, res) => {
  try {
    const { amount } = req.body;
    const creditsToAdd = parseInt(amount, 10);
    if (!creditsToAdd || creditsToAdd <= 0) return res.status(400).json({ message: 'Invalid credit amount.' });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { credits: creditsToAdd } },
      { new: true, select: 'credits plan' }
    );

    if (!user) return res.status(404).json({ message: 'User not found.' });

    const { createNotification } = await import('../utils/notificationHelper.js');
    await createNotification(
      req.user._id,
      'billing',
      'Credits Purchased',
      `Successfully purchased and added ${creditsToAdd} top-up credits.`
    );

    return res.json({
      credits: user.credits,
      message: `✅ Successfully added ${creditsToAdd} top-up credits.`,
    });
  } catch (err) {
    console.error('[Credits] topupCredits error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};
