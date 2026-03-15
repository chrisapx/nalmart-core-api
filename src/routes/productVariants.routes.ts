import { Router } from 'express';
import productVariantService from '../services/productVariant.service';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/products/:productId/variants
 * @desc    Get all variants for a product
 * @access  Public
 */
router.get('/products/:productId/variants', async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId as string, 10);
    const variants = await productVariantService.getVariantsByProductId(productId);
    res.json(variants);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/variants/:id
 * @desc    Get a specific variant by ID
 * @access  Public
 */
router.get('/variants/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const variant = await productVariantService.getVariantById(id);
    
    if (!variant) {
      return res.status(404).json({ message: 'Variant not found' });
    }
    
    res.json(variant);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/products/:productId/variants
 * @desc    Create a new variant for a product
 * @access  Private (Admin/Vendor)
 */
router.post('/products/:productId/variants', authenticate, async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId as string, 10);
    const variantData = {
      product_id: productId,
      ...req.body,
    };
    
    const variant = await productVariantService.createVariant(variantData);
    res.status(201).json(variant);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/variants/:id
 * @desc    Update a variant
 * @access  Private (Admin/Vendor)
 */
router.put('/variants/:id', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const variant = await productVariantService.updateVariant(id, req.body);
    res.json(variant);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/variants/:id
 * @desc    Delete a variant
 * @access  Private (Admin/Vendor)
 */
router.delete('/variants/:id', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await productVariantService.deleteVariant(id);
    res.json({ message: 'Variant deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/variants/:id/stock
 * @desc    Update variant stock
 * @access  Private (Admin/Vendor)
 */
router.patch('/variants/:id/stock', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { quantity } = req.body;
    
    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }
    
    const variant = await productVariantService.updateStock(id, quantity);
    res.json(variant);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/variants/:id/availability
 * @desc    Check variant availability
 * @access  Public
 */
router.get('/variants/:id/availability', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const quantity = parseInt(req.query.quantity as string, 10) || 1;
    
    const isAvailable = await productVariantService.checkAvailability(id, quantity);
    res.json({ available: isAvailable });
  } catch (error) {
    next(error);
  }
});

export default router;
