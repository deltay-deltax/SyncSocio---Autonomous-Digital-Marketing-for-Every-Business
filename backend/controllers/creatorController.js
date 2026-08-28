import Creator from '../models/Creator.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import crypto from 'crypto';

// ── Public Routes (Used by Tracking & Dashboard) ────────────────────────────

export const trackClick = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Code required' });

    const creator = await Creator.findOneAndUpdate(
      { code: code.toUpperCase() },
      { $inc: { clicks: 1 } },
      { new: true }
    );

    if (!creator) return res.status(404).json({ success: false, message: 'Creator not found' });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('trackClick error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getCreatorDashboard = async (req, res) => {
  try {
    const { token } = req.params;
    const creator = await Creator.findOne({ dashboardToken: token });
    if (!creator) {
      return res.status(404).json({ success: false, message: 'Dashboard not found' });
    }

    // Find all users referred by this creator
    const referredUsers = await User.find({ referredBy: creator.code });
    const userIds = referredUsers.map(u => u._id);

    // Find transactions for these users
    const transactions = await Transaction.find({
      user: { $in: userIds },
      status: 'completed',
      type: { $in: ['plan_purchase', 'plan_upgrade', 'plan_renewal'] }
    });

    let totalEarned = 0;
    let eligibleSignups = 0;

    referredUsers.forEach(user => {
      // Check if user has active transaction within 60 days
      const userTxs = transactions.filter(t => t.user.toString() === user._id.toString());
      if (userTxs.length > 0) eligibleSignups++;

      userTxs.forEach(tx => {
        const txDate = new Date(tx.createdAt);
        // Only count transactions within 60 days of CREATOR link generation
        const diffDays = (txDate - new Date(creator.createdAt)) / (1000 * 60 * 60 * 24);
        if (diffDays <= 60) {
          totalEarned += (tx.amount * 0.25);
        }
      });
    });

    return res.status(200).json({
      success: true,
      creator: {
        name: creator.name,
        code: creator.code,
        clicks: creator.clicks,
        signups: referredUsers.length,
        eligibleSignups,
        totalEarned,
        totalPaid: creator.totalPaid,
        pendingBalance: totalEarned - creator.totalPaid,
        payoutRequested: creator.payoutRequested
      }
    });
  } catch (error) {
    console.error('getCreatorDashboard error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const requestPayout = async (req, res) => {
  try {
    const { token } = req.params;
    const creator = await Creator.findOneAndUpdate(
      { dashboardToken: token },
      { payoutRequested: true },
      { new: true }
    );
    if (!creator) return res.status(404).json({ success: false, message: 'Dashboard not found' });
    return res.status(200).json({ success: true, message: 'Payout requested successfully' });
  } catch (error) {
    console.error('requestPayout error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Admin Routes ─────────────────────────────────────────────────────────────

export const getAllCreators = async (req, res) => {
  try {
    const creators = await Creator.find().sort({ createdAt: -1 });
    
    // We also need to compute their stats dynamically for the admin table
    const enhancedCreators = [];
    for (const c of creators) {
      const referredUsers = await User.find({ referredBy: c.code });
      const userIds = referredUsers.map(u => u._id);
      const transactions = await Transaction.find({
        user: { $in: userIds },
        status: 'completed',
        type: { $in: ['plan_purchase', 'plan_upgrade', 'plan_renewal'] }
      });

      let totalEarned = 0;
      let totalRevenue = 0;
      referredUsers.forEach(user => {
        const userTxs = transactions.filter(t => t.user.toString() === user._id.toString());
        userTxs.forEach(tx => {
          const txDate = new Date(tx.createdAt);
          const diffDays = (txDate - new Date(c.createdAt)) / (1000 * 60 * 60 * 24);
          if (diffDays <= 60) {
            totalEarned += (tx.amount * 0.25);
            totalRevenue += tx.amount;
          }
        });
      });

      enhancedCreators.push({
        ...c.toObject(),
        signups: referredUsers.length,
        totalEarned,
        totalRevenue,
        pendingBalance: totalEarned - c.totalPaid
      });
    }

    return res.status(200).json({ success: true, creators: enhancedCreators });
  } catch (error) {
    console.error('getAllCreators error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createCreator = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    // Generate unique code based on name
    const baseCode = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    let code = baseCode.substring(0, 8);
    let count = 1;
    while (await Creator.findOne({ code })) {
      code = `${baseCode.substring(0, 6)}${count}`;
      count++;
    }

    const creator = await Creator.create({
      name,
      code,
      dashboardToken: crypto.randomUUID()
    });

    return res.status(201).json({ success: true, creator });
  } catch (error) {
    console.error('createCreator error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const markPayoutPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body; // Admin passes the amount they paid
    
    if (amount === undefined || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount required' });
    }

    const creator = await Creator.findById(id);
    if (!creator) return res.status(404).json({ success: false, message: 'Creator not found' });

    creator.totalPaid += Number(amount);
    creator.payoutRequested = false;
    await creator.save();

    return res.status(200).json({ success: true, creator });
  } catch (error) {
    console.error('markPayoutPaid error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
