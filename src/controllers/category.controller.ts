import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { CategoryService } from '../services/category.service';
import { successResponse } from '../utils/response';

export const createCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = await CategoryService.createCategory(req.body);

    successResponse(res, category, 'Category created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await CategoryService.getCategories(req.query);

    successResponse(res, result.data, 'Categories retrieved successfully', 200, {
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idParam = req.params.id;
    const categoryId = parseInt(
      typeof idParam === 'string' ? idParam : idParam[0],
      10
    );
    const category = await CategoryService.getCategoryById(categoryId);

    successResponse(res, category, 'Category retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getCategoryBySlug = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const slugParam = req.params.slug;
    const slug = typeof slugParam === 'string' ? slugParam : slugParam[0];
    const category = await CategoryService.getCategoryBySlug(slug);

    successResponse(res, category, 'Category retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idParam = req.params.id;
    const categoryId = parseInt(
      typeof idParam === 'string' ? idParam : idParam[0],
      10
    );
    const category = await CategoryService.updateCategory(categoryId, req.body);

    successResponse(res, category, 'Category updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idParam = req.params.id;
    const categoryId = parseInt(
      typeof idParam === 'string' ? idParam : idParam[0],
      10
    );
    await CategoryService.deleteCategory(categoryId);

    successResponse(res, null, 'Category deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const getTopLevelCategories = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await CategoryService.getTopLevelCategories();

    successResponse(
      res,
      categories,
      'Top-level categories retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getCategoryTree = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tree = await CategoryService.getCategoryTree();

    successResponse(res, tree, 'Category tree retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getChildCategories = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idParam = req.params.id;
    const parentId = parseInt(
      typeof idParam === 'string' ? idParam : idParam[0],
      10
    );
    const categories = await CategoryService.getChildCategories(parentId);

    successResponse(res, categories, 'Child categories retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getCategoryPath = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idParam = req.params.id;
    const categoryId = parseInt(
      typeof idParam === 'string' ? idParam : idParam[0],
      10
    );
    const path = await CategoryService.getCategoryPath(categoryId);

    successResponse(res, path, 'Category path retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const reorderCategories = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await CategoryService.reorderCategories(req.body.orders);

    successResponse(res, null, 'Categories reordered successfully');
  } catch (error) {
    next(error);
  }
};
