import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import appleSigninAuth from 'apple-signin-auth';
import { sendLoginNotificationEmail, sendSignupNotificationEmail } from '../utils/sendWelcomeEmail.js';
import { createNotification } from '../utils/notificationHelper.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP is not configured');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const msg = {
    to: email,
    from: `Velocity <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    subject: 'Your Velocity verification code',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2563eb; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Velocity</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #f3f4f6;">
          <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 14px;">Verify Your Email</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 22px;">
            Hi ${name || 'there'}, use the one-time code below to verify your Velocity account.
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

  await transporter.sendMail(msg);
};

export const signup = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && existingUser.isVerified === true) {
      if (normalizedEmail.endsWith('@gmail.com') || existingUser.googleId) {
        return res.status(400).json({ message: 'Already have an account? Try logging in either through email/password or Google sign-in.' });
      }
      return res.status(400).json({ message: 'Already have an account? Try signing in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const hashedOtp = hashOtp(otp);

    let user;

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

    try {
      await sendOtpEmail(user.email, user.name, otp);
    } catch (mailError) {
      console.error('OTP email send failed:', mailError);
      return res.status(500).json({ message: 'Unable to send verification OTP. Please try again.' });
    }

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
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.password) return res.status(400).json({ message: 'User uses OAuth to login. Please login using Google or Apple.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    if (user.isVerified === false) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    // Send login notification email
    try {
      await sendLoginNotificationEmail({
        to: user.email,
        name: user.name,
      });
    } catch (mailError) {
      console.error('Login notification email failed:', mailError.message);
      // Don't fail login if email fails
    }

    // Push notification to UI drawer
    await createNotification(
      user._id,
      'success',
      'Account Login',
      `Successful login detected from a new session.`
    );

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
        audience: process.env.GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
      googleId = payload.sub;
    }

    let user = await User.findOne({ email });
    let isNewUser = false;
    if (!user) {
      user = await User.create({ name, email, googleId, isVerified: true });
      isNewUser = true;
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

    if (isNewUser) {
      // Email will be sent when user selects plan on Setup page
    } else {
      // Send login notification for returning users
      try {
        await sendLoginNotificationEmail({
          to: user.email,
          name: user.name,
        });
      } catch (mailError) {
        console.error('Google login notification email failed:', mailError.message);
      }
    }

    if (isNewUser && !user.password) {
      // New user via Google - require password setup
      res.status(200).json({ 
        user, 
        requiresPasswordSetup: true,
        tempToken: generateToken(user._id)
      });
    } else {
      await createNotification(
        user._id,
        'success',
        'Google Login',
        `Authenticated successfully via Google.`
      );
      res.status(200).json({ user, token: generateToken(user._id) });
    }
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ message: 'Google Auth failed' });
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
    
    let user = await User.findOne({ email });
    let isNewUser = false;
    if (!user) {
      user = await User.create({ name, email, appleId, isVerified: true });
      isNewUser = true;
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

    if (isNewUser) {
      // Email will be sent when user selects plan on Setup page
    } else {
      // Send login notification for returning users
      try {
        await sendLoginNotificationEmail({
          to: user.email,
          name: user.name,
        });
      } catch (mailError) {
        console.error('Apple login notification email failed:', mailError.message);
      }
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
    await user.save();

    // Send signup notification email
    try {
      await sendSignupNotificationEmail({
        to: user.email,
        name: user.name,
        provider: inferAuthProvider(user),
      });
    } catch (mailError) {
      console.error('Signup notification email failed:', mailError.message);
      // Don't fail verification if email fails
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

    try {
      await sendOtpEmail(user.email, user.name, otp);
    } catch (mailError) {
      console.error('OTP resend failed:', mailError);
      return res.status(500).json({ message: 'Unable to resend OTP. Please try again.' });
    }

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

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      console.log("Attempting native NodeMailer dispatch to:", user.email);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/resetpassword/${resetToken}`;
      const msg = {
        to: user.email,
        from: `Velocity <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        subject: '🔒 Reset Your Velocity Password',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #2563eb; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Velocity</h1>
            </div>
            <div style="background-color: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #f3f4f6;">
              <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">Reset Your Password</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                We received a request to securely reset the password for your Velocity account. 
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
                &copy; ${new Date().getFullYear()} Velocity AaaS. All rights reserved.
              </p>
            </div>
          </div>
        `,
      };
      
      try {
        const info = await transporter.sendMail(msg);
        console.log("Email successfully dispatched! Info:", info.response);
      } catch (mailErr) {
        console.error("Nodemailer Dispatch Failed:", mailErr);
        throw mailErr;
      }
    } else {
      console.warn("SMTP_HOST, SMTP_USER, or SMTP_PASS is missing. Email skipped.");
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

    const hashedPassword = await bcrypt.hash(password, 12);
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

    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password set successfully', token: generateToken(user._id) });
  } catch (error) {
    console.error('Set Password Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
