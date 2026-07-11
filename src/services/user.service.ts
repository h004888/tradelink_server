import { User, IUser } from '../models/user.model';
import { Listing } from '../models/listing.model';
import { AppError } from '../utils/AppError';

export const findById = async (id: string): Promise<IUser> => {
  const user = await User.findById(id).select('-passwordHash');
  if (!user) throw new AppError('Không tìm thấy người dùng', 404);
  return user;
};

export const findByEmail = async (email: string): Promise<IUser | null> => {
  return User.findOne({ email }).select('-passwordHash');
};

export const update = async (id: string, data: Partial<IUser>): Promise<IUser> => {
  const user = await User.findByIdAndUpdate(id, { $set: data }, { new: true }).select('-passwordHash');
  if (!user) throw new AppError('Không tìm thấy người dùng', 404);
  return user;
};

export const updateAvatar = async (id: string, avatarUrl: string): Promise<IUser> => {
  const user = await User.findByIdAndUpdate(id, { $set: { avatarUrl } }, { new: true }).select('-passwordHash');
  if (!user) throw new AppError('Không tìm thấy người dùng', 404);
  return user;
};

export const getTopSellers = async (limit = 6) => {
  return Listing.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$sellerId', sellerName: { $first: '$sellerName' }, totalListings: { $sum: 1 }, totalViews: { $sum: '$views' } } },
    { $sort: { totalViews: -1 } },
    { $limit: limit },
  ]);
};
