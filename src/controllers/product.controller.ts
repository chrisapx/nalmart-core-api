import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { ProductService } from '../services/product.service';
import { successResponse } from '../utils/response';
import logger from '../utils/logger';
import { NotFoundError } from '../utils/errors';

export const createProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Handle both JSON and multipart/form-data requests
    let productData = req.body;
    
    // If this is a multipart request, the JSON data is in req.body.data as a string
    if (req.body.data && typeof req.body.data === 'string') {
      try {
        productData = JSON.parse(req.body.data);
      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid JSON in data field',
          error: (error as Error).message,
        });
        return;
      }
    }

    const product = await ProductService.createProduct(productData, req.files, req.body);

    res.status(201).json({
      success: true,
      message: 'Product created successfully with media',
      data: product,
    });
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
    // Parse query parameters with proper types
    const query = {
      ...req.query,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      category_id: req.query.category_id ? parseInt(req.query.category_id as string, 10) : undefined,
      is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
      is_featured: req.query.is_featured === 'true' ? true : req.query.is_featured === 'false' ? false : undefined,
      is_published: req.query.is_published === 'true' ? true : req.query.is_published === 'false' ? false : undefined,
      min_price: req.query.min_price ? parseFloat(req.query.min_price as string) : undefined,
      max_price: req.query.max_price ? parseFloat(req.query.max_price as string) : undefined,
      min_rating: req.query.min_rating ? parseFloat(req.query.min_rating as string) : undefined,
    };

    const result = await ProductService.getProducts(query);

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
    // Validation middleware already converts id to number
    const id = req.params.id;
    const productId = typeof id === 'number' ? id : parseInt(Array.isArray(id) ? id[0] : id, 10);
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
    const id = req.params.id;
    const productId = typeof id === 'number' ? id : parseInt(Array.isArray(id) ? id[0] : id, 10);
    
    // Handle both JSON and multipart/form-data requests
    let productData = req.body;
    
    // If this is a multipart request, the JSON data is in req.body.data as a string
    if (req.body.data && typeof req.body.data === 'string') {
      try {
        productData = JSON.parse(req.body.data);
      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid JSON in data field',
          error: (error as Error).message,
        });
        return;
      }
    }

    const product = await ProductService.updateProduct(productId, productData, req.files, req.body);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
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
    const id = req.params.id;
    const productId = typeof id === 'number' ? id : parseInt(Array.isArray(id) ? id[0] : id, 10);
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
    const id = req.params.id;
    const productId = typeof id === 'number' ? id : parseInt(Array.isArray(id) ? id[0] : id, 10);
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
    const id = req.params.id;
    const productId = typeof id === 'number' ? id : parseInt(Array.isArray(id) ? id[0] : id, 10);
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
    const id = req.params.id;
    const productId = typeof id === 'number' ? id : parseInt(Array.isArray(id) ? id[0] : id, 10);

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
    const id = req.params.id;
    const productId = typeof id === 'number' ? id : parseInt(Array.isArray(id) ? id[0] : id, 10);

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
    const id = req.params.id;
    const productId = typeof id === 'number' ? id : parseInt(Array.isArray(id) ? id[0] : id, 10);

    if (isNaN(productId)) {
      throw new Error('Invalid product ID');
    }

    const product = await ProductService.duplicateProduct(productId);

    successResponse(res, product, 'Product duplicated successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getUniqueBrands = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const search = req.query.search as string | undefined;

    const brands = await ProductService.getUniqueBrands(search);

    successResponse(res, brands, 'Brands retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a product image
 */
export const deleteProductImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const imageId = req.params.imageId;
    const id = typeof imageId === 'number' ? imageId : parseInt(Array.isArray(imageId) ? imageId[0] : imageId, 10);

    if (isNaN(id)) {
      throw new Error('Invalid image ID');
    }

    await ProductService.deleteProductImage(id);

    successResponse(res, null, 'Product image deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a product video
 */
export const deleteProductVideo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const videoId = req.params.videoId;
    const id = typeof videoId === 'number' ? videoId : parseInt(Array.isArray(videoId) ? videoId[0] : videoId, 10);

    if (isNaN(id)) {
      throw new Error('Invalid video ID');
    }

    await ProductService.deleteProductVideo(id);

    successResponse(res, null, 'Product video deleted successfully');
  } catch (error) {
    next(error);
  }
};

