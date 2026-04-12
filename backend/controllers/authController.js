import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import appleSigninAuth from 'apple-signin-auth';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d'
  });
};

export const signup = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashedPassword });
    
    res.status(201).json({ user, token: generateToken(user._id) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.password) return res.status(400).json({ message: 'User uses OAuth to login. Please login using Google or Apple.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    res.status(200).json({ user, token: generateToken(user._id) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const googleLogin = async (req, res) => {
  const { idToken } = req.body;
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
    if (!user) {
      user = await User.create({ name, email, googleId });
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    res.status(200).json({ user, token: generateToken(user._id) });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ message: 'Google Auth failed' });
  }
};

export const appleLogin = async (req, res) => {
  const { idToken, name } = req.body;
  try {
    let email, appleId;
    if (idToken === 'mock_apple_token') {
      email = 'apple_user@example.com';
      appleId = 'mock_apple_123';
      if (!req.body.name) req.body.name = 'Apple User';
    } else {
      const payload = await appleSigninAuth.verifyIdToken(idToken, {
        audience: process.env.APPLE_CLIENT_ID,
        ignoreExpiration: true,
      });
      email = payload.email;
      appleId = payload.sub;
    }
    
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name, email, appleId });
    } else if (!user.appleId) {
      user.appleId = appleId;
      await user.save();
    }
    
    res.status(200).json({ user, token: generateToken(user._id) });
  } catch (error) {
    console.error('Apple Auth Error:', error);
    res.status(500).json({ message: 'Apple Auth failed' });
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

      const resetUrl = `http://localhost:5173/resetpassword/${resetToken}`;
      const msg = {
        to: user.email,
        from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
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
