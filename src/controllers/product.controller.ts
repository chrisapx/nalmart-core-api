import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { ProductService } from '../services/product.service';
import { successResponse } from '../utils/response';
import logger from '../utils/logger';

export const createProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await ProductService.createProduct(req.body);

    successResponse(res, product, 'Product created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await ProductService.getProducts(req.query);

    successResponse(res, result.data, 'Products retrieved successfully', 200, {
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idParam = req.params.id;
    const productId = parseInt(typeof idParam === 'string' ? idParam : idParam[0], 10);
    const product = await ProductService.getProductById(productId);

    await ProductService.incrementViewCount(productId);

    successResponse(res, product, 'Product retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getProductBySlug = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const slugParam = req.params.slug;
    const slug = typeof slugParam === 'string' ? slugParam : slugParam[0];
    const product = await ProductService.getProductBySlug(slug);

    await ProductService.incrementViewCount(product.id);

    successResponse(res, product, 'Product retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idParam = req.params.id;
    const productId = parseInt(typeof idParam === 'string' ? idParam : idParam[0], 10);
    const product = await ProductService.updateProduct(productId, req.body);

    successResponse(res, product, 'Product updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idParam = req.params.id;
    const productId = parseInt(typeof idParam === 'string' ? idParam : idParam[0], 10);
    await ProductService.deleteProduct(productId);

    successResponse(res, null, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const updateStock = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idParam = req.params.id;
    const productId = parseInt(typeof idParam === 'string' ? idParam : idParam[0], 10);
    const { stock_quantity, stock_status } = req.body;

    const product = await ProductService.updateStock(
      productId,
      stock_quantity,
      stock_status
    );

    successResponse(res, product, 'Stock updated successfully');
  } catch (error) {
    next(error);
  }
};

export const getFeaturedProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let limit = 10;
    if (req.query.limit) {
      const limitParam = req.query.limit;
      if (typeof limitParam === 'string') {
        limit = parseInt(limitParam, 10);
      }
    }

    const products = await ProductService.getFeaturedProducts(limit);

    successResponse(res, products, 'Featured products retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getRelatedProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idParam = req.params.id;
    const productId = parseInt(typeof idParam === 'string' ? idParam : idParam[0], 10);
    let limit = 4;
    if (req.query.limit) {
      const limitParam = req.query.limit;
      if (typeof limitParam === 'string') {
        limit = parseInt(limitParam, 10);
      }
    }

    const products = await ProductService.getRelatedProducts(productId, limit);

    successResponse(res, products, 'Related products retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getLowStockProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let threshold: number | undefined = undefined;
    if (req.query.threshold) {
      const thresholdParam = req.query.threshold;
      if (typeof thresholdParam === 'string') {
        threshold = parseInt(thresholdParam, 10);
      }
    }

    const products = await ProductService.getLowStockProducts(threshold);

    successResponse(
      res,
      products,
      'Low stock products retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const togglePublishProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idParam = req.params.id;
    const productId = parseInt(typeof idParam === 'string' ? idParam : idParam[0], 10);

    if (isNaN(productId)) {
      throw new Error('Invalid product ID');
    }

    const { is_published } = req.body;

    const product = await ProductService.togglePublish(productId, is_published);

    successResponse(
      res,
      product,
      `Product ${is_published ? 'published' : 'unpublished'} successfully`
    );
  } catch (error) {
    next(error);
  }
};

export const toggleFeaturedProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idParam = req.params.id;
    const productId = parseInt(typeof idParam === 'string' ? idParam : idParam[0], 10);

    if (isNaN(productId)) {
      throw new Error('Invalid product ID');
    }

    const { is_featured } = req.body;

    const product = await ProductService.toggleFeatured(productId, is_featured);

    successResponse(
      res,
      product,
      `Product ${is_featured ? 'featured' : 'unfeatured'} successfully`
    );
  } catch (error) {
    next(error);
  }
};

export const duplicateProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idParam = req.params.id;
    const productId = parseInt(typeof idParam === 'string' ? idParam : idParam[0], 10);

    if (isNaN(productId)) {
      throw new Error('Invalid product ID');
    }

    const product = await ProductService.duplicateProduct(productId);

    successResponse(res, product, 'Product duplicated successfully', 201);
  } catch (error) {
    next(error);
  }
};
