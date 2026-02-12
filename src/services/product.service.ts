import { Op, WhereOptions, Order } from 'sequelize';
import Product from '../models/Product';
import Category from '../models/Category';
import ProductImage from '../models/ProductImage';
import { NotFoundError, BadRequestError } from '../utils/errors';
import logger from '../utils/logger';

interface CreateProductInput {
  name: string;
  slug?: string;
  description?: string;
  short_description?: string;
  sku?: string;
  price: number;
  compare_at_price?: number;
  cost_price?: number;
  category_id?: number;
  stock_quantity?: number;
  low_stock_threshold?: number;
  stock_status?: 'in_stock' | 'out_of_stock' | 'backorder';
  is_active?: boolean;
  is_featured?: boolean;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  metadata?: Record<string, unknown>;
}

interface UpdateProductInput extends Partial<CreateProductInput> {}

interface GetProductsQuery {
  page?: number;
  limit?: number;
  sort_by?:
    | 'name'
    | 'price'
    | 'created_at'
    | 'updated_at'
    | 'rating'
    | 'sales_count'
    | 'view_count';
  order?: 'ASC' | 'DESC';
  search?: string;
  category_id?: number;
  is_active?: boolean;
  is_featured?: boolean;
  stock_status?: 'in_stock' | 'out_of_stock' | 'backorder';
  min_price?: number;
  max_price?: number;
  min_rating?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export class ProductService {
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static async ensureUniqueSlug(
    slug: string,
    excludeId?: number
  ): Promise<string> {
    let uniqueSlug = slug;
    let counter = 1;

    while (true) {
      const whereClause: WhereOptions = { slug: uniqueSlug };
      if (excludeId) {
        whereClause.id = { [Op.ne]: excludeId };
      }

      const existing = await Product.findOne({ where: whereClause });

      if (!existing) {
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  static determineStockStatus(quantity: number): string {
    if (quantity <= 0) {
      return 'out_of_stock';
    }
    return 'in_stock';
  }

  static async createProduct(
    data: CreateProductInput
  ): Promise<Product> {
    let slug = data.slug || this.generateSlug(data.name);
    slug = await this.ensureUniqueSlug(slug);

    if (data.category_id) {
      const category = await Category.findByPk(data.category_id);
      if (!category) {
        throw new BadRequestError(
          `Category with ID ${data.category_id} not found`
        );
      }
    }

    if (data.sku) {
      const existingSku = await Product.findOne({ where: { sku: data.sku } });
      if (existingSku) {
        throw new BadRequestError(`Product with SKU ${data.sku} already exists`);
      }
    }

    const stockStatus =
      data.stock_status ||
      this.determineStockStatus(data.stock_quantity || 0);

    const product = await Product.create({
      ...data,
      slug,
      stock_status: stockStatus,
    });

    logger.info(`Product created: ${product.id} - ${product.name}`);

    return await this.getProductById(product.id);
  }

  static async getProducts(
    query: GetProductsQuery
  ): Promise<PaginatedResponse<Product>> {
    const {
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      order = 'DESC',
      search,
      category_id,
      is_active,
      is_featured,
      stock_status,
      min_price,
      max_price,
      min_rating,
    } = query;

    const offset = (page - 1) * limit;

    const where: WhereOptions<any> = {};

    if (search) {
      (where as any)[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
      ];
    }

    if (category_id !== undefined) {
      where.category_id = category_id;
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (is_featured !== undefined) {
      where.is_featured = is_featured;
    }

    if (stock_status) {
      where.stock_status = stock_status;
    }

    if (min_price !== undefined || max_price !== undefined) {
      where.price = {};
      if (min_price !== undefined) {
        where.price[Op.gte] = min_price;
      }
      if (max_price !== undefined) {
        where.price[Op.lte] = max_price;
      }
    }

    if (min_rating !== undefined) {
      where.rating = { [Op.gte]: min_rating };
    }

    const orderClause: Order = [[sort_by, order]];

    const { count, rows } = await Product.findAndCountAll({
      where,
      limit,
      offset,
      order: orderClause,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug'],
        },
        {
          model: ProductImage,
          as: 'images',
          attributes: ['id', 'url', 'name', 'is_primary', 'sort_order'],
          order: [['sort_order', 'ASC']],
        },
      ],
    });

    const totalPages = Math.ceil(count / limit);

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  static async getProductById(id: number): Promise<Product> {
    const product = await Product.findByPk(id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'description'],
        },
        {
          model: ProductImage,
          as: 'images',
          attributes: ['id', 'url', 'name', 'is_primary', 'sort_order'],
          order: [['sort_order', 'ASC']],
        },
      ],
    });

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    return product;
  }

  static async getProductBySlug(slug: string): Promise<Product> {
    const product = await Product.findOne({
      where: { slug },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'description'],
        },
        {
          model: ProductImage,
          as: 'images',
          attributes: ['id', 'url', 'name', 'is_primary', 'sort_order'],
          order: [['sort_order', 'ASC']],
        },
      ],
    });

    if (!product) {
      throw new NotFoundError(`Product with slug '${slug}' not found`);
    }

    return product;
  }

  static async updateProduct(
    id: number,
    data: UpdateProductInput
  ): Promise<Product> {
    const product = await Product.findByPk(id);

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    if (data.slug) {
      data.slug = await this.ensureUniqueSlug(data.slug, id);
    } else if (data.name && data.name !== product.name) {
      const newSlug = this.generateSlug(data.name);
      data.slug = await this.ensureUniqueSlug(newSlug, id);
    }

    if (data.category_id !== undefined) {
      if (data.category_id === null) {
        // Allow removing category
      } else {
        const category = await Category.findByPk(data.category_id);
        if (!category) {
          throw new BadRequestError(
            `Category with ID ${data.category_id} not found`
          );
        }
      }
    }

    if (data.sku && data.sku !== product.sku) {
      const existingSku = await Product.findOne({
        where: {
          sku: data.sku,
          id: { [Op.ne]: id },
        },
      });
      if (existingSku) {
        throw new BadRequestError(`Product with SKU ${data.sku} already exists`);
      }
    }

    if (data.stock_quantity !== undefined && data.stock_status === undefined) {
      data.stock_status = this.determineStockStatus(data.stock_quantity) as any;
    }

    await product.update(data);

    logger.info(`Product updated: ${product.id} - ${product.name}`);

    return await this.getProductById(id);
  }

  static async deleteProduct(id: number): Promise<void> {
    const product = await Product.findByPk(id);

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    await product.destroy();

    logger.info(`Product deleted: ${id} - ${product.name}`);
  }

  static async updateStock(
    id: number,
    stock_quantity: number,
    stock_status?: 'in_stock' | 'out_of_stock' | 'backorder'
  ): Promise<Product> {
    const product = await Product.findByPk(id);

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    const newStockStatus =
      stock_status || this.determineStockStatus(stock_quantity);

    await product.update({
      stock_quantity,
      stock_status: newStockStatus,
    });

    logger.info(
      `Product stock updated: ${product.id} - Quantity: ${stock_quantity}, Status: ${newStockStatus}`
    );

    return await this.getProductById(id);
  }

  static async incrementViewCount(id: number): Promise<void> {
    const product = await Product.findByPk(id);

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    await product.increment('view_count', { by: 1 });
  }

  static async getFeaturedProducts(limit: number = 10): Promise<Product[]> {
    return await Product.findAll({
      where: {
        is_featured: true,
        is_active: true,
      },
      limit,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug'],
        },
        {
          model: ProductImage,
          as: 'images',
          attributes: ['id', 'url', 'name', 'is_primary', 'sort_order'],
          where: { is_primary: true },
          required: false,
        },
      ],
    });
  }

  static async getRelatedProducts(
    id: number,
    limit: number = 4
  ): Promise<Product[]> {
    const product = await Product.findByPk(id);

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    const where: WhereOptions = {
      id: { [Op.ne]: id },
      is_active: true,
    };

    if (product.category_id) {
      where.category_id = product.category_id;
    }

    return await Product.findAll({
      where,
      limit,
      order: [['sales_count', 'DESC']],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug'],
        },
        {
          model: ProductImage,
          as: 'images',
          attributes: ['id', 'url', 'name', 'is_primary', 'sort_order'],
          where: { is_primary: true },
          required: false,
        },
      ],
    });
  }

  static async getLowStockProducts(
    threshold?: number
  ): Promise<Product[]> {
    const where: WhereOptions<any> = {};

    if (threshold !== undefined) {
      where.stock_quantity = { [Op.lte]: threshold };
    } else {
      (where as any)[Op.or] = [
        { stock_quantity: { [Op.lte]: Product.sequelize!.col('low_stock_threshold') } },
        { stock_status: 'out_of_stock' },
      ];
    }

    return await Product.findAll({
      where,
      order: [['stock_quantity', 'ASC']],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug'],
        },
      ],
    });
  }
}
