import Cart from '../models/Cart';
import CartItem from '../models/CartItem';
import Product from '../models/Product';
import User from '../models/User';
import { NotFoundError, BadRequestError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';
import { Op } from 'sequelize';

export class CartService {
  /**
   * Get user's cart
   */
  static async getCart(userId: number): Promise<{ items: CartItem[]; total: number; count: number }> {
    try {
      const cart = await Cart.findOne({
        where: { user_id: userId },
        include: [
          {
            model: CartItem,
            attributes: ['id', 'product_id', 'quantity', 'unit_price', 'total_price'],
            include: [
              {
                model: Product,
                attributes: ['id', 'name', 'sku', 'price', 'stock_quantity'],
              },
            ],
          },
        ],
      });

      if (!cart) {
        // Create empty cart if doesn't exist
        const newCart = await Cart.create({ user_id: userId, total_items: 0, total_price: 0 });
        return { items: [], total: 0, count: 0 };
      }

      const items = cart.CartItems || [];
      const total = items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
      const count = items.reduce((sum, item) => sum + item.quantity, 0);

      return { items, total, count };
    } catch (error) {
      logger.error('Error fetching cart:', error);
      throw error;
    }
  }

  /**
   * Normalize variant data for consistent comparison
   */
  private static normalizeVariantData(variantData?: Record<string, string>): string | null {
    if (!variantData || Object.keys(variantData).length === 0) {
      return null;
    }
    // Sort keys to ensure consistent JSON string regardless of input order
    const sorted = Object.keys(variantData)
      .sort()
      .reduce((result, key) => {
        result[key] = variantData[key];
        return result;
      }, {} as Record<string, string>);
    return JSON.stringify(sorted);
  }

  /**
   * Add item to cart
   */
  static async addToCart(
    userId: number,
    productId: number,
    quantity: number,
    variantData?: Record<string, string>
  ): Promise<CartItem> {
    try {
      // Verify product exists
      const product = await Product.findByPk(productId);
      if (!product) {
        throw new NotFoundError(`Product ${productId} not found`);
      }

      // Check stock
      if (product.stock_quantity < quantity) {
        throw new BadRequestError(`Insufficient stock. Available: ${product.stock_quantity}`);
      }

      // Validate quantity
      if (quantity < 1) {
        throw new ValidationError('Quantity must be at least 1');
      }

      // Get or create cart
      let cart = await Cart.findOne({ where: { user_id: userId } });
      if (!cart) {
        cart = await Cart.create({ user_id: userId, total_items: 0, total_price: 0 });
      }

      // Normalize variant data for consistent comparison
      const normalizedVariantData = this.normalizeVariantData(variantData);

      // Check if item already in cart
      const existingItem = await CartItem.findOne({
        where: {
          cart_id: cart.id,
          product_id: productId,
          variant_data: normalizedVariantData,
        },
      });

      let cartItem: CartItem;

      if (existingItem) {
        // Update quantity
        const newQuantity = existingItem.quantity + quantity;
        if (product.stock_quantity < newQuantity) {
          throw new BadRequestError(`Insufficient stock. Available: ${product.stock_quantity}`);
        }
        existingItem.quantity = newQuantity;
        existingItem.total_price = newQuantity * product.price;
        cartItem = await existingItem.save();
      } else {
        // Create new cart item
        cartItem = await CartItem.create({
          cart_id: cart.id,
          product_id: productId,
          quantity,
          unit_price: product.price,
          total_price: quantity * product.price,
          variant_data: normalizedVariantData,
        });
      }

      // Update cart totals
      await this.updateCartTotals(cart.id);

      logger.info(`Added ${quantity} of product ${productId} to cart for user ${userId}`);
      return cartItem;
    } catch (error) {
      logger.error('Error adding to cart:', error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  static async updateCartItem(userId: number, cartItemId: number, quantity: number): Promise<CartItem> {
    try {
      // Find cart item
      const cartItem = await CartItem.findByPk(cartItemId);

      if (!cartItem) {
        throw new NotFoundError('Cart item not found');
      }

      // Verify cart belongs to user
      const cart = await Cart.findOne({
        where: { id: cartItem.cart_id, user_id: userId },
      });

      if (!cart) {
        throw new NotFoundError('Cart item does not belong to your cart');
      }

      // Verify product stock
      const product = await Product.findByPk(cartItem.product_id);
      if (!product || product.stock_quantity < quantity) {
        throw new BadRequestError(`Insufficient stock. Available: ${product?.stock_quantity || 0}`);
      }

      if (quantity < 1) {
        throw new ValidationError('Quantity must be at least 1');
      }

      cartItem.quantity = quantity;
      cartItem.total_price = quantity * product.price;
      const updated = await cartItem.save();

      // Update cart totals
      await this.updateCartTotals(cartItem.cart_id);

      return updated;
    } catch (error) {
      logger.error('Error updating cart item:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  static async removeFromCart(userId: number, cartItemId: number): Promise<void> {
    try {
      // Find cart item
      const cartItem = await CartItem.findByPk(cartItemId);

      if (!cartItem) {
        throw new NotFoundError('Cart item not found');
      }

      // Verify cart belongs to user
      const cart = await Cart.findOne({
        where: { id: cartItem.cart_id, user_id: userId },
      });

      if (!cart) {
        throw new NotFoundError('Cart item does not belong to your cart');
      }

      const cartId = cartItem.cart_id;
      await cartItem.destroy();

      // Update cart totals
      await this.updateCartTotals(cartId);

      logger.info(`Removed item ${cartItemId} from cart for user ${userId}`);
    } catch (error) {
      logger.error('Error removing cart item:', error);
      throw error;
    }
  }

  /**
   * Clear entire cart
   */
  static async clearCart(userId: number): Promise<void> {
    try {
      const cart = await Cart.findOne({ where: { user_id: userId } });
      if (!cart) return;

      await CartItem.destroy({ where: { cart_id: cart.id } });

      cart.total_items = 0;
      cart.total_price = 0;
      await cart.save();

      logger.info(`Cleared cart for user ${userId}`);
    } catch (error) {
      logger.error('Error clearing cart:', error);
      throw error;
    }
  }

  /**
   * Update cart totals (helper)
   */
  private static async updateCartTotals(cartId: number): Promise<void> {
    const items = await CartItem.findAll({ where: { cart_id: cartId } });

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);

    await Cart.update(
      { total_items: totalItems, total_price: totalPrice },
      { where: { id: cartId } }
    );
  }
}
