import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import User from '../models/User';
import env from './env';
import logger from '../utils/logger';

/**
 * Google OAuth 2.0 Strategy
 * Authenticates users via Google Sign-In
 */
if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
  logger.warn('⚠️  Google OAuth is not configured. GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.');
} else {
  logger.info('✅ Google OAuth configured successfully');
}

passport.use(
  'google',
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID || '',
      clientSecret: env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/google/callback',
      passReqToCallback: true,
    },
    async (
      req: any,
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        // Log for debugging
        logger.debug(`Google OAuth - AccessToken received: ${!!accessToken}, RefreshToken: ${!!refreshToken}`);

        // Extract user info from Google profile
        const email = profile.emails?.[0]?.value;
        const googleId = profile.id;
        const firstName = profile.name?.givenName || '';
        const lastName = profile.name?.familyName || '';
        const avatar = profile.photos?.[0]?.value;

        if (!email) {
          logger.error('No email found in Google profile');
          return done(new Error('No email found in Google profile'), undefined);
        }

        // Check if user exists by Google ID
        let user = await User.findOne({ where: { google_id: googleId } });

        if (user) {
          // User exists with this Google account - update profile if needed
          if (avatar && user.google_avatar !== avatar) {
            user.google_avatar = avatar;
          }
          // TODO: Store tokens after migration 006 is applied
          // user.google_access_token = accessToken;
          // if (refreshToken) {
          //   user.google_refresh_token = refreshToken;
          // }
          await user.save();
          logger.debug(`Updated Google auth for user: ${email}`);
          return done(null, user);
        }

        // Check if user exists by email
        user = await User.findOne({ where: { email } });

        if (user) {
          // User exists with this email - link Google account
          user.google_id = googleId;
          user.google_email = email;
          user.google_avatar = avatar || null;
          // TODO: Store tokens after migration 006 is applied
          // user.google_access_token = accessToken;
          // if (refreshToken) {
          //   user.google_refresh_token = refreshToken;
          // }
          user.account_verified = true;
          user.email_verified = true;
          user.verification_method = 'google';
          await user.save();

          logger.info(`Linked Google account to existing user: ${email}`);
          return done(null, user);
        }

        // Create new user with Google account
        user = await User.create({
          first_name: firstName,
          last_name: lastName,
          email,
          password: Math.random().toString(36).slice(-12) + 'G1!', // Random password (not used for Google auth)
          google_id: googleId,
          google_email: email,
          google_avatar: avatar,
          // TODO: Store tokens after migration 006 is applied
          // google_access_token: accessToken,
          // google_refresh_token: refreshToken || null,
          account_verified: true,
          email_verified: true,
          verification_method: 'google',
          avatar_url: avatar,
        });

        logger.info(`New user created via Google OAuth: ${email}`);
        return done(null, user);
      } catch (error) {
        logger.error('Google OAuth error:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

/**
 * JWT Strategy (for API authentication)
 * Verifies JWT tokens in requests
 */
const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: env.JWT_SECRET,
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      const user = await User.findByPk(payload.userId);

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

/**
 * Serialize/Deserialize user for session support
 * (Not used for JWT-only approach, but included for completeness)
 */
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
