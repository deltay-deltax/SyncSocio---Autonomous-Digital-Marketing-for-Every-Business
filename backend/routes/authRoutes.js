import express from 'express';
import { signup, login, googleLogin, appleLogin, verifyOtp, resendOtp, forgotPassword, resetPassword } from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/apple', appleLogin);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resetToken', resetPassword);

export default router;
