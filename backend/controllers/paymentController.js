import Razorpay from 'razorpay';
import crypto from 'crypto';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import BrandProfile from '../models/BrandProfile.js';
import { sendInvoiceEmail } from '../utils/sendInvoiceEmail.js';

export const createOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, type, plan, creditsAdded, couponCode, discountPercentage, discountAmount } = req.body;

    if (!amount || !type) {
      return res.status(400).json({ message: 'Amount and type are required' });
    }

    if (amount < 1) {
      return res.status(400).json({ message: 'Minimum amount must be 1 INR (100 paise)' });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.error('Razorpay keys not found in environment variables');
        return res.status(500).json({ message: 'Payment gateway configuration error' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount * 100, // amount in smallest currency unit
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    if (!order) {
      return res.status(500).json({ message: 'Failed to create order' });
    }

    // Create pending transaction in DB
    await Transaction.create({
      user: req.user._id,
      amount,
      type,
      plan: plan || '',
      creditsAdded: creditsAdded || 0,
      razorpayOrderId: order.id,
      status: 'pending',
      couponCode: couponCode || '',
      discountPercentage: discountPercentage || 0,
      discountAmount: discountAmount || 0
    });

    res.status(200).json({
      success: true,
      order,
      key_id: process.env.RAZORPAY_KEY_ID, // Send key to frontend
    });
  } catch (error) {
    console.error('Error in createOrder:', error);
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, billingAddress } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Payment details are missing' });
    }

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      // Payment is verified successfully
      const transaction = await Transaction.findOne({ razorpayOrderId: razorpay_order_id });
      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found in database' });
      }

      transaction.status = 'completed';
      transaction.razorpayPaymentId = razorpay_payment_id;
      await transaction.save();

      const user = await User.findById(transaction.user);
      if (user) {
        if (transaction.type === 'topup') {
          user.credits = (user.credits || 0) + transaction.creditsAdded;
          user.totalCreditsPurchased = (user.totalCreditsPurchased || 0) + transaction.creditsAdded;
        } else if (transaction.type === 'plan_purchase' || transaction.type === 'plan_renewal') {
          user.plan = transaction.plan;
          user.credits = (user.credits || 0) + transaction.creditsAdded;
          user.totalCreditsPurchased = (user.totalCreditsPurchased || 0) + transaction.creditsAdded;
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 30);
          user.planExpiresAt = expiry;
        } else if (transaction.type === 'plan_upgrade') {
          user.plan = transaction.plan;
          user.credits = (user.credits || 0) + transaction.creditsAdded;
          user.totalCreditsPurchased = (user.totalCreditsPurchased || 0) + transaction.creditsAdded;
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 30);
          user.planExpiresAt = expiry;
        } else if (transaction.type === 'dm_addon_purchase') {
          // DM Addon purchase - no plan change, no credits added
        }
        
        // Auto-update active brand profile plan
        if (transaction.type === 'plan_purchase' || transaction.type === 'plan_renewal' || transaction.type === 'plan_upgrade' || transaction.type === 'dm_addon_purchase') {
          const brandQuery = user.activeBrandId ? { _id: user.activeBrandId } : { user: user._id };
          const brandProfile = await BrandProfile.findOne(brandQuery);
          if (brandProfile) {
            if (transaction.type !== 'dm_addon_purchase') {
              brandProfile.selectedPlan = transaction.plan;
              brandProfile.isPaid = true;
            }
            if (transaction.type === 'plan_upgrade' || transaction.type === 'dm_addon_purchase') {
              brandProfile.DM_Automation_Service = true;
            }
            await brandProfile.save();
          }
        }
        
        if (billingAddress) {
          user.billingAddress = billingAddress;
        }

        await user.save();

        // ── Send invoice email (non-blocking) ──────────────────────────
        const invoiceEmail = billingAddress?.email || user.email;
        sendInvoiceEmail({
          to: invoiceEmail,
          userName: billingAddress?.fullName || user.name || user.email,
          userEmail: invoiceEmail,
          billingAddress: user.billingAddress || billingAddress || {},
          transactionType: transaction.type,
          planName: transaction.plan || '',
          amount: transaction.amount,
          creditsAdded: transaction.creditsAdded || 0,
          razorpayPaymentId: transaction.razorpayPaymentId,
          razorpayOrderId: transaction.razorpayOrderId,
          planExpiresAt: user.planExpiresAt || null,
          couponCode: transaction.couponCode || '',
          discountAmount: transaction.discountAmount || 0,
          discountPercentage: transaction.discountPercentage || 0,
          transactionId: String(transaction._id),
        }).catch((err) =>
          console.error('[Invoice Email] Failed to send invoice:', err.message)
        );
        // ── End invoice email ──────────────────────────────────────────

        return res.status(200).json({ 
           success: true, 
           message: 'Payment verified and applied',
           credits: user.credits,
           plan: user.plan,
           planExpiresAt: user.planExpiresAt
        });
      }

      return res.status(200).json({ success: true, message: 'Payment verified but user not found' });
    } else {
      // Mark transaction as failed
      const transaction = await Transaction.findOne({ razorpayOrderId: razorpay_order_id });
      if (transaction) {
         transaction.status = 'failed';
         transaction.razorpayPaymentId = razorpay_payment_id;
         await transaction.save();
      }
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Error in verifyPayment:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getPaymentHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
