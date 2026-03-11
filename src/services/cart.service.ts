import Cart from '../models/Cart';
import CartItem from '../models/CartItem';
import Product from '../models/Product';
import ProductImage from '../models/ProductImage';
import Inventory from '../models/Inventory';
import User from '../models/User';
import { InventoryService } from './inventory.service';
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
            attributes: ['id', 'product_id', 'quantity', 'unit_price', 'total_price', 'variant_data', 'reservation_id', 'is_selected'],
            include: [
              {
                model: Product,
                attributes: ['id', 'name', 'slug', 'price', 'stock_quantity'],
                include: [
                  {
                    model: ProductImage,
                    as: 'images',
                    attributes: ['url', 'is_primary', 'sort_order'],
                    required: false,
                  },
                  {
                    model: Inventory,
                    as: 'inventory',
                    attributes: ['quantity_available', 'stock_status'],
                    required: false,
                  },
                ],
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

      // Check stock via inventory table, fallback to product.stock_quantity
      const inventory = await Inventory.findOne({ where: { product_id: productId } });
      const availableStock = inventory ? inventory.quantity_available : product.stock_quantity;

      if (availableStock < quantity) {
        throw new BadRequestError(`Insufficient stock. Available: ${availableStock}`);
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
        // Update quantity — release old reservation and create a new one
        const newQuantity = existingItem.quantity + quantity;
        const totalAvail = inventory ? inventory.quantity_available : product.stock_quantity;
        // If there's an existing reservation the available stock already excludes it,
        // so we only need to check if the *delta* fits in what's still free
        const delta = quantity; // additional units requested
        if ((inventory ? inventory.quantity_available : product.stock_quantity) < delta) {
          throw new BadRequestError(`Insufficient stock. Available: ${totalAvail}`);
        }
        existingItem.quantity = newQuantity;
        existingItem.total_price = newQuantity * product.price;

        // Extend / replace reservation for the extra delta
        if (inventory) {
          // Release old full reservation, re-reserve full new quantity
          if (existingItem.reservation_id) {
            try { await InventoryService.unreserveInventory(existingItem.reservation_id, 'Cart quantity update'); } catch (_) {}
          }
          const newReservation = await InventoryService.reserveForCart(inventory.id, cart.id, newQuantity, userId);
          existingItem.reservation_id = newReservation.id;
        }

        cartItem = await existingItem.save();
      } else {
        // Create new cart item
        let reservationId: number | null = null;
        if (inventory) {
          const reservation = await InventoryService.reserveForCart(inventory.id, cart.id, quantity, userId);
          reservationId = reservation.id;
        }

        cartItem = await CartItem.create({
          cart_id: cart.id,
          product_id: productId,
          quantity,
          unit_price: product.price,
          total_price: quantity * product.price,
          variant_data: normalizedVariantData,
          reservation_id: reservationId,
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

      // Verify product stock via inventory table
      const product = await Product.findByPk(cartItem.product_id);
      const inventory = await Inventory.findOne({ where: { product_id: cartItem.product_id } });
      const availableStock = inventory ? inventory.quantity_available : (product?.stock_quantity || 0);

      if (!product || availableStock < quantity) {
        throw new BadRequestError(`Insufficient stock. Available: ${availableStock}`);
      }

      if (quantity < 1) {
        throw new ValidationError('Quantity must be at least 1');
      }

      cartItem.quantity = quantity;
      cartItem.total_price = quantity * product.price;

      // Re-reserve with updated quantity
      if (inventory) {
        if (cartItem.reservation_id) {
          try { await InventoryService.unreserveInventory(cartItem.reservation_id, 'Cart quantity update'); } catch (_) {}
        }
        const newReservation = await InventoryService.reserveForCart(inventory.id, cartItem.cart_id, quantity, userId);
        cartItem.reservation_id = newReservation.id;
      }

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

      // Release inventory reservation
      if (cartItem.reservation_id) {
        try { await InventoryService.unreserveInventory(cartItem.reservation_id, 'Item removed from cart'); } catch (_) {}
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

      // Release all inventory reservations first
      const items = await CartItem.findAll({ where: { cart_id: cart.id } });
      for (const item of items) {
        if (item.reservation_id) {
          try { await InventoryService.unreserveInventory(item.reservation_id, 'Cart cleared'); } catch (_) {}
        }
      }

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

  /**
   * Toggle selection of a cart item
   */
  static async toggleItemSelection(userId: number, cartItemId: number): Promise<CartItem> {
    try {
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

      // Toggle selection
      cartItem.is_selected = !cartItem.is_selected;
      await cartItem.save();

      logger.info(`Toggled selection for item ${cartItemId} to ${cartItem.is_selected} for user ${userId}`);
      return cartItem;
    } catch (error) {
      logger.error('Error toggling cart item selection:', error);
      throw error;
    }
  }

  /**
   * Toggle all cart items selection
   */
  static async toggleAllItems(userId: number, selected: boolean): Promise<void> {
    try {
      const cart = await Cart.findOne({ where: { user_id: userId } });
      if (!cart) return;

      await CartItem.update(
        { is_selected: selected },
        { where: { cart_id: cart.id } }
      );

      logger.info(`Set all items to ${selected ? 'selected' : 'deselected'} for user ${userId}`);
    } catch (error) {
      logger.error('Error toggling all cart items:', error);
      throw error;
    }
  }

  /**
   * Clear only selected cart items
   */
  static async clearSelectedItems(userId: number): Promise<void> {
    try {
      const cart = await Cart.findOne({ where: { user_id: userId } });
      if (!cart) return;

      // Get selected items to release their reservations
      const selectedItems = await CartItem.findAll({
        where: { cart_id: cart.id, is_selected: true },
      });

      // Release inventory reservations
      for (const item of selectedItems) {
        if (item.reservation_id) {
          try {
            await InventoryService.unreserveInventory(item.reservation_id, 'Selected items cleared from cart');
          } catch (_) {}
        }
      }

      // Delete selected items
      await CartItem.destroy({
        where: { cart_id: cart.id, is_selected: true },
      });

      // Update cart totals
      await this.updateCartTotals(cart.id);

      logger.info(`Cleared selected items from cart for user ${userId}`);
    } catch (error) {
      logger.error('Error clearing selected cart items:', error);
      throw error;
    }
  }
}
