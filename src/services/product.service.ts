import { Op, WhereOptions, Order, Sequelize as SequelizeStatic } from 'sequelize';
import sequelize from '../config/database';
import Product from '../models/Product';
import Category from '../models/Category';
import ProductImage from '../models/ProductImage';
import ProductVideo from '../models/ProductVideo';
import { NotFoundError, BadRequestError } from '../utils/errors';
import logger from '../utils/logger';
import { UploadService } from './upload.service';

interface CreateProductInput {
  name: string;
  slug?: string;
  description?: string;
  short_description?: string;
  features?: string;
  sku?: string;
  jug?: string;
  price: number;
  compare_at_price?: number;
  cost_price?: number;
  category_id?: number;
  stock_quantity?: number;
  low_stock_threshold?: number;
  stock_status?: 'in_stock' | 'out_of_stock' | 'backorder';
  is_active?: boolean;
  is_featured?: boolean;
  is_published?: boolean;
  brand?: string;
  eligible_for_return?: boolean;
  return_policy?: string;
  meta_title?: string;
  meta_description?: string;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  metadata?: Record<string, unknown>;
}

interface MediaData {
  coverImage?: string;
  gallery?: Array<{ url: string; name: string; alt_text?: string }>;
  demoImages?: Array<{ url: string; name: string; alt_text?: string }>;
  demoVideos?: Array<{ url: string; title: string; platform?: string; external_id?: string }>;
  galleryVideos?: Array<{ url: string; title: string; platform?: string; external_id?: string }>;
}

interface MediaData {
  coverImage?: string;
  gallery?: Array<{ url: string; name: string; alt_text?: string }>;
  demoImages?: Array<{ url: string; name: string; alt_text?: string }>;
  demoVideos?: Array<{ url: string; title: string; platform?: string; external_id?: string }>;
  galleryVideos?: Array<{ url: string; title: string; platform?: string; external_id?: string }>;
}

interface UpdateProductInput extends Partial<CreateProductInput> {}

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
  is_published?: boolean;
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
  /**
   * Organize product media by type for API responses
   */
  static organizeProductMedia(
    product: any
  ): any {
    const organized = { ...product.toJSON ? product.toJSON() : product };

    // Initialize media fields
    organized.coverImage = null;
    organized.gallery = [];
    organized.demoImages = [];
    organized.demoVideos = [];
    organized.galleryVideos = [];

    // Organize images by type
    if (product.images && Array.isArray(product.images)) {
      for (const image of product.images) {
        if (image.image_type === 'cover' || image.is_primary) {
          organized.coverImage = {
            id: image.id,
            url: image.url,
            name: image.name,
            alt_text: image.alt_text,
            sort_order: image.sort_order,
            width: image.width,
            height: image.height,
            size: image.size,
            mime_type: image.mime_type,
          };
        } else if (image.image_type === 'demo') {
          organized.demoImages.push({
            id: image.id,
            url: image.url,
            name: image.name,
            alt_text: image.alt_text,
            sort_order: image.sort_order,
            width: image.width,
            height: image.height,
            size: image.size,
            mime_type: image.mime_type,
          });
        } else {
          // Default to gallery
          organized.gallery.push({
            id: image.id,
            url: image.url,
            name: image.name,
            alt_text: image.alt_text,
            sort_order: image.sort_order,
            width: image.width,
            height: image.height,
            size: image.size,
            mime_type: image.mime_type,
          });
        }
      }
    }

    // Organize videos by type
    if (product.videos && Array.isArray(product.videos)) {
      for (const video of product.videos) {
        const videoData = {
          id: video.id,
          url: video.url,
          title: video.title,
          description: video.description,
          thumbnail_url: video.thumbnail_url,
          duration: video.duration,
          platform: video.platform,
          external_id: video.external_id,
          sort_order: video.sort_order,
          size: video.size,
          mime_type: video.mime_type,
        };

        if (video.video_type === 'demo' || video.video_type === 'tutorial') {
          organized.demoVideos.push(videoData);
        } else {
          organized.galleryVideos.push(videoData);
        }
      }
    }

    return organized;
  }

  /**
   * Upload product media files (images and videos)
   */
  static async uploadProductMedia(
    productId: number,
    files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>
  ): Promise<void> {
    if (!files) return;

    const fileRecord = files as Record<string, Express.Multer.File[]>;

    // Upload images
    if (fileRecord.image_files && Array.isArray(fileRecord.image_files)) {
      const imageFiles = fileRecord.image_files;
      let isFirstImage = true;

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const uploadResult = await UploadService.uploadFile(file, 'products/images');

        // Determine image type from metadata if provided
        let imageType: 'cover' | 'gallery' | 'demo' = 'gallery';
        let altText = '';

        // The first image is the cover by default
        if (isFirstImage) {
          imageType = 'cover';
          isFirstImage = false;
        }

        await ProductImage.create({
          product_id: productId,
          url: uploadResult.url,
          name: file.originalname,
          alt_text: altText,
          size: uploadResult.size,
          mime_type: uploadResult.mimeType,
          is_primary: imageType === 'cover',
          image_type: imageType,
          sort_order: i,
        });

        logger.info(
          `📸 Product image saved: Product ID ${productId}, Image: ${file.originalname}`
        );
      }
    }

    // Upload videos
    if (fileRecord.video_files && Array.isArray(fileRecord.video_files)) {
      const videoFiles = fileRecord.video_files;

      for (let i = 0; i < videoFiles.length; i++) {
        const file = videoFiles[i];
        const uploadResult = await UploadService.uploadFile(file, 'products/videos');

        await ProductVideo.create({
          product_id: productId,
          url: uploadResult.url,
          title: file.originalname.replace(/\.[^/.]+$/, ''),
          description: '',
          platform: 'local',
          size: uploadResult.size,
          mime_type: uploadResult.mimeType,
          video_type: 'demo',
          sort_order: i,
        });

        logger.info(
          `🎬 Product video saved: Product ID ${productId}, Video: ${file.originalname}`
        );
      }
    }
  }

  /**
   * Delete a product image
   */
  static async deleteProductImage(imageId: number): Promise<void> {
    const image = await ProductImage.findByPk(imageId);

    if (!image) {
      throw new NotFoundError(`Image with ID ${imageId} not found`);
    }

    // Extract key from URL for S3 deletion
    try {
      const key = this.extractS3KeyFromUrl(image.url);
      if (key) {
        await UploadService.deleteFile(key);
      }
    } catch (error) {
      logger.warn(`Failed to delete S3 file for image ${imageId}:`, error);
    }

    await image.destroy();
    logger.info(`📸 Product image deleted: ${imageId}`);
  }

  /**
   * Delete a product video
   */
  static async deleteProductVideo(videoId: number): Promise<void> {
    const video = await ProductVideo.findByPk(videoId);

    if (!video) {
      throw new NotFoundError(`Video with ID ${videoId} not found`);
    }

    // Only delete from S3 if it's a local upload, not an external embed
    if (video.platform === 'local') {
      try {
        const key = this.extractS3KeyFromUrl(video.url);
        if (key) {
          await UploadService.deleteFile(key);
        }
      } catch (error) {
        logger.warn(`Failed to delete S3 file for video ${videoId}:`, error);
      }
    }

    await video.destroy();
    logger.info(`🎬 Product video deleted: ${videoId}`);
  }

  /**
   * Extract S3 key from a full S3 URL
   */
  private static extractS3KeyFromUrl(url: string): string | null {
    try {
      // S3 URLs typically look like:
      // https://bucket-name.s3.region.amazonaws.com/key/path
      // or https://s3.region.amazonaws.com/bucket-name/key/path
      const urlObj = new URL(url);
      let key = urlObj.pathname;

      // Remove leading slash
      if (key.startsWith('/')) {
        key = key.substring(1);
      }

      // If the bucket is in the subdomain, extract just the path
      if (urlObj.hostname.includes('.s3')) {
        return key;
      }

      // If the bucket is in the path, remove it
      const pathParts = key.split('/');
      if (pathParts.length > 1) {
        return pathParts.slice(1).join('/');
      }

      return key;
    } catch (error) {
      logger.warn('Failed to extract S3 key from URL:', error);
      return null;
    }
  }

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

  /**
   * Generate a unique SKU: SKU-XXXXXXXXXXXXXX (14 random digits)
   */
  static async generateUniqueSKU(): Promise<string> {
    let sku: string;
    let exists = true;

    while (exists) {
      // Generate 14 random digits
      const randomDigits = Math.floor(Math.random() * 100000000000000)
        .toString()
        .padStart(14, '0');
      sku = `SKU-${randomDigits}`;

      // Check if SKU already exists
      const existingProduct = await Product.findOne({ where: { sku } });
      exists = !!existingProduct;
    }

    return sku!;
  }

  /**
   * Generate a JUG: JUG-XXXXXXXXXXXXXX (14 random digits)
   * Note: JUG can be shared across multiple products
   */
  static generateJUG(): string {
    // Generate 14 random digits
    const randomDigits = Math.floor(Math.random() * 100000000000000)
      .toString()
      .padStart(14, '0');
    return `JUG-${randomDigits}`;
  }

  static async createProduct(
    data: CreateProductInput,
    files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>,
    bodyData?: any
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

    // Auto-generate SKU if not provided
    let sku = data.sku;
    if (!sku) {
      sku = await this.generateUniqueSKU();
    } else {
      // Validate SKU if provided
      const existingSku = await Product.findOne({ where: { sku } });
      if (existingSku) {
        throw new BadRequestError(`Product with SKU ${sku} already exists`);
      }
    }

    // Auto-generate JUG if not provided
    const jug = data.jug || this.generateJUG();

    const stockStatus =
      data.stock_status ||
      this.determineStockStatus(data.stock_quantity || 0);

    const product = await Product.create({
      ...data,
      slug,
      sku,
      jug,
      stock_status: stockStatus,
    });

    // Upload media files after product creation
    try {
      await this.uploadProductMedia(product.id, files);
    } catch (error) {
      // Log error but don't fail the product creation
      logger.error(`Error uploading media for product ${product.id}:`, error);
    }

    logger.info(`Product created: ${product.id} - ${product.name} (SKU: ${sku}, JUG: ${jug})`);

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
      is_published,
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

    if (is_published !== undefined) {
      where.is_published = is_published;
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
          attributes: ['id', 'url', 'name', 'alt_text', 'is_primary', 'image_type', 'sort_order', 'width', 'height', 'size', 'mime_type'],
          order: [['sort_order', 'ASC']],
        },
        {
          model: ProductVideo,
          as: 'videos',
          attributes: ['id', 'url', 'title', 'video_type', 'platform', 'external_id', 'sort_order', 'duration'],
          order: [['sort_order', 'ASC']],
        },
      ],
    });

    // Organize media for each product
    const organizedRows = rows.map(product => this.organizeProductMedia(product));

    const totalPages = Math.ceil(count / limit);

    return {
      data: organizedRows,
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
          attributes: ['id', 'url', 'name', 'alt_text', 'is_primary', 'image_type', 'sort_order', 'width', 'height', 'size', 'mime_type'],
          order: [['sort_order', 'ASC']],
        },
        {
          model: ProductVideo,
          as: 'videos',
          attributes: ['id', 'url', 'title', 'description', 'thumbnail_url', 'duration', 'video_type', 'platform', 'external_id', 'sort_order', 'size', 'mime_type'],
          order: [['sort_order', 'ASC']],
        },
      ],
    });

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    return this.organizeProductMedia(product);
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
          attributes: ['id', 'url', 'name', 'alt_text', 'is_primary', 'image_type', 'sort_order', 'width', 'height', 'size', 'mime_type'],
          order: [['sort_order', 'ASC']],
        },
        {
          model: ProductVideo,
          as: 'videos',
          attributes: ['id', 'url', 'title', 'description', 'thumbnail_url', 'duration', 'video_type', 'platform', 'external_id', 'sort_order', 'size', 'mime_type'],
          order: [['sort_order', 'ASC']],
        },
      ],
    });

    if (!product) {
      throw new NotFoundError(`Product with slug '${slug}' not found`);
    }

    return this.organizeProductMedia(product);
  }

  static async updateProduct(
    id: number,
    data: UpdateProductInput,
    files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>,
    bodyData?: any
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

    // Upload new media files if provided
    if (files) {
      try {
        await this.uploadProductMedia(id, files);
      } catch (error) {
        logger.error(`Error uploading media for product ${id}:`, error);
      }
    }

    // Handle media deletion if specified in body
    if (bodyData?.deletedImageIds && Array.isArray(bodyData.deletedImageIds)) {
      for (const imageId of bodyData.deletedImageIds) {
        try {
          await this.deleteProductImage(parseInt(imageId, 10));
        } catch (error) {
          logger.warn(`Failed to delete image ${imageId}:`, error);
        }
      }
    }

    if (bodyData?.deletedVideoIds && Array.isArray(bodyData.deletedVideoIds)) {
      for (const videoId of bodyData.deletedVideoIds) {
        try {
          await this.deleteProductVideo(parseInt(videoId, 10));
        } catch (error) {
          logger.warn(`Failed to delete video ${videoId}:`, error);
        }
      }
    }

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
    const products = await Product.findAll({
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
          attributes: ['id', 'url', 'name', 'alt_text', 'is_primary', 'image_type', 'sort_order', 'width', 'height', 'size', 'mime_type'],
          where: { is_primary: true },
          required: false,
        },
        {
          model: ProductVideo,
          as: 'videos',
          attributes: ['id', 'url', 'title', 'video_type', 'platform', 'external_id', 'sort_order'],
          order: [['sort_order', 'ASC']],
        },
      ],
    });

    return products.map(product => this.organizeProductMedia(product));
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

    const products = await Product.findAll({
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
          attributes: ['id', 'url', 'name', 'alt_text', 'is_primary', 'image_type', 'sort_order', 'width', 'height', 'size', 'mime_type'],
          where: { is_primary: true },
          required: false,
        },
        {
          model: ProductVideo,
          as: 'videos',
          attributes: ['id', 'url', 'title', 'video_type', 'platform', 'external_id', 'sort_order'],
          order: [['sort_order', 'ASC']],
        },
      ],
    });

    return products.map(p => this.organizeProductMedia(p));
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

  static async togglePublish(
    id: number,
    is_published: boolean
  ): Promise<Product> {
    const product = await Product.findByPk(id);

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    await product.update({ is_published });

    logger.info(
      `Product ${is_published ? 'published' : 'unpublished'}: ${product.id} - ${product.name}`
    );

    return await this.getProductById(id);
  }

  static async toggleFeatured(
    id: number,
    is_featured: boolean
  ): Promise<Product> {
    const product = await Product.findByPk(id);

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    await product.update({ is_featured });

    logger.info(
      `Product ${is_featured ? 'featured' : 'unfeatured'}: ${product.id} - ${product.name}`
    );

    return await this.getProductById(id);
  }

  /**
   * Get unique brands from all products for autocomplete
   */
  static async getUniqueBrands(search?: string): Promise<string[]> {
    const brandFilters: any[] = [
      { [Op.ne]: null },
      { [Op.ne]: '' },
    ];

    if (search) {
      brandFilters.push({ [Op.like]: `%${search}%` });
    }

    const whereClause: WhereOptions = {
      brand: {
        [Op.and]: brandFilters
      },
    };

    const products = await Product.findAll({
      attributes: [[SequelizeStatic.fn('DISTINCT', SequelizeStatic.col('brand')), 'brand']],
      where: whereClause,
      order: [['brand', 'ASC']],
      limit: 50,
      raw: true,
    });

    return products.map((p: any) => p.brand).filter(Boolean);
  }

  static async duplicateProduct(id: number): Promise<Product> {
    const product = await Product.findByPk(id, {
      include: [
        {
          model: ProductImage,
          as: 'images',
        },
      ],
    });

    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    // Create new product with copied data
    const duplicatedData: CreateProductInput = {
      name: `${product.name} (Copy)`,
      slug: '', // Will be auto-generated
      description: product.description,
      short_description: product.short_description,
      features: product.features,
      sku: undefined, // Auto-generate new SKU
      jug: product.jug, // Keep the same JUG (groups same products)
      price: product.price,
      compare_at_price: product.compare_at_price,
      cost_price: product.cost_price,
      category_id: product.category_id,
      stock_quantity: product.stock_quantity,
      low_stock_threshold: product.low_stock_threshold,
      stock_status: product.stock_status as 'in_stock' | 'out_of_stock' | 'backorder',
      is_active: product.is_active,
      is_featured: false, // Don't copy featured status
      is_published: false, // New product should be unpublished
      brand: product.brand,
      eligible_for_return: product.eligible_for_return,
      return_policy: product.return_policy,
      meta_title: product.meta_title,
      meta_description: product.meta_description,
      weight: product.weight,
      dimensions: product.dimensions,
      metadata: product.metadata,
    };

    const newProduct = await this.createProduct(duplicatedData);

    // Copy product images
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        await ProductImage.create({
          product_id: newProduct.id,
          url: image.url,
          name: image.name,
          is_primary: image.is_primary,
          sort_order: image.sort_order,
        });
      }
    }

    logger.info(
      `Product duplicated: Original ID: ${id}, New ID: ${newProduct.id}`
    );

    return await this.getProductById(newProduct.id);
  }
}
