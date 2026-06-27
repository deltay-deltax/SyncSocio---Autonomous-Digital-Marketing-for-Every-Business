import User from '../models/User.js';

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
    const { plan } = req.body;
    if (!plan) return res.status(400).json({ message: 'Plan is required.' });

    const range = PLAN_CREDITS[plan] || { min: 500, max: 800 };
    const creditsToAdd = randomInRange(range.min, range.max);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { credits: creditsToAdd }, $set: { plan } },
      { new: true, select: 'credits plan' }
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
