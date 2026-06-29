import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
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
