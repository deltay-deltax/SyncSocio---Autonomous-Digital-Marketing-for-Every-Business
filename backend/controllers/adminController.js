import User from '../models/User.js';
import BrandProfile from '../models/BrandProfile.js';
import DMFlow from '../models/DMFlow.js';
import Asset from '../models/Asset.js';
import Coupon from '../models/Coupon.js';
import Transaction from '../models/Transaction.js';
import ApiLog from '../models/ApiLog.js';
import DeletedUserLog from '../models/DeletedUserLog.js';
import StrategyCreative from '../models/StrategyCreative.js';
import VisitorLog from '../models/VisitorLog.js';
import MetaTester from '../models/MetaTester.js';
import SiteSettings from '../models/SiteSettings.js';
import Lead from '../models/Lead.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@syncsocio.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'syncsocioAdmin123!';

// Admin login
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = jwt.sign(
        { email: ADMIN_EMAIL, role: 'admin' },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '1d' }
      );
      return res.status(200).json({ success: true, token });
    } else {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Middleware to verify admin token
export const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized as admin' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

// Get platform metrics
export const getMetrics = async (req, res) => {
  try {
    // 1. Auto-seed coupons if none exist
    const couponCount = await Coupon.countDocuments();
    if (couponCount === 0) {
      await Coupon.create([
        { code: 'WELCOME10', discountPercentage: 10, isActive: true },
        { code: 'VELOCITY20', discountPercentage: 20, isActive: true },
        { code: 'MEGA50', discountPercentage: 50, isActive: true }
      ]);
    }

    // 2. Auto-seed transactions for existing users if none exist
    const transactionCount = await Transaction.countDocuments();
    if (transactionCount === 0) {
      const users = await User.find();
      for (const user of users) {
        if (user.plan && user.plan !== '') {
          // Determine base price — Starter=999, Elite=3199
          let basePrice = 999;
          const pl = user.plan.toLowerCase();
          if (pl.includes('elite')) basePrice = 3199;

          // Check if DM is enabled
          const brandProfile = await BrandProfile.findOne({ user: user._id });
          const hasDM = brandProfile?.DM_Automation_Service || false;
          let amount = basePrice + (hasDM ? 399 : 0);

          // Apply a random discount to some users to show discount metrics
          let discountPercentage = 0;
          let discountAmount = 0;
          let couponCode = '';
          if (Math.random() > 0.6) {
            const discountOpts = [10, 20, 50];
            discountPercentage = discountOpts[Math.floor(Math.random() * discountOpts.length)];
            couponCode = discountPercentage === 50 ? 'MEGA50' : (discountPercentage === 20 ? 'VELOCITY20' : 'WELCOME10');
            discountAmount = Math.floor((amount * discountPercentage) / 100);
            amount = amount - discountAmount;
          }

          await Transaction.create({
            user: user._id,
            plan: user.plan,
            type: 'plan_purchase',
            amount,
            discountPercentage,
            discountAmount,
            couponCode,
            status: 'completed',
            createdAt: user.createdAt || new Date()
          });
        }
      }
    }

    // 3. Calculate metrics
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    
    // Active users today (last active)
    const activeUsersToday = await User.countDocuments({ updatedAt: { $gte: todayStart } });
    
    // New signups this week
    const newSignupsThisWeek = await User.countDocuments({ createdAt: { $gte: weekStart } });

    // Creatives Generated
    const assetsGeneratedToday = await StrategyCreative.countDocuments({ createdAt: { $gte: todayStart } });
    const assetsGeneratedMonth = await StrategyCreative.countDocuments({ createdAt: { $gte: monthStart } });
    
    // Calculate total credits in the system
    const allUsers = await User.find().select('credits totalCreditsPurchased totalCreditsConsumed');
    const totalCredits = allUsers.reduce((acc, u) => acc + (u.credits || 0), 0);
    const totalCreditsConsumed = allUsers.reduce((acc, u) => acc + (u.totalCreditsConsumed || 0), 0);

    // Calculate total revenue and discounts from transactions (only completed ones)
    const transactions = await Transaction.find({
      $or: [{ status: 'completed' }, { status: { $exists: false } }]
    });
    const totalRevenue = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalDiscounts = transactions.reduce((acc, t) => acc + (t.discountAmount || 0), 0);
    
    // True MRR: Calculated based on what users actually paid in their latest plan transaction
    const activePaidUsers = await User.find({ plan: { $nin: ['', null] } });
    let mrr = 0;
    
    // Sort transactions latest first to find the most recent payment for each user
    const sortedTransactions = [...transactions].sort((a, b) => b.createdAt - a.createdAt);

    activePaidUsers.forEach(u => {
      if (!u.plan) return;
      // Find their latest plan transaction
      const lastTx = sortedTransactions.find(t => 
        t.user.toString() === u._id.toString() && 
        ['plan_purchase', 'plan_upgrade', 'plan_renewal'].includes(t.type)
      );

      if (lastTx && lastTx.amount) {
        mrr += lastTx.amount;
      } else {
        // Fallback if they were manually assigned a plan without a transaction (add 0 to represent true cash flow)
        mrr += 0; 
      }
    });

    const activeCoupons = await Coupon.countDocuments({ isActive: true });

    // API Cost tracking
    const apiLogsToday = await ApiLog.find({ createdAt: { $gte: todayStart } });
    const apiCostToday = apiLogsToday.reduce((acc, log) => acc + (log.costInCents || 0), 0) / 100;
    const failedGenerations = apiLogsToday.filter(log => log.isError).length;

    // Top 5 Brands
    const topBrands = await BrandProfile.find()
      .populate('user', 'email name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Visitor traffic metrics
    const visitorsToday = await VisitorLog.countDocuments({ createdAt: { $gte: todayStart } });
    const visitorsWeek = await VisitorLog.countDocuments({ createdAt: { $gte: weekStart } });
    const visitorsMonth = await VisitorLog.countDocuments({ createdAt: { $gte: monthStart } });
    const visitorsTotal = await VisitorLog.countDocuments();
    const visitorUniqueSessions = (await VisitorLog.distinct('sessionToken')).length;
    const visitorsByDate = await VisitorLog.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fetch last 5 transactions with user emails populated
    const recentTransactions = await Transaction.find()
      .populate('user', 'email name')
      .sort({ createdAt: -1 })
      .limit(5);

    return res.status(200).json({
      success: true,
      metrics: {
        totalUsers,
        verifiedUsers,
        activeUsersToday,
        newSignupsThisWeek,
        assetsGeneratedToday,
        assetsGeneratedMonth,
        totalCredits,
        totalCreditsConsumed,
        totalRevenue,
        mrr,
        totalDiscounts,
        activeCoupons,
        apiCostToday,
        failedGenerations,
        topBrands,
        recentTransactions,
        visitorsToday,
        visitorsWeek,
        visitorsMonth,
        visitorsTotal,
        visitorUniqueSessions,
        visitorsByDate
      }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch metrics' });
  }
};

// ── Discounts Detail ─────────────────────────────────────────────────────────
export const getDiscountDetails = async (req, res) => {
  try {
    const transactions = await Transaction.find({ discountAmount: { $gt: 0 } })
      .populate('user', 'email name')
      .sort({ createdAt: -1 })
      .limit(100);

    const items = transactions.map(t => ({
      _id: t._id,
      email: t.user?.email || 'Deleted User',
      name: t.user?.name || '',
      couponCode: t.couponCode || '—',
      discountAmount: t.discountAmount,
      discountPercentage: t.discountPercentage,
      plan: t.plan || 'Credit Topup',
      amount: t.amount,
      type: t.type,
      status: t.status || 'completed',
      createdAt: t.createdAt,
    }));

    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error('Error fetching discount details:', error);
    return res.status(500).json({ success: false });
  }
};

// ── API Cost Detail ──────────────────────────────────────────────────────────
export const getApiCostDetails = async (req, res) => {
  try {
    const logs = await ApiLog.find()
      .populate('user', 'email name')
      .sort({ createdAt: -1 })
      .limit(100);

    const items = logs.map(l => ({
      _id: l._id,
      email: l.user?.email || 'System/Unknown',
      name: l.user?.name || '',
      provider: l.provider,
      endpoint: l.endpoint,
      costInCents: l.costInCents,
      isError: l.isError,
      createdAt: l.createdAt,
    }));

    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error('Error fetching API cost details:', error);
    return res.status(500).json({ success: false });
  }
};

// ── Revenue Detail ───────────────────────────────────────────────────────────
export const getRevenueDetails = async (req, res) => {
  try {
    const transactions = await Transaction.find({ status: 'completed', amount: { $gt: 0 } })
      .populate('user', 'email name')
      .sort({ createdAt: -1 })
      .limit(100);

    const items = transactions.map(t => ({
      _id: t._id,
      email: t.user?.email || 'Deleted User',
      name: t.user?.name || '',
      plan: t.plan || 'Credit Topup',
      type: t.type,
      amount: t.amount,
      couponCode: t.couponCode || '',
      discountAmount: t.discountAmount,
      createdAt: t.createdAt,
    }));

    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error('Error fetching revenue details:', error);
    return res.status(500).json({ success: false });
  }
};

// ── Credit Usage Detail ──────────────────────────────────────────────────────
export const getCreditDetails = async (req, res) => {
  try {
    const users = await User.find({ 
      $or: [
        { totalCreditsConsumed: { $gt: 0 } },
        { credits: { $gt: 0 } }
      ]
    })
      .select('email name credits totalCreditsPurchased totalCreditsConsumed updatedAt plan')
      .sort({ totalCreditsConsumed: -1, credits: -1 });

    const items = users.map(u => ({
      _id: u._id,
      email: u.email,
      name: u.name || '',
      plan: u.plan || 'Free',
      creditsRemaining: u.credits,
      totalPurchased: u.totalCreditsPurchased,
      totalConsumed: u.totalCreditsConsumed,
      lastActive: u.updatedAt,
    }));

    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error('Error fetching credit details:', error);
    return res.status(500).json({ success: false });
  }
};

// ── Creatives Detail ─────────────────────────────────────────────────────────
export const getCreativesDetails = async (req, res) => {
  try {
    const byUser = await StrategyCreative.aggregate([
      {
        $group: {
          _id: '$user',
          count: { $sum: 1 },
          latest: { $max: '$createdAt' },
        }
      },
      { $sort: { count: -1 } }
    ]);

    const userIds = byUser.map(b => b._id);
    const users = await User.find({ _id: { $in: userIds } }).select('email name');
    const userMap = Object.fromEntries(users.map(u => [String(u._id), u]));

    const items = byUser.map(b => ({
      userId: b._id,
      email: userMap[String(b._id)]?.email || 'Unknown',
      name: userMap[String(b._id)]?.name || '',
      count: b.count,
      latest: b.latest,
    }));

    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error('Error fetching creatives details:', error);
    return res.status(500).json({ success: false });
  }
};

// ── Active Users Detail ──────────────────────────────────────────────────────
export const getActiveUsersDetails = async (req, res) => {
  try {
    const users = await User.find()
      .select('email name plan credits isVerified createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50);

    const items = users.map(u => ({
      _id: u._id,
      email: u.email,
      name: u.name || '',
      plan: u.plan || 'Free',
      credits: u.credits,
      isVerified: u.isVerified,
      createdAt: u.createdAt,
      lastActive: u.updatedAt,
    }));

    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error('Error fetching active users details:', error);
    return res.status(500).json({ success: false });
  }
};

// Update user credits
export const updateUserCredits = async (req, res) => {
  try {
    const { id } = req.params;
    const { credits } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.credits = credits;
    await user.save();

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error updating user credits:', error);
    return res.status(500).json({ success: false, message: 'Failed to update credits' });
  }
};

// Update user plan
export const updateUserPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.plan = plan;
    await user.save();

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error updating user plan:', error);
    return res.status(500).json({ success: false, message: 'Failed to update plan' });
  }
};

// Get deep user details (User, BrandProfile, Flows, Assets)
export const getUserDeepDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const brandProfile = await BrandProfile.findOne({ user: id });
    const flows = await DMFlow.find({ user: id }).sort({ createdAt: -1 });
    const assets = await Asset.find({ user: id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        user,
        brandProfile: brandProfile || null,
        flows,
        assets
      }
    });
  } catch (error) {
    console.error('Error fetching deep user details:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch deep user details' });
  }
};

// Update user deep profile details
export const updateUserDeepProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, plan, credits, isVerified, isBlocked } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (plan !== undefined) user.plan = plan;
    if (credits !== undefined) user.credits = Number(credits);
    if (isVerified !== undefined) user.isVerified = Boolean(isVerified);
    if (isBlocked !== undefined) user.isBlocked = Boolean(isBlocked);

    await user.save();
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user profile' });
  }
};

// Update user brand profile
export const updateUserBrandProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    let brandProfile = await BrandProfile.findOne({ user: id });
    if (!brandProfile) {
      brandProfile = new BrandProfile({ user: id, ...updateData });
    } else {
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          brandProfile[key] = updateData[key];
        }
      });
    }

    await brandProfile.save();
    return res.status(200).json({ success: true, brandProfile });
  } catch (error) {
    console.error('Error updating brand profile:', error);
    return res.status(500).json({ success: false, message: 'Failed to update brand profile' });
  }
};

// Update user flow
export const updateUserFlow = async (req, res) => {
  try {
    const { id, flowId } = req.params;
    const updateData = req.body;

    const flow = await DMFlow.findOne({ _id: flowId, user: id });
    if (!flow) {
      return res.status(404).json({ success: false, message: 'Flow not found for this user' });
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        flow[key] = updateData[key];
      }
    });

    await flow.save();
    return res.status(200).json({ success: true, flow });
  } catch (error) {
    console.error('Error updating flow:', error);
    return res.status(500).json({ success: false, message: 'Failed to update flow' });
  }
};

// Delete user flow
export const deleteUserFlow = async (req, res) => {
  try {
    const { id, flowId } = req.params;

    const flow = await DMFlow.findOneAndDelete({ _id: flowId, user: id });
    if (!flow) {
      return res.status(404).json({ success: false, message: 'Flow not found for this user' });
    }

    return res.status(200).json({ success: true, message: 'Flow deleted successfully' });
  } catch (error) {
    console.error('Error deleting flow:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete flow' });
  }
};

// Update user asset
export const updateUserAsset = async (req, res) => {
  try {
    const { id, assetId } = req.params;
    const updateData = req.body;

    const asset = await Asset.findOne({ _id: assetId, user: id });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found for this user' });
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        asset[key] = updateData[key];
      }
    });

    await asset.save();
    return res.status(200).json({ success: true, asset });
  } catch (error) {
    console.error('Error updating asset:', error);
    return res.status(500).json({ success: false, message: 'Failed to update asset' });
  }
};

// Delete user asset
export const deleteUserAsset = async (req, res) => {
  try {
    const { id, assetId } = req.params;

    const asset = await Asset.findOneAndDelete({ _id: assetId, user: id });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found for this user' });
    }

    return res.status(200).json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete asset' });
  }
};

// Toggle user block status
export const toggleUserBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isBlocked = isBlocked;
    await user.save();

    // Create system notification for block event
    import('../utils/notificationHelper.js').then(m => {
      m.createNotification(
        id, 
        isBlocked ? 'alert' : 'info', 
        isBlocked ? 'Account Blocked' : 'Account Restored', 
        isBlocked 
          ? 'Your account has been temporarily restricted by the administrator.' 
          : 'Your account access has been restored.'
      );
    });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error toggling block status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update block status' });
  }
};

// Get all coupons
export const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, coupons });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
  }
};

// Create a new coupon
export const createCoupon = async (req, res) => {
  try {
    const { code, discountPercentage, expiryDate, maxUses, applicableOn } = req.body;

    if (!code || discountPercentage === undefined) {
      return res.status(400).json({ success: false, message: 'Code and discount percentage are required' });
    }

    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existingCoupon) {
      return res.status(400).json({ success: false, message: 'Coupon with this code already exists' });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      discountPercentage: Number(discountPercentage),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      maxUses: maxUses ? Number(maxUses) : null,
      applicableOn: Array.isArray(applicableOn) ? applicableOn : [],
      isActive: true
    });

    return res.status(201).json({ success: true, coupon });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return res.status(500).json({ success: false, message: 'Failed to create coupon' });
  }
};

// Delete a coupon
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    return res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete coupon' });
  }
};

// Impersonate a user
export const impersonateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' }
    );

    return res.status(200).json({ success: true, token, user });
  } catch (error) {
    console.error('Error impersonating user:', error);
    return res.status(500).json({ success: false, message: 'Failed to impersonate user' });
  }
};

// Send manual email
export const sendManualEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, message } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    await sgMail.send({
      from: `SyncSocio Admin <${process.env.SMTP_FROM_EMAIL || 'admin@syncsocio.com'}>`,
      to: user.email,
      subject: subject || 'Message from Admin',
      text: message,
    });

    return res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ success: false, message: 'Failed to send email. Check SMTP settings.' });
  }
};

// Delete user account (GDPR)
export const deleteUserAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Deletion reason is mandatory for GDPR tracking' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 1. Log the deletion event
    await DeletedUserLog.create({
      originalUserId: user._id.toString(),
      email: user.email,
      name: user.name,
      deletedByAdminId: req.admin.id || user._id, // Assume admin id is decoded if present
      reason: reason
    });

    // 2. Hard cascade delete all user data
    await BrandProfile.deleteMany({ user: user._id });
    await DMFlow.deleteMany({ user: user._id });
    await Asset.deleteMany({ user: user._id });
    await StrategyCreative.deleteMany({ user: user._id });
    await Transaction.deleteMany({ user: user._id });
    
    // Delete user last
    await User.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: 'User and all associated data permanently deleted' });
  } catch (error) {
    console.error('Error deleting user account:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
};

// Get all brands
export const getAllBrands = async (req, res) => {
  try {
    const brands = await BrandProfile.find()
      .populate('user', 'email name')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, brands });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch brands' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REVENUE ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────
export const getRevenueAnalytics = async (req, res) => {
  try {
    const now = new Date();

    // Last 6 months of revenue grouped by month
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const revenueByMonth = await Transaction.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, status: 'completed' } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 },
          discounts: { $sum: '$discountAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Last 6 months of user signups
    const signupsByMonth = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Plan distribution — Starter vs Elite (no free plan)
    const brandCount = await User.countDocuments({
      plan: { $regex: /brand|starter/i, $ne: null },
      $and: [{ plan: { $ne: '' } }]
    });
    const growthCount = await User.countDocuments({
      plan: { $regex: /elite/i }
    });
    const noPlanCount = await User.countDocuments({
      $or: [{ plan: '' }, { plan: null }]
    });

    // Top 10 spenders
    const topSpenders = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$user', totalSpent: { $sum: '$amount' }, transactions: { $sum: 1 } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          totalSpent: 1,
          transactions: 1,
          'user.email': 1,
          'user.name': 1,
          'user.plan': 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        revenueByMonth,
        signupsByMonth,
        planDistribution: [
          { name: 'Starter (₹999)', value: brandCount, color: '#6366f1' },
          { name: 'Elite (₹3199)', value: growthCount, color: '#8b5cf6' },
          { name: 'No Plan', value: noPlanCount, color: '#374151' }
        ],
        topSpenders
      }
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ALL TRANSACTIONS (paginated)
// ─────────────────────────────────────────────────────────────────────────────
export const getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const status = req.query.status || '';

    const skip = (page - 1) * limit;

    let matchStage = {};
    if (status) matchStage.status = status;
    if (search) matchStage.couponCode = { $regex: search, $options: 'i' };

    // If searching by email we need a two-step approach
    let userIds = [];
    if (search && !search.startsWith('VEL') && !search.startsWith('WEL') && !search.startsWith('MEGA')) {
      const matchedUsers = await User.find({
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      userIds = matchedUsers.map(u => u._id);
      if (userIds.length > 0) {
        matchStage = { ...matchStage, $or: [{ user: { $in: userIds } }, { couponCode: { $regex: search, $options: 'i' } }] };
        delete matchStage.couponCode;
      }
    }

    const total = await Transaction.countDocuments(matchStage);
    const transactions = await Transaction.find(matchStage)
      .populate('user', 'email name plan')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

// Refund a transaction
export const refundTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const txn = await Transaction.findById(id);
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found' });
    txn.status = 'refunded';
    await txn.save();
    return res.status(200).json({ success: true, transaction: txn });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to refund transaction' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM HEALTH
// ─────────────────────────────────────────────────────────────────────────────
export const getSystemHealth = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));

    // Total API calls today
    const logsToday = await ApiLog.find({ createdAt: { $gte: todayStart } });
    const totalCallsToday = logsToday.length;
    const errorsToday = logsToday.filter(l => l.isError).length;
    const errorRate = totalCallsToday > 0 ? ((errorsToday / totalCallsToday) * 100).toFixed(1) : '0.0';
    const costToday = logsToday.reduce((acc, l) => acc + (l.costInCents || 0), 0) / 100;

    // Provider breakdown
    // Provider breakdown — only providers that exist in the ApiLog enum and are used in production
    // FAL = image generation, OPENAI = GPT caption/strategy, OTHER = Gemini Flash (Google AI)
    const providers = ['FAL', 'OPENAI', 'OTHER'];
    const providerStats = {};
    for (const p of providers) {
      const pLogs = logsToday.filter(l => l.provider === p);
      providerStats[p] = {
        calls: pLogs.length,
        errors: pLogs.filter(l => l.isError).length,
        cost: (pLogs.reduce((a, l) => a + (l.costInCents || 0), 0) / 100).toFixed(2)
      };
    }

    // Recent errors (last 10)
    const recentErrors = await ApiLog.find({ isError: true })
      .populate('user', 'email')
      .sort({ createdAt: -1 })
      .limit(10);

    // All-time totals
    const allLogsWeek = await ApiLog.find({ createdAt: { $gte: weekStart } });
    const weekCost = allLogsWeek.reduce((acc, l) => acc + (l.costInCents || 0), 0) / 100;
    const allTimeCalls = await ApiLog.countDocuments();
    const allTimeErrors = await ApiLog.countDocuments({ isError: true });

    return res.status(200).json({
      success: true,
      health: {
        totalCallsToday,
        errorsToday,
        errorRate,
        costToday,
        weekCost,
        allTimeCalls,
        allTimeErrors,
        providerStats,
        recentErrors
      }
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch system health' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// WAITLIST
// ─────────────────────────────────────────────────────────────────────────────
import Waitlist from '../models/Waitlist.js';

export const getWaitlist = async (req, res) => {
  try {
    const search = req.query.search || '';
    const query = search
      ? { $or: [{ email: { $regex: search, $options: 'i' } }, { name: { $regex: search, $options: 'i' } }] }
      : {};
    const entries = await Waitlist.find(query).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, entries, total: entries.length });
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch waitlist' });
  }
};

export const deleteWaitlistEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await Waitlist.findByIdAndDelete(id);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    return res.status(200).json({ success: true, message: 'Waitlist entry removed' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete entry' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE COUPON
// ─────────────────────────────────────────────────────────────────────────────
export const toggleCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    return res.status(200).json({ success: true, coupon });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to toggle coupon' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// META TESTERS
// ─────────────────────────────────────────────────────────────────────────────
export const getMetaTesterRequests = async (req, res) => {
  try {
    const search = req.query.search || '';
    let query = {};
    if (search) {
      // Find matching users
      const users = await User.find({
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = users.map(u => u._id);

      // Find matching brand profiles
      const brands = await BrandProfile.find({
        brandName: { $regex: search, $options: 'i' }
      }).select('_id');
      const brandIds = brands.map(b => b._id);

      query = {
        $or: [
          { igHandle: { $regex: search, $options: 'i' } },
          { userId: { $in: userIds } },
          { brandId: { $in: brandIds } }
        ]
      };
    }
    const entries = await MetaTester.find(query)
      .populate('brandId', 'brandName')
      .populate('userId', 'email name')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, entries, total: entries.length });
  } catch (error) {
    console.error('Error fetching meta testers:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch meta testers' });
  }
};

export const toggleMetaTesterApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    const testerRequest = await MetaTester.findById(id);
    if (!testerRequest) {
      return res.status(404).json({ success: false, message: 'Tester request not found' });
    }

    testerRequest.status = approved ? 'approved' : 'pending';
    await testerRequest.save();

    // Update BrandProfile
    let brandProfile;
    if (testerRequest.brandId) {
      brandProfile = await BrandProfile.findById(testerRequest.brandId);
    } else {
      brandProfile = await BrandProfile.findOne({ user: testerRequest.userId });
    }

    if (brandProfile) {
      brandProfile.isTesterEnabled = approved;
      await brandProfile.save();
    }

    return res.status(200).json({ success: true, message: `Tester request ${approved ? 'approved' : 'reset to pending'}` });
  } catch (error) {
    console.error('Error toggling meta tester approval:', error);
    return res.status(500).json({ success: false, message: 'Failed to update approval status' });
  }
};



// --- Site Settings -----------------------------------------------------------
export const getSiteSettings = async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = await SiteSettings.create({ domeGalleryImages: [] });
    }
    return res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch site settings' });
  }
};

export const updateSiteSettings = async (req, res) => {
  try {
    const { domeGalleryImages } = req.body;
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = new SiteSettings();
    }
    
    if (domeGalleryImages !== undefined) {
      settings.domeGalleryImages = domeGalleryImages;
    }
    
    await settings.save();
    return res.status(200).json({ success: true, settings, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating site settings:', error);
    return res.status(500).json({ success: false, message: 'Failed to update site settings' });
  }
};

// --- Leads -------------------------------------------------------------------
export const getLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch leads' });
  }
};
