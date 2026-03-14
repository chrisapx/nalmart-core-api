import { Router } from 'express';
import passport from 'passport';
import {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
  verifyEmail,
  verifyPhone,
  resendVerification,
  getActiveSessions,
  revokeSession,
  logoutAllDevices,
  getSessionStats,
  googleAuth,
  googleCallback,
  googleOneTap,
  setupPassword,
  forgotPassword,
  resetPassword,
  requestLoginOTP,
  loginWithOTP,
  changePassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);

// Password recovery
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// OTP Login
router.post('/request-otp', requestLoginOTP);
router.post('/login-otp', loginWithOTP);

// Email/Phone Verification (Public - users verify after registration)
router.post('/verify-email', verifyEmail);
router.post('/verify-phone', verifyPhone);
router.post('/resend-verification', resendVerification);

// ============================================================================
// GOOGLE OAUTH ROUTES
// ============================================================================

// Initiate Google OAuth flow
router.get(
  '/google',
  (req, res, next) => {
    // Check if Google OAuth is configured
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return res.status(400).json({
        success: false,
        message: 'Google OAuth is not configured. Please contact the administrator.',
      });
    }
    next();
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/api/v1/auth/google/failure',
  }),
  googleCallback
);

// Google OAuth failure route
router.get('/google/failure', (req, res) => {
  const error = req.query.error || 'Unknown error occurred during Google authentication';
  res.status(401).json({
    success: false,
    message: 'Google authentication failed',
    error: error,
    details: 'Please ensure the callback URL is correctly configured in both your backend and Google Cloud Console.',
  });
});

// Google One Tap (credential POST from browser)
router.post('/google/onetap', googleOneTap);

// ============================================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================================

// Profile
router.get('/profile', authenticate, getProfile);
router.post('/change-password', authenticate, changePassword);
router.post('/setup-password', authenticate, setupPassword);

// Logout
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAllDevices);


// Session Management
router.get('/sessions', authenticate, getActiveSessions);
router.get('/sessions/stats', authenticate, getSessionStats);
router.delete('/sessions/:sessionId', authenticate, revokeSession);

export default router;
