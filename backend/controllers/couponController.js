import Coupon from '../models/Coupon.js';

export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    
    // Fallback for demo coupons if not found in DB
    const demoCoupons = {
      'WELCOME10': 10,
      'VELOCITY20': 20,
      'LAUNCH50': 50,
      'LAUNCH': 40
    };

    let finalCode = null;
    let finalDiscount = 0;

    if (!coupon) {
      const fallbackDiscount = demoCoupons[code.toUpperCase().trim()];
      if (fallbackDiscount) {
        finalCode = code.toUpperCase().trim();
        finalDiscount = fallbackDiscount;
      } else {
        return res.status(404).json({ success: false, message: 'Invalid coupon code' });
      }
    } else {
      if (!coupon.isActive) {
        return res.status(400).json({ success: false, message: 'Coupon is inactive' });
      }
      if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
        return res.status(400).json({ success: false, message: 'Coupon has expired' });
      }
      finalCode = coupon.code;
      finalDiscount = coupon.discountPercentage;
    }

    return res.status(200).json({
      success: true,
      message: 'Coupon applied successfully!',
      code: finalCode,
      discountPercentage: finalDiscount,
      coupon: {
        code: finalCode,
        discountPercentage: finalDiscount
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return res.status(500).json({ success: false, message: 'Server error validating coupon' });
  }
};
