import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice('Bearer '.length).trim();
  }

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      console.error('FATAL: JWT_SECRET environment variable is not set.');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });

    // Populate activeBrandId fallback if not set
    if (!req.user.activeBrandId) {
      const BrandProfile = (await import('../models/BrandProfile.js')).default;
      const defaultBrand = await BrandProfile.findOne({ user: req.user._id });
      if (defaultBrand) {
        req.user.activeBrandId = defaultBrand._id;
        await req.user.save();
      }
    }

    // Lazy check: If plan is expired, zero out credits automatically
    if (req.user.planExpiresAt && new Date(req.user.planExpiresAt) < new Date() && req.user.credits > 0) {
      req.user.credits = 0;
      await req.user.save();
    }

    if (req.user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked by the admin. Please contact support.' });
    }
    return next();
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Not authorized, token expired' });
    }
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};
