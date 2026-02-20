import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { successResponse } from '../utils/response';
import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import logger from '../utils/logger';
import { Op, QueryTypes } from 'sequelize';

/**
 * Get revenue data with monthly breakdown
 */
export const getRevenueData = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { Sequelize } = require('sequelize');
    const sequelize = Order.sequelize!;

    // Get last 12 months of real data
    const months = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthData = await Order.findAll({
        attributes: [
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'revenue'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        where: {
          created_at: {
            [Op.gte]: startDate,
            [Op.lt]: endDate,
          },
        },
        raw: true,
      });

      const monthName = startDate.toLocaleString('en-US', { month: 'short' });
      const stats = monthData[0] as any;

      months.push({
        month: monthName,
        revenue: Number(stats?.revenue) || 0,
        orders: Number(stats?.count) || 0,
      });
    }

    successResponse(res, months, 'Revenue data retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get category breakdown data
 */
export const getCategoryData = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { Sequelize } = require('sequelize');
    const sequelize = Order.sequelize!;

    // Get sales by category from order items
    const categoryData = await sequelize.query(`
      SELECT 
        p.category,
        COUNT(oi.id) as count,
        SUM(oi.price * oi.quantity) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.deleted_at IS NULL AND p.deleted_at IS NULL
      GROUP BY p.category
      ORDER BY revenue DESC
    `, { type: QueryTypes.SELECT });

    const totalRevenue = (categoryData as any[]).reduce((sum: number, cat: any) => sum + (Number(cat.revenue) || 0), 0);

    const categories = (categoryData as any[]).map((cat: any) => ({
      name: cat.category || 'Uncategorized',
      value: totalRevenue > 0 ? Math.round((Number(cat.revenue) / totalRevenue) * 100) : 0,
    }));

    successResponse(res, categories, 'Category data retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { Sequelize } = require('sequelize');
    const sequelize = Order.sequelize!;

    // Get all-time order totals using real data
    const orderStats = (await Order.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalOrders'],
      ],
      raw: true,
    })) as unknown as Array<{ totalRevenue: string; totalOrders: string }>;

    // Get active user count from database
    const userCount = await User.count({
      where: { status: 'active' },
    });

    // Get today's orders for view count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = await Order.count({
      where: {
        created_at: {
          [Op.gte]: today,
        },
      },
    });

    // Get yesterday's orders for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const yesterdayOrders = await Order.count({
      where: {
        created_at: {
          [Op.gte]: yesterday,
          [Op.lt]: today,
        },
      },
    });

    const totalRevenue = Number(orderStats[0]?.totalRevenue) || 0;
    const totalOrders = Number(orderStats[0]?.totalOrders) || 0;

    // Calculate change percentages from real data
    const ordersChange = yesterdayOrders > 0 
      ? ((todayOrders - yesterdayOrders) / yesterdayOrders) * 100 
      : (todayOrders > 0 ? 100 : 0);

    const stats = {
      totalRevenue: Math.round(totalRevenue),
      totalOrders,
      activeCustomers: userCount,
      totalViews: totalOrders * 3, // Estimated: ~3 views per order (browse, view, checkout)
      revenueChange: 0, // TODO: Calculate from yesterday's revenue
      ordersChange: Number(ordersChange.toFixed(1)),
      customersChange: 0, // TODO: Calculate from new users today vs yesterday
      viewsChange: 0, // TODO: Would need analytics tracking
    };

    successResponse(res, stats, 'Dashboard statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get sales trend
 */
export const getSalesTrend = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const { Sequelize } = require('sequelize');
    const sequelize = Order.sequelize!;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get daily sales data
    const salesData = await sequelize.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(id) as count,
        SUM(total_amount) as sales
      FROM orders
      WHERE created_at >= ? AND deleted_at IS NULL
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, {
      replacements: [startDate],
      type: QueryTypes.SELECT,
    });

    // Generate dates for all days including those with no sales
    const trend = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = (salesData as any[]).find(
        (d: any) => d.date && d.date.toISOString?.().split('T')[0] === dateStr
      );

      trend.push({
        date: dateStr,
        sales: Number(dayData?.sales) || 0,
      });
    }

    successResponse(res, trend, 'Sales trend retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export default {
  getRevenueData,
  getCategoryData,
  getDashboardStats,
  getSalesTrend,
};
