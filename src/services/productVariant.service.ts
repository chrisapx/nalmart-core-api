import ProductVariant from '../models/ProductVariant';
import Product from '../models/Product';
import { Op } from 'sequelize';

export class ProductVariantService {
  /**
   * Create a new product variant
   */
  async createVariant(data: {
    product_id: number;
    sku?: string;
    variant_name: string;
    attributes: Record<string, string>;
    price_adjustment?: number;
    stock_quantity: number;
    image_url?: string;
    is_available?: boolean;
    sort_order?: number;
    weight?: number;
    dimensions?: { length: number; width: number; height: number };
  }): Promise<ProductVariant> {
    // Verify product exists
    const product = await Product.findByPk(data.product_id);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check if SKU already exists (if provided)
    if (data.sku) {
      const existingVariant = await ProductVariant.findOne({
        where: { sku: data.sku },
      });
      if (existingVariant) {
        throw new Error('SKU already exists');
      }
    }

    const variant = await ProductVariant.create(data);
    return variant;
  }

  /**
   * Get all variants for a product
   */
  async getVariantsByProductId(productId: number): Promise<ProductVariant[]> {
    const variants = await ProductVariant.findAll({
      where: { product_id: productId },
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
    });
    return variants;
  }

  /**
   * Get a single variant by ID
   */
  async getVariantById(id: number): Promise<ProductVariant | null> {
    const variant = await ProductVariant.findByPk(id, {
      include: [
        {
          model: Product,
          as: 'product',
        },
      ],
    });
    return variant;
  }

  /**
   * Update a variant
   */
  async updateVariant(
    id: number,
    data: Partial<{
      sku: string;
      variant_name: string;
      attributes: Record<string, string>;
      price_adjustment: number;
      stock_quantity: number;
      image_url: string;
      is_available: boolean;
      sort_order: number;
      weight: number;
      dimensions: { length: number; width: number; height: number };
    }>
  ): Promise<ProductVariant> {
    const variant = await ProductVariant.findByPk(id);
    if (!variant) {
      throw new Error('Variant not found');
    }

    // Check if new SKU already exists (if changing SKU)
    if (data.sku && data.sku !== variant.sku) {
      const existingVariant = await ProductVariant.findOne({
        where: { sku: data.sku, id: { [Op.ne]: id } },
      });
      if (existingVariant) {
        throw new Error('SKU already exists');
      }
    }

    await variant.update(data);
    return variant;
  }

  /**
   * Delete a variant
   */
  async deleteVariant(id: number): Promise<void> {
    const variant = await ProductVariant.findByPk(id);
    if (!variant) {
      throw new Error('Variant not found');
    }

    await variant.destroy();
  }

  /**
   * Check variant availability and stock
   */
  async checkAvailability(id: number, quantity: number = 1): Promise<boolean> {
    const variant = await ProductVariant.findByPk(id);
    if (!variant) {
      return false;
    }

    return variant.is_available && variant.stock_quantity >= quantity;
  }

  /**
   * Update variant stock (for inventory management)
   */
  async updateStock(id: number, quantity: number): Promise<ProductVariant> {
    const variant = await ProductVariant.findByPk(id);
    if (!variant) {
      throw new Error('Variant not found');
    }

    variant.stock_quantity = quantity;
    await variant.save();

    return variant;
  }

  /**
   * Increment stock quantity
   */
  async incrementStock(id: number, quantity: number): Promise<ProductVariant> {
    const variant = await ProductVariant.findByPk(id);
    if (!variant) {
      throw new Error('Variant not found');
    }

    variant.stock_quantity += quantity;
    await variant.save();

    return variant;
  }

  /**
   * Decrement stock quantity (for orders)
   */
  async decrementStock(id: number, quantity: number): Promise<ProductVariant> {
    const variant = await ProductVariant.findByPk(id);
    if (!variant) {
      throw new Error('Variant not found');
    }

    if (variant.stock_quantity < quantity) {
      throw new Error('Insufficient stock');
    }

    variant.stock_quantity -= quantity;
    await variant.save();

    return variant;
  }
}

export default new ProductVariantService();
