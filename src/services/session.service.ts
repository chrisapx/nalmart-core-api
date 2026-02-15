import { Request } from 'express';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import LoginSession from '../models/LoginSession';
import User from '../models/User';
import logger from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';

interface CreateSessionData {
  userId: number;
  ipAddress?: string;
  userAgent?: string;
  expiresIn?: number; // in seconds
}

interface SessionMetadata {
  device_type?: string;
  device_name?: string;
  browser?: string;
  os?: string;
  city?: string;
  country?: string;
  country_code?: string;
}

/**
 * Session Management Service
 * Handles creation, tracking, and revocation of user login sessions
 * Sessions are metadata-only; JWTs handle authentication
 */
export class SessionService {
  /**
   * Create a new login session
   */
  static async createSession(
    data: CreateSessionData,
    metadata?: SessionMetadata
  ): Promise<LoginSession> {
    const expiresAt = new Date(Date.now() + (data.expiresIn || 7 * 24 * 60 * 60) * 1000);

    // Parse user agent for device info
    const deviceInfo = data.userAgent ? this.parseUserAgent(data.userAgent) : {};

    const session = await LoginSession.create({
      session_id: uuidv4(), // Explicitly generate UUID
      user_id: data.userId,
      ip_address: data.ipAddress,
      device_type: metadata?.device_type || deviceInfo.device_type || 'unknown',
      device_name: metadata?.device_name || deviceInfo.device_name,
      browser: metadata?.browser || deviceInfo.browser,
      os: metadata?.os || deviceInfo.os,
      city: metadata?.city,
      country: metadata?.country,
      country_code: metadata?.country_code,
      expires_at: expiresAt,
      last_activity_at: new Date(),
      is_active: true,
    });

    logger.info(`Session created for user ${data.userId}: ${session.session_id}`);
    return session;
  }

  /**
   * Get all active sessions for a user
   */
  static async getActiveSessions(userId: number): Promise<LoginSession[]> {
    const sessions = await LoginSession.findAll({
      where: {
        user_id: userId,
        is_active: true,
        expires_at: {
          [Op.gt]: new Date(),
        },
      },
      order: [['last_activity_at', 'DESC']],
    });

    return sessions;
  }

  /**
   * Get session by session ID
   */
  static async getSessionById(sessionId: string): Promise<LoginSession | null> {
    return await LoginSession.findOne({
      where: { session_id: sessionId },
    });
  }

  /**
   * Update session activity timestamp
   */
  static async updateActivity(sessionId: string): Promise<void> {
    await LoginSession.update(
      { last_activity_at: new Date() },
      { where: { session_id: sessionId } }
    );
  }

  /**
   * Revoke a specific session
   */
  static async revokeSession(
    sessionId: string,
    reason?: string
  ): Promise<boolean> {
    const session = await LoginSession.findOne({
      where: { session_id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    session.is_active = false;
    session.revoked_at = new Date();
    session.revocation_reason = reason || 'User logout';
    await session.save();

    logger.info(`Session revoked: ${sessionId} - Reason: ${reason}`);
    return true;
  }

  /**
   * Revoke all sessions for a user (except current)
   */
  static async revokeAllSessions(
    userId: number,
    exceptSessionId?: string
  ): Promise<number> {
    const whereClause: any = {
      user_id: userId,
      is_active: true,
    };

    if (exceptSessionId) {
      whereClause.session_id = { [Op.ne]: exceptSessionId };
    }

    const [affectedCount] = await LoginSession.update(
      {
        is_active: false,
        revoked_at: new Date(),
        revocation_reason: 'Logout all devices',
      },
      { where: whereClause }
    );

    logger.info(`Revoked ${affectedCount} sessions for user ${userId}`);
    return affectedCount;
  }

  /**
   * Verify session is still valid
   */
  static async isSessionValid(sessionId: string): Promise<boolean> {
    const session = await LoginSession.findOne({
      where: { session_id: sessionId },
    });

    if (!session) {
      return false;
    }

    return session.isValid();
  }

  /**
   * Clean up expired sessions (run as cron job)
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const [affectedCount] = await LoginSession.update(
      {
        is_active: false,
        revocation_reason: 'Expired',
      },
      {
        where: {
          is_active: true,
          expires_at: {
            [Op.lt]: new Date(),
          },
        },
      }
    );

    logger.info(`Cleaned up ${affectedCount} expired sessions`);
    return affectedCount;
  }

  /**
   * Get session statistics for a user
   */
  static async getSessionStats(userId: number): Promise<{
    total: number;
    active: number;
    expired: number;
    revoked: number;
  }> {
    const total = await LoginSession.count({ where: { user_id: userId } });
    const active = await LoginSession.count({
      where: {
        user_id: userId,
        is_active: true,
        expires_at: { [Op.gt]: new Date() },
      },
    });
    const expired = await LoginSession.count({
      where: {
        user_id: userId,
        is_active: true,
        expires_at: { [Op.lt]: new Date() },
      },
    });
    const revoked = await LoginSession.count({
      where: {
        user_id: userId,
        is_active: false,
      },
    });

    return { total, active, expired, revoked };
  }

  /**
   * Parse user agent string to extract device information
   */
  private static parseUserAgent(userAgent: string): Partial<SessionMetadata> {
    const ua = userAgent.toLowerCase();
    
    // Detect device type
    let device_type: string = 'desktop';
    if (/mobile|android|iphone|ipod|blackberry|iemobile/.test(ua)) {
      device_type = 'mobile';
    } else if (/tablet|ipad/.test(ua)) {
      device_type = 'tablet';
    }

    // Detect browser
    let browser = 'Unknown';
    if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';
    else if (ua.includes('opera')) browser = 'Opera';

    // Detect OS
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
      os = 'iOS';
    }

    // Extract device name (limited info from user agent)
    let device_name = `${os} ${browser}`;
    if (ua.includes('iphone')) device_name = 'iPhone';
    else if (ua.includes('ipad')) device_name = 'iPad';
    else if (ua.includes('android')) device_name = 'Android Device';

    return { device_type, device_name, browser, os };
  }

  /**
   * Extract session info from Express request
   */
  static extractSessionInfo(req: Request): {
    ipAddress: string;
    userAgent: string;
  } {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';

    const userAgent = req.headers['user-agent'] || 'unknown';

    return { ipAddress, userAgent };
  }
}
