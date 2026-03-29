import express, { Router } from 'express';
import {
  getUser,
  refreshToken,
  resetUserPassword,
  userForgotPassword,
  userLogin,
  userRegistration,
  verifyUser,
} from '../controllers/auth.controller';
import { verifyForgotPasswordOtp } from '../utils/auth.helper';
import { isAuthenticated } from '@multi-vendor-ecommerce/middleware';

const router: Router = express.Router();

router.post('/user-registration', userRegistration);
router.post('/verify-user', verifyUser);
router.post('/login-user', userLogin);
router.post('/refresh-token-user', refreshToken);
router.get('/logged-in-user', isAuthenticated, getUser);
router.post('/forgot-password-user', userForgotPassword);
router.post('/reset-password-user', resetUserPassword);
router.post('/verify-forgot-password-user', verifyForgotPasswordOtp);

export default router;
