import { Request } from 'express';
import User from '../models/User';

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: User;
  userId?: string;
  token?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
      token?: string;
    }
  }
}
