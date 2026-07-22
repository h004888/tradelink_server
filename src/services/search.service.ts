import { Listing } from '../models/listing.model';
import { Category } from '../models/category.model';
import { SearchLog } from '../models/searchLog.model';

/** Escape ký tự đặc biệt regex — query người dùng gõ dở (VD "iPhone (") không được để lọt thẳng vào new RegExp(). */
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const search = async (params: {
  q?: string;
  type?: string;
  category?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  limit?: number;
}) => {
  const query: any = { status: 'active' };

  if (params.q) {
    const q = params.q.trim();
    if (q) {
      // Chỉ khớp theo title (không còn tìm cả description như trước).
      query.title = { $regex: escapeRegex(q), $options: 'i' };
      logSearchQuery(q).catch(() => {}); // fire-and-forget, không chặn response
    }
  }
  if (params.type) query.type = { $in: [params.type, 'both'] };
  if (params.category) query.category = params.category;
  if (params.categoryId) query.categoryId = params.categoryId;
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    query.price = {};
    if (params.minPrice !== undefined) query.price.$gte = params.minPrice;
    if (params.maxPrice !== undefined) query.price.$lte = params.maxPrice;
  }

  let sort: any = { boostExpiry: -1, createdAt: -1 };
  switch (params.sort) {
    case 'price_asc': sort = { price: 1 }; break;
    case 'price_desc': sort = { price: -1 }; break;
    case 'popular': sort = { views: -1, saves: -1 }; break;
    case 'newest': sort = { createdAt: -1 }; break;
  }

  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const [listings, total] = await Promise.all([
    Listing.find(query).sort(sort).skip(skip).limit(limit),
    Listing.countDocuments(query),
  ]);

  return { listings, total, page, totalPages: Math.ceil(total / limit) };
};

export const getHome = async (page: number = 1, limit: number = 10) => {
  // Validate input
  const validPage = Math.max(1, Math.min(page, 50));
  const validLimit = Math.max(1, Math.min(limit, 20));
  const skip = (validPage - 1) * validLimit;

  const [featured, newest, popular, categories, topSellers, totalFeatured] = await Promise.all([
    Listing.find({ status: 'active' }).sort({ boostExpiry: -1, views: -1 }).skip(skip).limit(validLimit),
    Listing.find({ status: 'active' }).sort({ createdAt: -1 }).skip(skip).limit(validLimit),
    Listing.find({ status: 'active' }).sort({ saves: -1, views: -1 }).skip(skip).limit(validLimit),
    validPage === 1 ? Category.find({ isActive: true }).sort({ order: 1 }) : Promise.resolve([]),
    validPage === 1 ? Listing.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$sellerId', sellerName: { $first: '$sellerName' }, totalListings: { $sum: 1 }, totalViews: { $sum: '$views' } } },
      { $sort: { totalViews: -1 } },
      { $limit: 6 },
    ]) : Promise.resolve([]),
    Listing.countDocuments({ status: 'active' }),
  ]);

  return {
    featured,
    newest,
    popular,
    categories,
    topSellers,
    hasMore: skip + validLimit < totalFeatured,
    page: validPage,
  };
};

export const getCategories = async () => {
  const cats = await Category.find({ isActive: true }).sort({ order: 1 });
  return cats.map((cat, i) => ({
    id: cat._id.toString(),
    name: cat.name,
    order: cat.order ?? i,
    icon: cat.icon,
    slug: cat.slug,
  }));
};

export const getFeed = async (
  page: number = 1,
  limit: number = 10,
  filters: {
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    sort?: string;
  } = {}
) => {
  const validPage = Math.max(1, Math.min(page, 50));
  const validLimit = Math.max(1, Math.min(limit, 20));
  const skip = (validPage - 1) * validLimit;

  // Build query
  const query: any = { status: 'active' };

  if (filters.type) query.type = { $in: [filters.type, 'both'] };
  if (filters.condition) query.condition = filters.condition;
  if (filters.minPrice || filters.maxPrice) {
    query.price = {};
    if (filters.minPrice) query.price.$gte = filters.minPrice;
    if (filters.maxPrice) query.price.$lte = filters.maxPrice;
  }

  // Build sort
  let sort: any = { boostExpiry: -1, createdAt: -1 };
  switch (filters.sort) {
    case 'price_asc': sort = { price: 1 }; break;
    case 'price_desc': sort = { price: -1 }; break;
    case 'popular': sort = { views: -1, saves: -1 }; break;
    case 'newest': sort = { createdAt: -1 }; break;
  }

  const [listings, total, categories] = await Promise.all([
    Listing.find(query).sort(sort).skip(skip).limit(validLimit),
    Listing.countDocuments(query),
    validPage === 1 ? Category.find({ isActive: true }).sort({ order: 1 }) : Promise.resolve([]),
  ]);

  return {
    listings,
    categories,
    hasMore: skip + validLimit < total,
    page: validPage,
    total,
  };
};

/** Ghi nhận một lượt tìm kiếm để phục vụ thống kê "phổ biến". */
export const logSearchQuery = async (rawQuery: string): Promise<void> => {
  const trimmed = rawQuery.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return;
  const key = trimmed.toLowerCase();

  await SearchLog.updateOne(
    { query: key },
    { $inc: { count: 1 }, $set: { lastSearchedAt: new Date(), label: trimmed } },
    { upsert: true }
  );
};

/** Top từ khóa được tìm nhiều nhất, dựa trên dữ liệu thật thay vì hardcode. */
export const getPopularSearches = async (limit: number = 10): Promise<string[]> => {
  const safeLimit = Math.min(Math.max(limit, 1), 20);
  const logs = await SearchLog.find().sort({ count: -1, lastSearchedAt: -1 }).limit(safeLimit);
  return logs.map((l) => l.label);
};

export const getSuggestions = async (query: string) => {
  if (!query || query.length < 2) return { categories: [], products: [] };

  const regex = new RegExp(escapeRegex(query), 'i');

  const [categories, products] = await Promise.all([
    Category.find({ name: regex, isActive: true }).limit(5),
    Listing.find({
      status: 'active',
      $or: [
        { title: regex },
        { category: regex },
      ]
    }).limit(5).select('title price imageUrls category'),
  ]);

  return { categories, products };
};
