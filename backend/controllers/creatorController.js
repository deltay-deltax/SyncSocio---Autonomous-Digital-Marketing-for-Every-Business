import Creator from '../models/Creator.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import BrandProfile from '../models/BrandProfile.js';
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

    // Find all users referred by this creator (case-insensitive for safety)
    const referredUsersDocs = await User.find({ referredBy: new RegExp(`^${creator.code}$`, 'i') });
    const userIds = referredUsersDocs.map(u => u._id);

    // Find all brand profiles for these users
    const brandProfiles = await BrandProfile.find({ user: { $in: userIds } });
    const getBrandName = (userId) => {
      const bp = brandProfiles.find(b => b.user.toString() === userId.toString());
      return bp?.brandName || '—';
    };

    // Find transactions for these users
    const transactions = await Transaction.find({
      user: { $in: userIds },
      status: 'completed',
      type: { $in: ['plan_purchase', 'plan_upgrade', 'plan_renewal'] }
    }).sort({ createdAt: -1 });

    let totalEarned = 0;
    let totalRevenue = 0;
    let eligibleSignups = 0;

    const conversions = [];
    const referredUsersList = [];

    referredUsersDocs.forEach(user => {
      const userTxs = transactions.filter(t => t.user.toString() === user._id.toString());
      if (userTxs.length > 0) eligibleSignups++;

      let userTotalSpend = 0;
      let userCommissionGenerated = 0;
      const brandName = getBrandName(user._id);

      userTxs.forEach(tx => {
        const txDate = new Date(tx.createdAt);
        // Track within 60 days of either CREATOR link generation OR user signup (usually affiliate standard is user signup, but we preserve legacy logic or both)
        const diffDays = (txDate - new Date(creator.createdAt)) / (1000 * 60 * 60 * 24);
        const isEligible = diffDays <= 60; // Existing rule
        
        const commissionAmount = Number((tx.amount * 0.25).toFixed(2));
        
        if (isEligible) {
          totalEarned += commissionAmount;
          totalRevenue += tx.amount;
        }

        userTotalSpend += tx.amount;
        userCommissionGenerated += (isEligible ? commissionAmount : 0);

        conversions.push({
          _id: tx._id,
          customerName: user.name || user.email?.split('@')[0] || 'Customer',
          customerEmail: user.email,
          brandName: brandName,
          plan: tx.plan || user.plan || 'Plan Purchase',
          type: tx.type,
          amount: tx.amount,
          commissionRate: '25%',
          commissionAmount: commissionAmount,
          date: tx.createdAt,
          status: tx.status,
          isEligible: isEligible
        });
      });

      referredUsersList.push({
        _id: user._id,
        customerName: user.name || user.email?.split('@')[0] || 'Customer',
        brandName: brandName,
        signupDate: user.createdAt,
        currentPlan: user.plan || 'Free',
        totalSpend: userTotalSpend,
        commissionGenerated: userCommissionGenerated,
        status: userTxs.length > 0 ? 'Subscribed' : 'Registered / Trial'
      });
    });

    // Sort referred users by date descending
    referredUsersList.sort((a, b) => new Date(b.signupDate) - new Date(a.signupDate));

    return res.status(200).json({
      success: true,
      creator: {
        name: creator.name,
        code: creator.code,
        clicks: creator.clicks,
        signups: referredUsersDocs.length,
        eligibleSignups,
        totalRevenue,
        totalEarned,
        totalPaid: creator.totalPaid,
        pendingBalance: totalEarned - creator.totalPaid,
        payoutRequested: creator.payoutRequested,
        createdAt: creator.createdAt
      },
      conversions,
      referredUsers: referredUsersList
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
    
    const enhancedCreators = [];
    const allConversions = [];
    
    // Summary metrics
    let totalClicks = 0;
    let totalSignups = 0;
    let totalRevenue = 0;
    let totalCommission = 0;
    let totalPaid = 0;
    let payoutsRequestedCount = 0;

    for (const c of creators) {
      totalClicks += c.clicks;
      totalPaid += c.totalPaid;
      if (c.payoutRequested) payoutsRequestedCount++;

      const referredUsers = await User.find({ referredBy: new RegExp(`^${c.code}$`, 'i') });
      const userIds = referredUsers.map(u => u._id);
      
      const brandProfiles = await BrandProfile.find({ user: { $in: userIds } });
      const getBrandName = (userId) => {
        const bp = brandProfiles.find(b => b.user.toString() === userId.toString());
        return bp?.brandName || '—';
      };

      const transactions = await Transaction.find({
        user: { $in: userIds },
        status: 'completed',
        type: { $in: ['plan_purchase', 'plan_upgrade', 'plan_renewal'] }
      });

      let creatorEarned = 0;
      let creatorRevenue = 0;
      let eligibleSignups = 0;
      const creatorConversions = [];
      const creatorReferredUsers = [];

      referredUsers.forEach(user => {
        const userTxs = transactions.filter(t => t.user.toString() === user._id.toString());
        if (userTxs.length > 0) eligibleSignups++;

        const brandName = getBrandName(user._id);
        let userTotalSpend = 0;
        let userCommissionGenerated = 0;

        userTxs.forEach(tx => {
          const txDate = new Date(tx.createdAt);
          const diffDays = (txDate - new Date(c.createdAt)) / (1000 * 60 * 60 * 24);
          const isEligible = diffDays <= 60;
          
          const commissionAmount = Number((tx.amount * 0.25).toFixed(2));
          
          if (isEligible) {
            creatorEarned += commissionAmount;
            creatorRevenue += tx.amount;
          }

          userTotalSpend += tx.amount;
          userCommissionGenerated += (isEligible ? commissionAmount : 0);

          const conversion = {
            _id: tx._id,
            customerName: user.name || user.email?.split('@')[0] || 'Customer',
            customerEmail: user.email,
            brandName: brandName,
            creatorId: c._id,
            creatorName: c.name,
            creatorCode: c.code,
            plan: tx.plan || user.plan || 'Plan Purchase',
            type: tx.type,
            amount: tx.amount,
            commissionRate: '25%',
            commissionAmount: commissionAmount,
            date: tx.createdAt,
            status: tx.status,
            isEligible: isEligible
          };
          creatorConversions.push(conversion);
          allConversions.push(conversion);
        });

        creatorReferredUsers.push({
          _id: user._id,
          customerName: user.name || user.email?.split('@')[0] || 'Customer',
          brandName: brandName,
          signupDate: user.createdAt,
          currentPlan: user.plan || 'Free',
          totalSpend: userTotalSpend,
          commissionGenerated: userCommissionGenerated,
          status: userTxs.length > 0 ? 'Subscribed' : 'Registered / Trial'
        });
      });

      totalSignups += referredUsers.length;
      totalRevenue += creatorRevenue;
      totalCommission += creatorEarned;

      creatorConversions.sort((a, b) => new Date(b.date) - new Date(a.date));
      creatorReferredUsers.sort((a, b) => new Date(b.signupDate) - new Date(a.signupDate));

      enhancedCreators.push({
        ...c.toObject(),
        signups: referredUsers.length,
        eligibleSignups,
        totalEarned: creatorEarned,
        totalRevenue: creatorRevenue,
        pendingBalance: creatorEarned - c.totalPaid,
        conversions: creatorConversions,
        referredUsers: creatorReferredUsers
      });
    }

    allConversions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const summary = {
      totalCreators: creators.length,
      totalClicks,
      totalSignups,
      totalRevenue,
      totalCommission,
      totalPaid,
      totalPending: totalCommission - totalPaid,
      payoutsRequestedCount
    };

    return res.status(200).json({ 
      success: true, 
      creators: enhancedCreators,
      allConversions,
      summary
    });
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
