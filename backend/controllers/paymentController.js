import Razorpay from 'razorpay';
import crypto from 'crypto';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import BrandProfile from '../models/BrandProfile.js';
import Coupon from '../models/Coupon.js';
import { sendInvoiceEmail, generatePDFBuffer, genInvoiceNo, fmtDate, resolvePack, sendPaymentFailedEmail } from '../utils/sendInvoiceEmail.js';
import { sendMetaCapiEvent } from '../services/metaConversionsAPI.js';
import AdminNotification from '../models/AdminNotification.js';

const PLAN_PRICES = {
  INR: { 'Starter': 799, 'Growth': 1499, 'Pro': 3499 },
  USD: { 'Starter': 10, 'Growth': 19, 'Pro': 45 }
};

const TOPUP_PRICES = {
  INR: { 'Starter Top-up': 250, 'Value Pack': 475, 'Growth Pack': 1275, 'Pro Pack': 2730 },
  USD: { 'Starter Top-up': 3.5, 'Value Pack': 6.5, 'Growth Pack': 16, 'Pro Pack': 35 }
};

export const createOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, type, plan, creditsAdded, couponCode, discountPercentage, discountAmount } = req.body;

    if (!amount || !type) {
      return res.status(400).json({ message: 'Amount and type are required' });
    }

    if (type === 'topup') {
      const user = await User.findById(req.user._id);
      const isTrial = !user.plan || user.plan === 'Free Trial';
      const isExpired = user.planExpiresAt && new Date(user.planExpiresAt) < new Date();
      if (isTrial || isExpired) {
        return res.status(400).json({ message: 'Please upgrade to a paid plan before buying credit top-ups.' });
      }
    }

    if (amount < 1) {
      return res.status(400).json({ message: 'Minimum amount must be 1 (INR/USD)' });
    }

    // --- SECURITY FIX: VALIDATE AMOUNT AGAINST SPOOFING ---
    let expectedBasePrice = 0;
    const isUSD = currency === 'USD';
    
    if (type === 'plan_purchase' || type === 'plan_upgrade' || type === 'plan_renewal') {
      expectedBasePrice = isUSD ? (PLAN_PRICES.USD[plan] || 0) : (PLAN_PRICES.INR[plan] || 0);
    } else if (type === 'topup') {
      // Find topup by credits added or plan name if passed
      expectedBasePrice = isUSD ? (TOPUP_PRICES.USD[plan] || 0) : (TOPUP_PRICES.INR[plan] || 0);
      if (expectedBasePrice === 0) {
        // Fallback to checking by credits amount if plan name isn't matched
        if (creditsAdded === 50) expectedBasePrice = isUSD ? 3.5 : 250;
        else if (creditsAdded === 100) expectedBasePrice = isUSD ? 6.5 : 475;
        else if (creditsAdded === 300) expectedBasePrice = isUSD ? 16 : 1275;
        else if (creditsAdded === 700) expectedBasePrice = isUSD ? 35 : 2730;
      }
    } else if (type === 'dm_addon_purchase') {
      expectedBasePrice = isUSD ? 6 : 500; // DM addon is flat 500 INR / $6 USD
    }

    // Server-side discount calculation
    let expectedFinalAmount = expectedBasePrice;
    let actualDiscountPercentage = 0;
    let actualDiscountAmount = 0;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim(), isActive: true });
      console.log('--- COUPON CHECK ---');
      console.log('Coupon found:', coupon);
      if (coupon) {
        console.log('Condition 1 (!expiryDate || > new Date):', (!coupon.expiryDate || coupon.expiryDate > new Date()));
        console.log('Condition 2 (maxUses === null || timesUsed < maxUses):', (coupon.maxUses === null || coupon.timesUsed < coupon.maxUses));
        console.log('maxUses:', coupon.maxUses, 'timesUsed:', coupon.timesUsed);
      }
      
      const demoCoupons = {
        'WELCOME10': 10,
        'SYNCSOCIO20': 20,
        'LAUNCH50': 50,
        'LAUNCH': 40
      };

      if (coupon && (!coupon.expiryDate || coupon.expiryDate > new Date()) && (coupon.maxUses === null || coupon.maxUses === undefined || coupon.timesUsed < coupon.maxUses)) {
        actualDiscountPercentage = coupon.discountPercentage;
        actualDiscountAmount = Math.floor(expectedBasePrice * (actualDiscountPercentage / 100));
        expectedFinalAmount = Math.max(1, expectedBasePrice - actualDiscountAmount);
      } else if (!coupon && demoCoupons[couponCode.toUpperCase().trim()]) {
        actualDiscountPercentage = demoCoupons[couponCode.toUpperCase().trim()];
        actualDiscountAmount = Math.floor(expectedBasePrice * (actualDiscountPercentage / 100));
        expectedFinalAmount = Math.max(1, expectedBasePrice - actualDiscountAmount);
      } else {
        return res.status(400).json({ message: 'Invalid or expired coupon code' });
      }
    }

    // Allow 1 INR difference due to rounding
    if (Math.abs(expectedFinalAmount - amount) > 1) {
      console.warn(`[SECURITY] Payment amount spoofing detected! Expected: ${expectedFinalAmount}, Received: ${amount}`);
      return res.status(400).json({ message: 'Payment amount mismatch. Please try again.' });
    }

    // Use the strictly validated amount
    const secureAmount = expectedFinalAmount;
    // -----------------------------------------------------

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay keys not found in environment variables');
      return res.status(500).json({ message: 'Payment gateway configuration error' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: secureAmount * 100, // amount in smallest currency unit
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
      amount: secureAmount, // Use the server-validated amount
      type,
      plan: plan || '',
      creditsAdded: creditsAdded || 0,
      razorpayOrderId: order.id,
      status: 'pending',
      couponCode: couponCode || '',
      discountPercentage: actualDiscountPercentage || 0,
      discountAmount: actualDiscountAmount || 0
    });

    res.status(200).json({
      success: true,
      order,
      key_id: process.env.RAZORPAY_KEY_ID, // Send key to frontend
    });
  } catch (error) {
    console.error('Error in createOrder:', error);
    res.status(500).json({ message: 'Something went wrong', error: 'An internal server error occurred.' });
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

      if (transaction.couponCode) {
        await Coupon.updateOne({ code: transaction.couponCode }, { $inc: { timesUsed: 1 } });
      }

      const user = await User.findById(transaction.user);
      if (user) {
        if (transaction.type === 'topup') {
          user.credits = (user.credits || 0) + transaction.creditsAdded;
          user.totalCreditsPurchased = (user.totalCreditsPurchased || 0) + transaction.creditsAdded;
        } else if (transaction.type === 'plan_purchase' || transaction.type === 'plan_renewal') {
          user.plan = transaction.plan;
          if (user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) {
            user.credits = 0; // Reset expired credits
          }
          user.credits = (user.credits || 0) + transaction.creditsAdded;
          user.totalCreditsPurchased = (user.totalCreditsPurchased || 0) + transaction.creditsAdded;
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 30);
          user.planExpiresAt = expiry;
        } else if (transaction.type === 'plan_upgrade') {
          user.plan = transaction.plan;
          if (user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) {
            user.credits = 0; // Reset expired credits
          }
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

            const planNameLower = (brandProfile.selectedPlan || '').toLowerCase();
            const isHighTier = planNameLower.includes('growth') || 
                               planNameLower.includes('pro') || 
                               planNameLower.includes('agency');

            if (isHighTier || transaction.type === 'dm_addon_purchase') {
              brandProfile.DM_Automation_Service = true;
            } else if (transaction.type !== 'dm_addon_purchase') {
              brandProfile.DM_Automation_Service = false;
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

        // Meta Conversions API (Purchase)
        if (req.body.metaEventId) {
          console.log("🔥 [TESTING] Firing Meta CAPI Event: Purchase (Backend)");
          sendMetaCapiEvent('Purchase', req.body.metaEventId, {
            email: invoiceEmail,
            clientIp: req.ip || req.headers['x-forwarded-for'],
            clientUserAgent: req.headers['user-agent']
          }, {
            value: transaction.amount,
            currency: 'INR'
          });
        }

        try {
          await AdminNotification.create({
            type: 'payment',
            title: 'Payment Received',
            description: `Payment of ₹${transaction.amount} received from ${invoiceEmail} for ${transaction.type}`,
            metadata: { userId: user._id, transactionId: transaction._id, amount: transaction.amount }
          });
        } catch (err) {
          console.error('[Admin Notification] Failed to create payment notification:', err.message);
        }

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
        if (transaction.status === 'failed') {
          if (razorpay_payment_id && transaction.razorpayPaymentId !== razorpay_payment_id) {
            transaction.razorpayPaymentId = razorpay_payment_id;
            await transaction.save();
          }
        } else {
          transaction.status = 'failed';
          transaction.razorpayPaymentId = razorpay_payment_id;
          await transaction.save();

          // Fetch user details for sending the failure email
          const user = await User.findById(transaction.user);
          if (user) {
            const billingEmail = user.billingAddress?.email || user.email;
            sendPaymentFailedEmail({
              to: billingEmail,
              userName: user.billingAddress?.fullName || user.name || user.email,
              userEmail: billingEmail,
              transactionType: transaction.type,
              planName: transaction.plan || '',
              amount: transaction.amount,
              razorpayPaymentId: razorpay_payment_id,
              razorpayOrderId: razorpay_order_id,
              transactionId: String(transaction._id)
            }).catch((err) =>
              console.error('[Payment Failed Email] Failed to send failure email:', err.message)
            );
          }
        }
      }
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Error in verifyPayment:', error);
    res.status(500).json({ message: 'Internal server error', error: 'An internal server error occurred.' });
  }
};

export const getPaymentHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Internal server error', error: 'An internal server error occurred.' });
  }
};

export const downloadInvoice = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).send('Invoice not found');
    }
    const user = await User.findById(transaction.user);
    if (!user) {
      return res.status(404).send('User not found');
    }

    const invoiceNumber = genInvoiceNo(transaction._id);
    const invoiceDate = fmtDate(transaction.createdAt);
    const packMeta = resolvePack(transaction.type, transaction.plan, transaction.creditsAdded);

    const params = {
      invoiceNumber,
      invoiceDate,
      userName: user.billingAddress?.fullName || user.name || user.email,
      userEmail: user.billingAddress?.email || user.email,
      billingAddress: user.billingAddress || {},
      packMeta,
      amount: transaction.amount,
      creditsAdded: transaction.creditsAdded || 0,
      razorpayPaymentId: transaction.razorpayPaymentId,
      razorpayOrderId: transaction.razorpayOrderId,
      planExpiresAt: user.planExpiresAt || null,
      couponCode: transaction.couponCode || '',
      discountAmount: transaction.discountAmount || 0,
      discountPercentage: transaction.discountPercentage || 0,
      transactionId: String(transaction._id),
    };

    const pdfBuffer = await generatePDFBuffer(params);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).send('Internal server error');
  }
};

export const reportPaymentFailure = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, reason, billingAddress } = req.body;

    console.log(`[Payment Failure Report] 🚨 Received failure report for Order: ${razorpayOrderId}, Payment: ${razorpayPaymentId || 'N/A'}`);

    const transaction = await Transaction.findOne({ razorpayOrderId });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.status === 'failed') {
      if (razorpayPaymentId && transaction.razorpayPaymentId !== razorpayPaymentId) {
        transaction.razorpayPaymentId = razorpayPaymentId;
        await transaction.save();
      }
      return res.status(200).json({ success: true, message: 'Failure already recorded. Suppressing duplicate email.' });
    }

    // Mark as failed
    transaction.status = 'failed';
    if (razorpayPaymentId) transaction.razorpayPaymentId = razorpayPaymentId;
    await transaction.save();

    // Send email alert to user
    const user = await User.findById(req.user._id);
    if (user) {
      const billingEmail = billingAddress?.email || user.email;
      sendPaymentFailedEmail({
        to: billingEmail,
        userName: billingAddress?.fullName || user.name || user.email,
        userEmail: billingEmail,
        transactionType: transaction.type,
        planName: transaction.plan || '',
        amount: transaction.amount,
        razorpayPaymentId: razorpayPaymentId || '',
        razorpayOrderId: razorpayOrderId,
        transactionId: String(transaction._id)
      }).catch(err => {
        console.error('[Payment Failed Email] Failed to send failure email:', err.message);
      });
    }

    return res.status(200).json({ success: true, message: 'Failure recorded and notification dispatched.' });
  } catch (error) {
    console.error('Error reporting payment failure:', error);
    res.status(500).json({ message: 'Internal server error', error: 'An internal server error occurred.' });
  }
};
