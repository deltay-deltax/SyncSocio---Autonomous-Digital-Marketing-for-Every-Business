import express from 'express';
import { signup, login, googleLogin, appleLogin, verifyOtp, resendOtp, forgotPassword, resetPassword, setPassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/apple', appleLogin);
router.post('/set-password', protect, setPassword);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resetToken', resetPassword);

router.post('/logout', protect, (req, res) => {
    import('../utils/notificationHelper.js').then(m => {
        m.createNotification(req.user._id, 'alert', 'Account Logout', 'User logged out of the current session.');
    });
    res.status(200).json({ message: 'Logged out' });
});

export default router;
