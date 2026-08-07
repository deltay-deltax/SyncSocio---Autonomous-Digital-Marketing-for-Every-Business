import User from '../models/User.js';
import BrandProfile from '../models/BrandProfile.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import sgMail from '@sendgrid/mail';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import appleSigninAuth from 'apple-signin-auth';
import { sendLoginNotificationEmail, sendSignupNotificationEmail } from '../utils/sendWelcomeEmail.js';
import { sendMetaCapiEvent } from '../services/metaConversionsAPI.js';
import { createNotification } from '../utils/notificationHelper.js';
import { clearAuthAttempts } from '../middleware/rateLimitMiddleware.js';
import AdminNotification from '../models/AdminNotification.js';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const DISPOSABLE_EMAIL_DOMAINS = [
  'mailinator.com', 'yopmail.com', 'temp-mail.org', 'guerrillamail.com', '10minutemail.com',
  'sharklasers.com', 'grr.la', 'dispostable.com', 'throwawaymail.com', 'tempmail.com',
  'temp-mail.com', 'fakeinbox.com', 'maildrop.cc', 'getairmail.com', 'tempmailaddress.com',
  'nada.ltd', 'inboxkitten.com', 'tempmail.ninja', 'mailnesia.com', 'tempinbox.com'
];

const isDisposableEmail = (email) => {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
};

const inferAuthProvider = (user) => {
  if (user?.googleId) return 'google';
  if (user?.appleId) return 'apple';
  return 'email';
};

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d'
  });
};

const OTP_EXPIRY_MINUTES = 10;

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

const sendOtpEmail = async (email, name, otp) => {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SendGrid API Key is not configured');
  }
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: email,
    from: `SyncSocio <${process.env.SMTP_FROM_EMAIL || 'admin@syncsocio.com'}>`,
    subject: 'Your SyncSocio verification code',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2563eb; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">SyncSocio</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #f3f4f6;">
          <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 14px;">Verify Your Email</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 22px;">
            Hi ${name || 'there'}, use the one-time code below to verify your SyncSocio account.
          </p>
          <div style="text-align: center; margin: 20px 0 24px;">
            <div style="display: inline-block; font-size: 34px; letter-spacing: 8px; font-weight: 800; color: #111827; background: #f3f4f6; padding: 12px 18px; border-radius: 10px;">
              ${otp}
            </div>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin: 0; text-align: center;">
            This code expires in ${OTP_EXPIRY_MINUTES} minutes.
          </p>
        </div>
      </div>
    `,
  };

  await sgMail.send(msg);
};

export const signup = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (isDisposableEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Temporary or disposable email addresses are not allowed.' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    const isMetaReviewer = normalizedEmail === 'supportvelocitydm@gmail.com';

    if (existingUser && !isMetaReviewer) {
      if (existingUser.googleId) {
        return res.status(400).json({ message: 'Account already exists. Please try logging in with Google.' });
      }
      return res.status(400).json({ message: 'Account already exists. Please try logging in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const hashedOtp = hashOtp(otp);

    let user;

    // --- META REVIEW BYPASS ---
    if (isMetaReviewer) {
      if (existingUser) {
        // Reset their brand completely
        await BrandProfile.deleteMany({ user: existingUser._id });
        existingUser.activeBrandId = null;
        
        existingUser.name = name;
        existingUser.password = hashedPassword;
        existingUser.isVerified = true;
        user = await existingUser.save();
      } else {
        user = await User.create({
          name,
          email: normalizedEmail,
          password: hashedPassword,
          isVerified: true,
        });
      }

      return res.status(200).json({
        message: 'Signup successful!',
        token: generateToken(user._id),
        user,
      });
    }
    // --- END BYPASS ---

    if (existingUser) {
      existingUser.name = name;
      existingUser.password = hashedPassword;
      existingUser.isVerified = false;
      existingUser.otpCode = hashedOtp;
      existingUser.otpExpiry = otpExpiry;
      user = await existingUser.save();
    } else {
      user = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        isVerified: false,
        otpCode: hashedOtp,
        otpExpiry,
      });
    }

    // Send OTP email asynchronously
    sendOtpEmail(user.email, user.name, otp)
      .then(() => console.log(`[DEV MODE] OTP for ${user.email} is ${otp}`))
      .catch(mailError => console.error('OTP email send failed:', mailError));

    res.status(existingUser ? 200 : 201).json({
      message: 'OTP sent to your email. Please verify to complete signup.',
      email: user.email,
      requiresOtp: true,
      otpExpiresAt: user.otpExpiry,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    
    // --- META REVIEW BYPASS ---
    const isMetaReviewer = email?.toLowerCase().trim() === 'supportvelocitydm@gmail.com';
    if (isMetaReviewer && user) {
        await BrandProfile.deleteMany({ user: user._id });
        user.activeBrandId = null;
        await user.save();
    }
    // --- END BYPASS ---

    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked by the admin. Please contact support.' });
    }

    if (!user.password) return res.status(400).json({ message: 'User uses OAuth to login. Please login using Google or Apple.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    if (user.isVerified === false) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    if (user.lastLogin && user.lastLogin < oneMonthAgo) {
      // Send login notification email asynchronously
      sendLoginNotificationEmail({
        to: user.email,
        name: user.name,
      }).catch(mailError => {
        console.error('Login notification email failed:', mailError.message);
      });
    }

    user.lastLogin = new Date();
    await user.save();

    // Push notification to UI drawer asynchronously
    createNotification(
      user._id,
      'success',
      'Account Login',
      `Successful login detected from a new session.`
    ).catch(err => console.error('Notification creation failed:', err));

    clearAuthAttempts(email);
    res.status(200).json({ user, token: generateToken(user._id) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const googleLogin = async (req, res) => {
  const { idToken, plan, isSignup } = req.body;
  try {
    let email, name, googleId;
    if (idToken === 'mock_google_token') {
      email = 'google_user@example.com';
      name = 'Google User';
      googleId = 'mock_google_123';
    } else {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
        clockTolerance: 86400
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
      googleId = payload.sub;
    }

    if (isDisposableEmail(email)) {
      return res.status(400).json({ message: 'Temporary or disposable email addresses are not allowed.' });
    }

    let user = await User.findOne({ email });
    if (user && user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked by the admin. Please contact support.' });
    }
    let isNewUser = false;
    if (!user) {
      user = await User.create({ name, email, googleId, isVerified: true, lastLogin: new Date() });
      isNewUser = true;

      await AdminNotification.create({
        type: 'new_user',
        title: 'New Google Sign Up',
        description: `New user signed up via Google: ${email}`,
        metadata: { userId: user._id, email }
      });
    } else {
      if (isSignup) {
        return res.status(400).json({ message: 'Already have an account? Try logging in either through email/password or Google sign-in.' });
      }
      let shouldSave = false;

      if (!user.googleId) {
        user.googleId = googleId;
        shouldSave = true;
      }

      if (user.isVerified === false) {
        user.isVerified = true;
        user.otpCode = undefined;
        user.otpExpiry = undefined;
        shouldSave = true;
      }

      if (shouldSave) {
        await user.save();
      }
    }
    
    // Meta Conversions API (CompleteRegistration)
    if (req.body.metaEventId && (isNewUser || isSignup)) {
      console.log("🔥 [TESTING] Firing Meta CAPI Event: CompleteRegistration (Backend via Google/OAuth)");
      sendMetaCapiEvent('CompleteRegistration', req.body.metaEventId, {
        email: user.email,
        clientIp: req.ip || req.headers['x-forwarded-for'],
        clientUserAgent: req.headers['user-agent']
      });
    }

    if (isNewUser) {
      // Email will be sent when user selects plan on Setup page
    } else {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      if (user.lastLogin && user.lastLogin < oneMonthAgo) {
        // Send login notification for returning users
        try {
          // TEMPORARY: Disabled for Render free tier
          // await sendLoginNotificationEmail({
          //   to: user.email,
          //   name: user.name,
          // });
        } catch (mailError) {
          console.error('Google login notification email failed:', mailError.message);
        }
      }
      user.lastLogin = new Date();
      await user.save();
    }

    await createNotification(
      user._id,
      'success',
      'Google Login',
      `Authenticated successfully via Google.`
    );
    clearAuthAttempts(email);
    res.status(200).json({ user, token: generateToken(user._id) });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ message: 'Google Auth failed' });
  }
};

export const startFreeTrial = async (req, res) => {
  const { deviceFingerprint } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.freeTrialUsed || user.plan === 'Free Trial') {
      return res.status(400).json({ message: 'Free trial has already been used on this account.' });
    }

    if (!deviceFingerprint) {
      return res.status(400).json({ message: 'Device verification failed.' });
    }

    // Check if another user already used this fingerprint
    const existingFingerprint = await User.findOne({ deviceFingerprint });
    if (existingFingerprint && existingFingerprint._id.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'Free trial has already been claimed on this device.' });
    }

    // Grant 15 credits and set plan
    user.credits = (user.credits || 0) + 15;
    user.plan = 'Free Trial';
    user.freeTrialUsed = true;
    user.deviceFingerprint = deviceFingerprint;
    
    // Ensure they have a brand profile so the dashboard doesn't break
    let brand = await BrandProfile.findOne({ user: user._id });
    if (!brand) {
      brand = await BrandProfile.create({
        user: user._id,
        brandName: 'My Brand',
        nexa: { nexa_enabled: false } // Force Nexa disabled on free trial
      });
      user.activeBrandId = brand._id;
    } else {
      // Disable Nexa for existing brand if they are just claiming trial now
      brand.nexa = { ...brand.nexa, nexa_enabled: false };
      await brand.save();
    }

    await user.save();

    await createNotification(
      user._id,
      'success',
      'Free Trial Started',
      `You've received 15 free credits to generate AI creatives!`
    );

    res.status(200).json({ success: true, message: 'Free trial activated!', user });
  } catch (error) {
    console.error('Start Free Trial Error:', error);
    res.status(500).json({ message: 'Failed to start free trial' });
  }
};

export const appleLogin = async (req, res) => {
  const { idToken, name: providedName, plan, isSignup } = req.body;
  try {
    let email, appleId;
    let name = providedName;
    if (idToken === 'mock_apple_token') {
      email = 'apple_user@example.com';
      appleId = 'mock_apple_123';
      if (!name) name = 'Apple User';
    } else {
      const payload = await appleSigninAuth.verifyIdToken(idToken, {
        audience: process.env.APPLE_CLIENT_ID,
        ignoreExpiration: true,
      });
      email = payload.email;
      appleId = payload.sub;
    }
    
    if (isDisposableEmail(email)) {
      return res.status(400).json({ message: 'Temporary or disposable email addresses are not allowed.' });
    }

    let user = await User.findOne({ email });
    if (user && user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked by the admin. Please contact support.' });
    }
    let isNewUser = false;
    if (!user) {
      user = await User.create({ name, email, appleId, isVerified: true, lastLogin: new Date() });
      isNewUser = true;

      await AdminNotification.create({
        type: 'new_user',
        title: 'New Apple Sign Up',
        description: `New user signed up via Apple: ${email}`,
        metadata: { userId: user._id, email }
      });
    } else {
      if (isSignup) {
        return res.status(400).json({ message: 'Already have an account? Try logging in either through email/password or Apple sign-in.' });
      }
      let shouldSave = false;

      if (!user.appleId) {
        user.appleId = appleId;
        shouldSave = true;
      }

      if (user.isVerified === false) {
        user.isVerified = true;
        user.otpCode = undefined;
        user.otpExpiry = undefined;
        shouldSave = true;
      }

      if (shouldSave) {
        await user.save();
      }
    }

    // Meta Conversions API (CompleteRegistration)
    if (req.body.metaEventId && (isNewUser || isSignup)) {
      console.log("🔥 [TESTING] Firing Meta CAPI Event: CompleteRegistration (Backend via GitHub/OAuth)");
      sendMetaCapiEvent('CompleteRegistration', req.body.metaEventId, {
        email: user.email,
        clientIp: req.ip || req.headers['x-forwarded-for'],
        clientUserAgent: req.headers['user-agent']
      });
    }

    if (isNewUser) {
      // Email will be sent when user selects plan on Setup page
    } else {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      if (user.lastLogin && user.lastLogin < oneMonthAgo) {
        // Send login notification for returning users
        try {
          // TEMPORARY: Disabled for Render free tier
          // await sendLoginNotificationEmail({
          //   to: user.email,
          //   name: user.name,
          // });
        } catch (mailError) {
          console.error('Apple login notification email failed:', mailError.message);
        }
      }
      user.lastLogin = new Date();
      await user.save();
    }
    
    if (isNewUser && !user.password) {
      // New user via Apple - require password setup
      res.status(200).json({ 
        user, 
        requiresPasswordSetup: true,
        tempToken: generateToken(user._id)
      });
    } else {
      await createNotification(
        user._id,
        'success',
        'Apple Login',
        `Authenticated successfully via Apple.`
      );
      clearAuthAttempts(email);
      res.status(200).json({ user, token: generateToken(user._id) });
    }
  } catch (error) {
    console.error('Apple Auth Error:', error);
    res.status(500).json({ message: 'Apple Auth failed' });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked by the admin. Please contact support.' });
    }

    if (user.isVerified === true) {
      return res.status(400).json({ message: 'Email already verified. Please login.' });
    }

    if (!user.otpCode || !user.otpExpiry) {
      return res.status(400).json({ message: 'No OTP found. Please request a new OTP.' });
    }

    if (user.otpExpiry.getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
    }

    if (hashOtp(otp) !== user.otpCode) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    user.lastLogin = new Date();
    await user.save();

    await AdminNotification.create({
      type: 'new_user',
      title: 'New User Verified',
      description: `New user verified email: ${user.email}`,
      metadata: { userId: user._id, email: user.email }
    });


    // Send signup notification email asynchronously
    sendSignupNotificationEmail({
      to: user.email,
      name: user.name,
      provider: inferAuthProvider(user),
    }).catch(mailError => {
      console.error('Signup notification email failed:', mailError.message);
    });

    // Meta Conversions API (CompleteRegistration)
    if (req.body.metaEventId) {
      console.log("🔥 [TESTING] Firing Meta CAPI Event: CompleteRegistration (Backend via Email OTP Verify)");
      sendMetaCapiEvent('CompleteRegistration', req.body.metaEventId, {
        email: user.email,
        clientIp: req.ip || req.headers['x-forwarded-for'],
        clientUserAgent: req.headers['user-agent']
      });
    }

    res.status(200).json({
      message: 'Email verified successfully',
      user,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const resendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified === true) {
      return res.status(400).json({ message: 'User is already verified' });
    }

    const otp = generateOtp();
    user.otpCode = hashOtp(otp);
    user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await user.save();

    // Send OTP email asynchronously
    sendOtpEmail(user.email, user.name, otp)
      .then(() => console.log(`[DEV MODE] Resent OTP for ${user.email} is ${otp}`))
      .catch(mailError => console.error('OTP resend failed:', mailError));

    res.status(200).json({
      message: 'A new OTP has been sent to your email.',
      email: user.email,
      otpExpiresAt: user.otpExpiry,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User with this email not found' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 mins

    await user.save({ validateBeforeSave: false });

    if (process.env.SENDGRID_API_KEY) {
      console.log("Attempting SendGrid dispatch to:", user.email);
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/resetpassword/${resetToken}`;
      const msg = {
        to: user.email,
        from: `SyncSocio <${process.env.SMTP_FROM_EMAIL || 'admin@syncsocio.com'}>`,
        subject: '🔒 Reset Your SyncSocio Password',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #2563eb; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">SyncSocio</h1>
            </div>
            <div style="background-color: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #f3f4f6;">
              <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">Reset Your Password</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                We received a request to securely reset the password for your SyncSocio account. 
                If you didn't make this request, you can safely ignore this email.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                  Reset Password &rarr;
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin-bottom: 0;">
                Or copy and paste this link into your browser:
                <br>
                <a href="${resetUrl}" style="color: #2563eb; word-break: break-all; margin-top: 8px; display: inline-block;">${resetUrl}</a>
              </p>
            </div>
            <div style="text-align: center; margin-top: 24px;">
              <p style="color: #9ca3af; font-size: 12px;">
                &copy; ${new Date().getFullYear()} SyncSocio. All rights reserved.
              </p>
            </div>
          </div>
        `,
      };

      sgMail.send(msg)
        .then(() => console.log(`Password reset email reliably sent to ${user.email} via SendGrid.`))
        .catch(err => console.error('Password reset email failed:', err));
    } else {
      console.warn("SENDGRID_API_KEY is missing. Email skipped.");
    }

    res.status(200).json({
      message: 'Password reset email placed in queue.',
    });
  } catch (error) {
    console.error("Forgot PW Error: ", error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const resetPassword = async (req, res) => {
  const { resetToken } = req.params;
  const { password } = req.body;

  try {
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Ensure the new password is not the same as the current password
    if (user.password) {
      const isSamePassword = await bcrypt.compare(password, user.password);
      if (isSamePassword) {
        return res.status(400).json({ message: 'Your new password must be different from your previously used password.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ user, token: generateToken(user._id) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const setPassword = async (req, res) => {
  const { password, confirmPassword } = req.body;
  try {
    if (!password || !confirmPassword) {
      return res.status(400).json({ message: 'Password and confirmation are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password set successfully', token: generateToken(user._id) });
  } catch (error) {
    console.error('Set Password Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
