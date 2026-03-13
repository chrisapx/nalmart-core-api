import { Router, Request, Response, NextFunction } from 'express';
import { PushService } from '../services/push.service';
import { authenticate, optionalAuth } from '../middleware/auth';
import { AuthRequest } from '../types/express';

const router = Router();

/**
 * GET /push/vapid-public-key
 * Returns the VAPID public key so the browser can create a push subscription.
 * Public — no auth required.
 */
router.get('/vapid-public-key', (_req: Request, res: Response) => {
  res.json({ publicKey: PushService.getPublicKey() });
});

/**
 * POST /push/subscribe
 * Body: { endpoint, keys: { p256dh, auth }, role: 'client' | 'admin', userAgent? }
 * Authenticated users get their user_id linked automatically.
 * Unauthenticated (e.g. admin SPA pre-login) still works; userId stays null.
 */
router.post('/subscribe', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { endpoint, keys, role = 'client', userAgent } = req.body as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      role?: 'client' | 'admin';
      userAgent?: string;
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ success: false, message: 'endpoint, keys.p256dh, and keys.auth are required' });
      return;
    }

    // optionalAuth already attached user if a valid token was provided
    const userId: number | null = (req as AuthRequest).userId ?? null;

    await PushService.upsertSubscription({
      endpoint,
      p256dh: keys.p256dh,
      auth:   keys.auth,
      role:   role === 'admin' ? 'admin' : 'client',
      userId,
      userAgent,
    });

    res.status(201).json({ success: true, message: 'Subscribed to push notifications' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /push/unsubscribe
 * Body: { endpoint }
 */
router.delete('/unsubscribe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { endpoint } = req.body as { endpoint: string };
    if (!endpoint) {
      res.status(400).json({ success: false, message: 'endpoint is required' });
      return;
    }
    await PushService.removeSubscription(endpoint);
    res.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /push/test  (admin only — for smoke testing)
 * Sends a test notification to all admin subscribers.
 */
router.post('/test', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await PushService.notifyAdmins({
      title: '🔔 Push Test',
      body:  'Push notifications are working correctly on Nalmart Console.',
      tag:   'push-test',
      data:  {},
    });
    res.json({ success: true, message: 'Test notification dispatched to admin subscribers' });
  } catch (err) {
    next(err);
  }
});

export default router;
