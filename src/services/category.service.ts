import { Op, WhereOptions, Order } from 'sequelize';
import Category from '../models/Category';
import Product from '../models/Product';
import { NotFoundError, BadRequestError } from '../utils/errors';
import logger from '../utils/logger';

interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  parent_id?: number;
  image_url?: string;
  is_active?: boolean;
  sort_order?: number;
}

interface UpdateCategoryInput extends Partial<CreateCategoryInput> {}

interface GetCategoriesQuery {
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'sort_order' | 'created_at' | 'updated_at';
  order?: 'ASC' | 'DESC';
  search?: string;
  parent_id?: number | null;
  is_active?: boolean;
  include_products?: boolean;
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

export class CategoryService {
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

      const existing = await Category.findOne({ where: whereClause });

      if (!existing) {
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  static async validateParentCategory(
    parent_id: number,
    currentId?: number
  ): Promise<void> {
    const parent = await Category.findByPk(parent_id);
    if (!parent) {
      throw new BadRequestError(
        `Parent category with ID ${parent_id} not found`
      );
    }

    // Prevent circular references
    if (currentId && parent_id === currentId) {
      throw new BadRequestError('A category cannot be its own parent');
    }

    // Check if setting this parent would create a circular reference
    if (currentId) {
      let checkParent = parent;
      while (checkParent.parent_id) {
        if (checkParent.parent_id === currentId) {
          throw new BadRequestError(
            'Setting this parent would create a circular reference'
          );
        }
        const nextParent = await Category.findByPk(checkParent.parent_id);
        if (!nextParent) break;
        checkParent = nextParent;
      }
    }
  }

  static async createCategory(
    data: CreateCategoryInput
  ): Promise<Category> {
    let slug = data.slug || this.generateSlug(data.name);
    slug = await this.ensureUniqueSlug(slug);

    if (data.parent_id) {
      await this.validateParentCategory(data.parent_id);
    }

    const category = await Category.create({
      ...data,
      slug,
    });

    logger.info(`Category created: ${category.id} - ${category.name}`);

    return await this.getCategoryById(category.id);
  }

  static async getCategories(
    query: GetCategoriesQuery
  ): Promise<PaginatedResponse<Category>> {
    const {
      page = 1,
      limit = 20,
      sort_by = 'sort_order',
      order = 'ASC',
      search,
      parent_id,
      is_active,
      include_products = false,
    } = query;

    const offset = (page - 1) * limit;

    const where: WhereOptions<any> = {};

    if (search) {
      (where as any)[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    if (parent_id !== undefined) {
      where.parent_id = parent_id;
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    const orderClause: Order = [[sort_by, order]];

    const include = [];
    if (include_products) {
      include.push({
        model: Product,
        as: 'products',
        attributes: ['id', 'name', 'slug', 'price', 'stock_status'],
        where: { is_active: true },
        required: false,
      });
    }

    const { count, rows } = await Category.findAndCountAll({
      where,
      limit,
      offset,
      order: orderClause,
      include,
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

  static async getCategoryById(id: number): Promise<Category> {
    const category = await Category.findByPk(id, {
      include: [
        {
          model: Product,
          as: 'products',
          attributes: ['id', 'name', 'slug', 'price', 'stock_status'],
          where: { is_active: true },
          required: false,
        },
      ],
    });

    if (!category) {
      throw new NotFoundError(`Category with ID ${id} not found`);
    }

    return category;
  }

  static async getCategoryBySlug(slug: string): Promise<Category> {
    const category = await Category.findOne({
      where: { slug },
      include: [
        {
          model: Product,
          as: 'products',
          attributes: ['id', 'name', 'slug', 'price', 'stock_status'],
          where: { is_active: true },
          required: false,
        },
      ],
    });

    if (!category) {
      throw new NotFoundError(`Category with slug '${slug}' not found`);
    }

    return category;
  }

  static async updateCategory(
    id: number,
    data: UpdateCategoryInput
  ): Promise<Category> {
    const category = await Category.findByPk(id);

    if (!category) {
      throw new NotFoundError(`Category with ID ${id} not found`);
    }

    if (data.slug) {
      data.slug = await this.ensureUniqueSlug(data.slug, id);
    } else if (data.name && data.name !== category.name) {
      const newSlug = this.generateSlug(data.name);
      data.slug = await this.ensureUniqueSlug(newSlug, id);
    }

    if (data.parent_id !== undefined) {
      if (data.parent_id === null) {
        // Allow removing parent (make it a root category)
      } else {
        await this.validateParentCategory(data.parent_id, id);
      }
    }

    await category.update(data);

    logger.info(`Category updated: ${category.id} - ${category.name}`);

    return await this.getCategoryById(id);
  }

  static async deleteCategory(id: number): Promise<void> {
    const category = await Category.findByPk(id);

    if (!category) {
      throw new NotFoundError(`Category with ID ${id} not found`);
    }

    // Check if category has products
    const productCount = await Product.count({
      where: { category_id: id },
    });

    if (productCount > 0) {
      throw new BadRequestError(
        `Cannot delete category with ${productCount} products. Please reassign or delete products first.`
      );
    }

    // Check if category has children
    const childCount = await Category.count({
      where: { parent_id: id },
    });

    if (childCount > 0) {
      throw new BadRequestError(
        `Cannot delete category with ${childCount} child categories. Please reassign or delete children first.`
      );
    }

    await category.destroy();

    logger.info(`Category deleted: ${id} - ${category.name}`);
  }

  static async getTopLevelCategories(): Promise<Category[]> {
    return await Category.findAll({
      where: {
        parent_id: null,
        is_active: true,
      },
      order: [['sort_order', 'ASC']],
    });
  }

  static async getCategoryTree(): Promise<Category[]> {
    const allCategories = await Category.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC']],
    });

    // Build tree structure
    const categoryMap = new Map<number, any>();
    const tree: any[] = [];

    // First pass: create all nodes
    allCategories.forEach((cat) => {
      categoryMap.set(cat.id, {
        ...cat.toJSON(),
        children: [],
      });
    });

    // Second pass: build tree
    allCategories.forEach((cat) => {
      const node = categoryMap.get(cat.id);
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        tree.push(node);
      }
    });

    return tree as Category[];
  }

  static async getChildCategories(parentId: number): Promise<Category[]> {
    return await Category.findAll({
      where: {
        parent_id: parentId,
        is_active: true,
      },
      order: [['sort_order', 'ASC']],
    });
  }

  static async getCategoryPath(id: number): Promise<Category[]> {
    const path: Category[] = [];
    let current = await Category.findByPk(id);

    while (current) {
      path.unshift(current);
      if (current.parent_id) {
        current = await Category.findByPk(current.parent_id);
      } else {
        break;
      }
    }

    return path;
  }

  static async reorderCategories(
    orders: Array<{ id: number; sort_order: number }>
  ): Promise<void> {
    for (const { id, sort_order } of orders) {
      await Category.update({ sort_order }, { where: { id } });
    }

    logger.info(`Reordered ${orders.length} categories`);
  }
}
