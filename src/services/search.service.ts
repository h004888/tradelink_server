import { Listing } from '../models/listing.model';

export const search = async (params: {
  q?: string;
  type?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}) => {
  const query: any = { status: 'active' };

  if (params.q) query.$text = { $search: params.q };
  if (params.type) query.type = { $in: [params.type, 'both'] };
  if (params.category) query.category = params.category;
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    query.price = {};
    if (params.minPrice !== undefined) query.price.$gte = params.minPrice;
    if (params.maxPrice !== undefined) query.price.$lte = params.maxPrice;
  }

  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const [listings, total] = await Promise.all([
    Listing.find(query).sort({ boostExpiry: -1, createdAt: -1 }).skip(skip).limit(limit),
    Listing.countDocuments(query),
  ]);

  return { listings, total, page, totalPages: Math.ceil(total / limit) };
};

export const getHome = async () => {
  const [featured, newest, popular, categories, topSellers] = await Promise.all([
    Listing.find({ status: 'active' }).sort({ boostExpiry: -1, views: -1 }).limit(10),
    Listing.find({ status: 'active' }).sort({ createdAt: -1 }).limit(10),
    Listing.find({ status: 'active' }).sort({ saves: -1, views: -1 }).limit(10),
    Listing.distinct('category', { status: 'active' }),
    Listing.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$sellerId', sellerName: { $first: '$sellerName' }, totalListings: { $sum: 1 }, totalViews: { $sum: '$views' } } },
      { $sort: { totalViews: -1 } },
      { $limit: 6 },
    ]),
  ]);
  return { featured, newest, popular, categories, topSellers };
};

export const getCategories = async () => {
  const cats = await Listing.distinct('category', { status: 'active' });
  // Filter: chỉ giữ category names hợp lệ (không có ký tự replacement �)
  return cats
    .filter(Boolean)
    .filter((name): name is string => {
      if (typeof name !== 'string') return false;
      return !name.includes('�'); // loại bỏ ký tự encoding lỗi
    })
    .map((name, i) => ({ id: `cat_${i}`, name, order: i }));
};
