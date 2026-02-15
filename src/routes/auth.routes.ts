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
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);

// ============================================================================
// GOOGLE OAUTH ROUTES
// ============================================================================

// Initiate Google OAuth flow
router.get(
  '/google',
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
    failureRedirect: '/login?error=google_auth_failed',
  }),
  googleCallback
);

// ============================================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================================

// Profile
router.get('/profile', authenticate, getProfile);

// Logout
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAllDevices);

// Verification
router.post('/verify-email', authenticate, verifyEmail);
router.post('/verify-phone', authenticate, verifyPhone);
router.post('/resend-verification', authenticate, resendVerification);

// Session Management
router.get('/sessions', authenticate, getActiveSessions);
router.get('/sessions/stats', authenticate, getSessionStats);
router.delete('/sessions/:sessionId', authenticate, revokeSession);

export default router;
