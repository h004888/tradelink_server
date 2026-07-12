import { Listing, IListing } from '../models/listing.model';
import { Category } from '../models/category.model';
import { AppError } from '../utils/AppError';

interface ListingFilter {
  status?: string;
  type?: string;
  category?: string;
  categoryId?: string;
  sellerId?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'boosted' | 'newest' | 'popular' | 'nearby';
  page?: number;
  limit?: number;
  lat?: number;
  lng?: number;
  radius?: number;
}

export const findAll = async (filter: ListingFilter) => {
  const query: any = {};
  if (filter.status) query.status = filter.status;
  if (filter.type) query.type = { $in: [filter.type, 'both'] };
  if (filter.category) query.category = filter.category;
  if (filter.categoryId) query.categoryId = filter.categoryId;
  if (filter.sellerId) query.sellerId = filter.sellerId;
  if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
    query.price = {};
    if (filter.minPrice !== undefined) query.price.$gte = filter.minPrice;
    if (filter.maxPrice !== undefined) query.price.$lte = filter.maxPrice;
  }

  const page = filter.page || 1;
  const limit = filter.limit || 20;
  const skip = (page - 1) * limit;

  // Determine sort order
  let sortQuery: any = { createdAt: -1 }; // default: newest
  switch (filter.sort) {
    case 'boosted':
      sortQuery = { boostExpiry: -1, views: -1 };
      break;
    case 'popular':
      sortQuery = { saves: -1, views: -1 };
      break;
    case 'nearby':
      // Nearby: location-based, fallback to newest
      sortQuery = { createdAt: -1 };
      break;
    case 'newest':
    default:
      sortQuery = { createdAt: -1 };
      break;
  }

  // Nearby geo query
  if (filter.sort === 'nearby' && filter.lat !== undefined && filter.lng !== undefined) {
    const radius = filter.radius || 10000; // default 10km
    query.location = {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [filter.lng, filter.lat] },
        $maxDistance: radius,
      },
    };
  }

  const [listings, total] = await Promise.all([
    Listing.find(query).sort(sortQuery).skip(skip).limit(limit),
    Listing.countDocuments(query),
  ]);

  return { listings, total, page, totalPages: Math.ceil(total / limit) };
};

export const findMyListings = async (userId: string, status?: string) => {
  const query: any = { sellerId: userId };
  if (status) query.status = status;
  return Listing.find(query).sort({ createdAt: -1 });
};

export const findDrafts = async (userId: string) => {
  return Listing.find({ sellerId: userId, status: 'draft' }).sort({ createdAt: -1 });
};

export const findById = async (id: string) => {
  const listing = await Listing.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true });
  if (!listing) throw new AppError('Không tìm thấy tin đăng', 404);

  // Populate category name
  let categoryName = listing.category;
  if (listing.categoryId) {
    try {
      const category = await Category.findById(listing.categoryId);
      if (category) categoryName = category.name;
    } catch (e) {
      // Fallback: keep category slug
    }
  }

  return {
    ...listing.toObject(),
    categoryName,
  };
};

export const create = async (data: Partial<IListing>): Promise<IListing> => {
  return Listing.create(data);
};

export const update = async (id: string, sellerId: string, data: Partial<IListing>): Promise<IListing> => {
  const listing = await Listing.findOneAndUpdate({ _id: id, sellerId }, { $set: data }, { new: true, runValidators: true });
  if (!listing) throw new AppError('Không tìm thấy tin đăng hoặc bạn không có quyền', 404);
  return listing;
};

export const remove = async (id: string, sellerId: string): Promise<void> => {
  const listing = await Listing.findOneAndDelete({ _id: id, sellerId });
  if (!listing) throw new AppError('Không tìm thấy tin đăng hoặc bạn không có quyền', 404);
};

export const boost = async (id: string, sellerId: string, days: number): Promise<IListing> => {
  if (![3, 7].includes(days)) throw new AppError('Thời gian boost phải là 3 hoặc 7 ngày', 400);
  const boostExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const listing = await Listing.findOneAndUpdate({ _id: id, sellerId }, { $set: { boostExpiry } }, { new: true });
  if (!listing) throw new AppError('Không tìm thấy tin đăng hoặc bạn không có quyền', 404);
  return listing;
};

export const getFlagged = async () => {
  return Listing.find({ flags: { $gt: 0 } }).sort({ flags: -1 }).populate('sellerId', 'name phone');
};
