import User from '../models/User.js';
import { logActivity } from '../utils/activityLogger.js';
import Transaction from '../models/Transaction.js';
import Coupon from '../models/Coupon.js';
import CreditLedger from '../models/CreditLedger.js';

// Credit amounts per plan tier
const PLAN_CREDITS = {
  'Starter': 80,
  'Growth': 400,
  'Pro': 1000,
  'Elite': 700,
  'Elite SD': 700,
  'Elite HD': 700,
  'Agency': 1750,
  'SyncSocio Starter': 80,
  'SyncSocio Growth': 400,
  'SyncSocio Pro': 1000,
  'SyncSocio Elite': 700,
  'SyncSocio Elite SD': 700,
  'SyncSocio Elite HD': 700,
  'SyncSocio Agency': 1750,
};

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

    let creditsToAdd = PLAN_CREDITS[plan] || PLAN_CREDITS[`SyncSocio ${plan}`] || 200;

    // Check if the user already paid for this plan setup via Razorpay in the last 15 minutes.
    // If they did, we don't want to double-assign the plan credits or create duplicate transaction logs.
    const completedTx = await Transaction.findOne({
      user: req.user._id,
      type: { $in: ['plan_purchase', 'plan_renewal', 'plan_upgrade'] },
      status: 'completed',
      createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
    });

    if (completedTx) {
      const currentUser = await User.findById(req.user._id).select('credits plan');
      return res.json({
        credits: currentUser?.credits || 0,
        plan: currentUser?.plan || '',
        assigned: 0,
        message: '✅ Plan was already activated via payment gateway.',
      });
    }

    // Calculate billing amount (₹)
    let basePrice = 399;
    const pl = plan.toLowerCase();
    if (pl.includes('pro')) basePrice = 3499;
    else if (pl.includes('growth')) basePrice = 1499;
    else if (pl.includes('agency')) basePrice = 4999;
    else if (pl.includes('elite')) basePrice = 2199;
    else basePrice = 399; // Starter plan
    
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
    await CreditLedger.create({
      user: req.user._id,
      amount: creditsToAdd,
      balanceAfter: user.credits,
      action: 'added',
      reason: `Plan assigned (${plan})`
    });

    // Create a transaction record only if they didn't already get one from Razorpay
    if (!completedTx) {
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

      if (couponCode) {
        await Coupon.updateOne({ code: couponCode.toUpperCase().trim() }, { $inc: { timesUsed: 1 } });
      }
    }

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
      { $inc: { credits: -cost, totalCreditsConsumed: cost } },
      { new: true, select: 'credits plan totalCreditsConsumed' }
    );
    await CreditLedger.create({
      user: req.user._id,
      amount: cost,
      balanceAfter: updated.credits,
      action: 'deducted',
      reason: reason || 'AI generation'
    });

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
    if (user) {
      await CreditLedger.create({
        user: req.user._id,
        amount: creditsToAdd,
        balanceAfter: user.credits,
        action: 'added',
        reason: 'Credits top-up'
      });
    }

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

// ─── GET credit ledger ────────────────────────────────────────────────
export const getLedger = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const ledger = await CreditLedger.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await CreditLedger.countDocuments({ user: req.user._id });

    return res.json({
      ledger,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('[Credits] getLedger error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};
