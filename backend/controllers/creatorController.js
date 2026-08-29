import Creator from '../models/Creator.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import BrandProfile from '../models/BrandProfile.js';
import crypto from 'crypto';

const DEFAULT_TERMS = Object.freeze({ initialCommissionRate: 25, initialCommissionMonths: 2, retentionCommissionRate: 20, retentionCommissionMonths: 2 });
const termKeys = Object.keys(DEFAULT_TERMS);

const addMonths = (date, months) => {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  result.setDate(Math.min(day, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()));
  return result;
};

const termsForUser = (user, creator) => ({
  initialCommissionRate: user.referralTerms?.initialCommissionRate ?? creator.initialCommissionRate ?? DEFAULT_TERMS.initialCommissionRate,
  initialCommissionMonths: user.referralTerms?.initialCommissionMonths ?? creator.initialCommissionMonths ?? DEFAULT_TERMS.initialCommissionMonths,
  retentionCommissionRate: user.referralTerms?.retentionCommissionRate ?? creator.retentionCommissionRate ?? DEFAULT_TERMS.retentionCommissionRate,
  retentionCommissionMonths: user.referralTerms?.retentionCommissionMonths ?? creator.retentionCommissionMonths ?? DEFAULT_TERMS.retentionCommissionMonths
});

const commissionForTransaction = (transaction, user, creator, firstPaymentDate) => {
  const terms = termsForUser(user, creator);
  const referralDate = new Date(firstPaymentDate || user.referralDate || user.createdAt);
  const transactionDate = new Date(transaction.createdAt);
  const initialEndsAt = addMonths(referralDate, terms.initialCommissionMonths);
  const retentionEndsAt = addMonths(initialEndsAt, terms.retentionCommissionMonths);
  let rate = 0;
  let commissionPeriod = 'Outside commission period';
  if (transactionDate >= referralDate && transactionDate < initialEndsAt) {
    rate = terms.initialCommissionRate;
    commissionPeriod = 'Initial period';
  } else if (transactionDate >= initialEndsAt && transactionDate < retentionEndsAt) {
    rate = terms.retentionCommissionRate;
    commissionPeriod = 'Retention period';
  }
  return { isEligible: rate > 0, commissionRate: rate, commissionAmount: Number((transaction.amount * rate / 100).toFixed(2)), commissionPeriod, referralDate, initialEndsAt, retentionEndsAt };
};

const referralQuery = (creator) => ({ $or: [{ referralCreator: creator._id }, { referredBy: new RegExp(`^${creator.code}$`, 'i') }] });

const normalizeTerms = (body) => {
  const terms = {};
  for (const key of termKeys) {
    const value = Number(body[key]);
    const maximum = key.includes('Rate') ? 100 : 60;
    if (!Number.isFinite(value) || value < 0 || value > maximum) throw new Error(`${key} must be between 0 and ${maximum}`);
    terms[key] = key.includes('Months') ? Math.floor(value) : value;
  }
  return terms;
};

const collectCreatorMetrics = async (creator, includeCreatorDetails = false) => {
  const referredUsersDocs = await User.find(referralQuery(creator)).sort({ createdAt: -1 });
  const userIds = referredUsersDocs.map((user) => user._id);
  const [brandProfiles, transactions] = await Promise.all([
    BrandProfile.find({ user: { $in: userIds } }),
    Transaction.find({ user: { $in: userIds }, status: 'completed', type: { $in: ['plan_purchase', 'plan_upgrade', 'plan_renewal'] } }).sort({ createdAt: -1 })
  ]);
  const brandsByUser = new Map(brandProfiles.map((brand) => [brand.user.toString(), brand.brandName || '—']));
  const transactionsByUser = new Map();
  for (const transaction of transactions) {
    const userId = transaction.user.toString();
    const list = transactionsByUser.get(userId) || [];
    list.push(transaction);
    transactionsByUser.set(userId, list);
  }

  let totalEarned = 0;
  let totalRevenue = 0;
  let eligibleSignups = 0;
  const conversions = [];
  const referredUsers = [];
  for (const user of referredUsersDocs) {
    const userTransactions = transactionsByUser.get(user._id.toString()) || [];
    const brandName = brandsByUser.get(user._id.toString()) || '—';
    let userTotalSpend = 0;
    let userCommissionGenerated = 0;
    let hasEligiblePayment = false;
    
    let firstPaymentDate = user.referralDate || user.createdAt;
    if (userTransactions.length > 0) {
      firstPaymentDate = userTransactions[userTransactions.length - 1].createdAt;
    }

    for (const transaction of userTransactions) {
      const commission = commissionForTransaction(transaction, user, creator, firstPaymentDate);
      userTotalSpend += transaction.amount;
      if (commission.isEligible) {
        hasEligiblePayment = true;
        totalEarned += commission.commissionAmount;
        totalRevenue += transaction.amount;
        userCommissionGenerated += commission.commissionAmount;
      }
      conversions.push({
        _id: transaction._id,
        customerName: user.name || user.email?.split('@')[0] || 'Customer',
        customerEmail: user.email,
        brandName,
        plan: transaction.plan || user.plan || 'Plan Purchase',
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.createdAt,
        status: transaction.status,
        ...commission,
        ...(includeCreatorDetails ? { creatorId: creator._id, creatorName: creator.name, creatorCode: creator.code } : {})
      });
    }
    if (hasEligiblePayment) eligibleSignups++;
    referredUsers.push({
      _id: user._id,
      customerName: user.name || user.email?.split('@')[0] || 'Customer',
      customerEmail: user.email,
      brandName,
      signupDate: user.createdAt,
      referralDate: user.referralDate || user.createdAt,
      currentPlan: user.plan || 'Free',
      totalSpend: userTotalSpend,
      commissionGenerated: userCommissionGenerated,
      status: hasEligiblePayment ? 'Subscribed' : 'Registered / Trial',
      terms: termsForUser(user, creator)
    });
  }
  conversions.sort((a, b) => new Date(b.date) - new Date(a.date));
  return { signups: referredUsersDocs.length, eligibleSignups, totalEarned, totalRevenue, conversions, referredUsers };
};

export const trackClick = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Code required' });
    const creator = await Creator.findOneAndUpdate({ code: code.trim().toUpperCase(), isActive: true }, { $inc: { clicks: 1 } }, { new: true });
    if (!creator) return res.status(404).json({ success: false, message: 'Creator not found' });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('trackClick error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getCreatorDashboard = async (req, res) => {
  try {
    const creator = await Creator.findOne({ dashboardToken: req.params.token });
    if (!creator) return res.status(404).json({ success: false, message: 'Dashboard not found' });
    const metrics = await collectCreatorMetrics(creator);
    return res.status(200).json({
      success: true,
      creator: {
        name: creator.name, code: creator.code, clicks: creator.clicks,
        initialCommissionRate: creator.initialCommissionRate ?? DEFAULT_TERMS.initialCommissionRate,
        initialCommissionMonths: creator.initialCommissionMonths ?? DEFAULT_TERMS.initialCommissionMonths,
        retentionCommissionRate: creator.retentionCommissionRate ?? DEFAULT_TERMS.retentionCommissionRate,
        retentionCommissionMonths: creator.retentionCommissionMonths ?? DEFAULT_TERMS.retentionCommissionMonths,
        signups: metrics.signups, eligibleSignups: metrics.eligibleSignups,
        totalRevenue: metrics.totalRevenue, totalEarned: metrics.totalEarned,
        totalPaid: creator.totalPaid, pendingBalance: Math.max(0, metrics.totalEarned - creator.totalPaid),
        payoutRequested: creator.payoutRequested, createdAt: creator.createdAt
      },
      conversions: metrics.conversions,
      referredUsers: metrics.referredUsers
    });
  } catch (error) {
    console.error('getCreatorDashboard error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const requestPayout = async (req, res) => {
  try {
    const creator = await Creator.findOne({ dashboardToken: req.params.token });
    if (!creator) return res.status(404).json({ success: false, message: 'Dashboard not found' });
    const metrics = await collectCreatorMetrics(creator);
    if (metrics.totalEarned <= creator.totalPaid) {
      return res.status(400).json({ success: false, message: 'There is no available balance to request.' });
    }
    creator.payoutRequested = true;
    await creator.save();
    return res.status(200).json({ success: true, message: 'Payout requested successfully' });
  } catch (error) {
    console.error('requestPayout error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getAllCreators = async (req, res) => {
  try {
    const creators = await Creator.find().sort({ createdAt: -1 });
    const enhancedCreators = [];
    const allConversions = [];
    const summary = { totalCreators: creators.length, totalClicks: 0, totalSignups: 0, totalRevenue: 0, totalCommission: 0, totalPaid: 0, totalPending: 0, payoutsRequestedCount: 0 };
    for (const creator of creators) {
      const metrics = await collectCreatorMetrics(creator, true);
      const pendingBalance = Math.max(0, metrics.totalEarned - creator.totalPaid);
      enhancedCreators.push({ ...creator.toObject(), ...metrics, pendingBalance });
      allConversions.push(...metrics.conversions);
      summary.totalClicks += creator.clicks;
      summary.totalSignups += metrics.signups;
      summary.totalRevenue += metrics.totalRevenue;
      summary.totalCommission += metrics.totalEarned;
      summary.totalPaid += creator.totalPaid;
      summary.totalPending += pendingBalance;
      if (creator.payoutRequested) summary.payoutsRequestedCount++;
    }
    allConversions.sort((a, b) => new Date(b.date) - new Date(a.date));
    return res.status(200).json({ success: true, creators: enhancedCreators, allConversions, summary });
  } catch (error) {
    console.error('getAllCreators error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createCreator = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name is required' });
    const terms = normalizeTerms({ ...DEFAULT_TERMS, ...req.body });
    const baseCode = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'CREATOR';
    let code = baseCode.substring(0, 8);
    let count = 1;
    while (await Creator.findOne({ code })) code = `${baseCode.substring(0, 6)}${count++}`;
    const creator = await Creator.create({ name: name.trim(), code, dashboardToken: crypto.randomUUID(), ...terms });
    return res.status(201).json({ success: true, creator });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Could not create creator' });
  }
};

export const updateCreatorTerms = async (req, res) => {
  try {
    const terms = normalizeTerms(req.body);
    const existingCreator = await Creator.findById(req.params.id);
    if (!existingCreator) return res.status(404).json({ success: false, message: 'Creator not found' });
    // Older referrals predate the terms snapshot. Freeze them against the
    // creator's current offer before changing that offer for future signups.
    await User.updateMany(
      { ...referralQuery(existingCreator), 'referralTerms.initialCommissionRate': { $exists: false } },
      { $set: { referralTerms: termsForUser({}, existingCreator) } }
    );
    const creator = await Creator.findByIdAndUpdate(req.params.id, terms, { new: true, runValidators: true });
    if (!creator) return res.status(404).json({ success: false, message: 'Creator not found' });
    return res.status(200).json({ success: true, creator, message: 'Terms updated for future referrals.' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Invalid commission terms' });
  }
};

export const markPayoutPaid = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });
    const creator = await Creator.findById(req.params.id);
    if (!creator) return res.status(404).json({ success: false, message: 'Creator not found' });
    const metrics = await collectCreatorMetrics(creator);
    const pendingBalance = Math.max(0, Number((metrics.totalEarned - creator.totalPaid).toFixed(2)));
    if (amount > pendingBalance) return res.status(400).json({ success: false, message: 'Payout amount exceeds the available balance' });
    creator.totalPaid = Number((creator.totalPaid + amount).toFixed(2));
    creator.payoutRequested = false;
    await creator.save();
    return res.status(200).json({ success: true, creator });
  } catch (error) {
    console.error('markPayoutPaid error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
