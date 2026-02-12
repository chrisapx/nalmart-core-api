import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  statusCode: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  [key: string]: unknown;
}

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    statusCode,
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  error: string,
  statusCode: number = 500,
  message?: string
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    error,
    statusCode,
  };
  return res.status(statusCode).json(response);
};

export const successResponse = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200,
  meta?: Record<string, unknown>
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    statusCode,
    ...meta,
  };
  return res.status(statusCode).json(response);
};
