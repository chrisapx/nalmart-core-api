import { Router } from 'express';
import * as AnalyticsController from '../controllers/analytics.controller';

const router = Router();

/**
 * GET /api/v1/analytics/revenue
 * Get revenue data with monthly breakdown
 */
router.get('/revenue', AnalyticsController.getRevenueData);

/**
 * GET /api/v1/analytics/categories
 * Get category breakdown data
 */
router.get('/categories', AnalyticsController.getCategoryData);

/**
 * GET /api/v1/analytics/dashboard-stats
 * Get dashboard statistics
 */
router.get('/dashboard-stats', AnalyticsController.getDashboardStats);

/**
 * GET /api/v1/analytics/sales-trend
 * Get sales trend
 */
router.get('/sales-trend', AnalyticsController.getSalesTrend);

export default router;
