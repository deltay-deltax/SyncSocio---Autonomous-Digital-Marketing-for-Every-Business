import express from 'express';
import { signup, login, googleLogin, appleLogin, verifyOtp, resendOtp, forgotPassword, resetPassword, setPassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authRateLimiter, authAccountRateLimiter } from '../middleware/rateLimitMiddleware.js';
import { validate } from '../middleware/validate.js';
import { signupSchema, loginSchema, googleLoginSchema, appleLoginSchema, verifyOtpSchema, resendOtpSchema, forgotPasswordSchema, resetPasswordParamsSchema, resetPasswordBodySchema, setPasswordSchema } from '../validators/authSchemas.js';

const router = express.Router();

// Auth routes with strict rate limiting (per-IP + per-account exponential backoff)
router.post('/signup', authRateLimiter, authAccountRateLimiter, validate({ body: signupSchema }), signup);
router.post('/verify-otp', authRateLimiter, authAccountRateLimiter, validate({ body: verifyOtpSchema }), verifyOtp);
router.post('/resend-otp', authRateLimiter, authAccountRateLimiter, validate({ body: resendOtpSchema }), resendOtp);
router.post('/login', authRateLimiter, authAccountRateLimiter, validate({ body: loginSchema }), login);
router.post('/google', authRateLimiter, validate({ body: googleLoginSchema }), googleLogin);
router.post('/apple', authRateLimiter, validate({ body: appleLoginSchema }), appleLogin);
router.post('/set-password', protect, validate({ body: setPasswordSchema }), setPassword);
router.post('/forgotpassword', authRateLimiter, authAccountRateLimiter, validate({ body: forgotPasswordSchema }), forgotPassword);
router.put('/resetpassword/:resetToken', authRateLimiter, validate({ params: resetPasswordParamsSchema, body: resetPasswordBodySchema }), resetPassword);

router.post('/logout', protect, (req, res) => {
    import('../utils/notificationHelper.js').then(m => {
        m.createNotification(req.user._id, 'alert', 'Account Logout', 'User logged out of the current session.');
    });
    res.status(200).json({ message: 'Logged out' });
});

export default router;
