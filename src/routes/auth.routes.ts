import { Router } from 'express';
import { register, loginLocal, refresh, logout, me, changePassword, forgotPassword, resetPassword, verifyEmail, verifyOTP, resendOTP } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  verifyOTPSchema,
  resendOTPSchema,
} from './auth.schema';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/verify-otp', validate(verifyOTPSchema), verifyOTP);
router.post('/resend-otp', validate(resendOTPSchema), resendOTP);
router.post('/login', validate(loginSchema), loginLocal);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);

export default router;
