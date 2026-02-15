import { Request } from 'express';
import User from '../models/User';

export interface JWTPayload {
  userId: number;
  sessionId: string;
  email: string;
  verified: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: User;
  userId?: number;
  token?: string;
}

declare global {
  namespace Express {
    // Override Express.User to be our User model
    interface User extends InstanceType<typeof import('../models/User').default> {}
    
    interface Request {
      user?: User;
      userId?: number;
      token?: string;
    }
  }
}
