import { Watchlist } from '../models/watchlist.model';
import { Listing } from '../models/listing.model';
import { AppError } from '../utils/AppError';

export const getAll = async (userId: string) => {
  const items = await Watchlist.find({ userId }).populate('listingId').sort({ createdAt: -1 });
  return items;
};

export const check = async (userId: string, listingId: string) => {
  const item = await Watchlist.findOne({ userId, listingId });
  return { saved: !!item };
};

export const add = async (userId: string, listingId: string) => {
  const exists = await Watchlist.findOne({ userId, listingId });
  if (exists) throw new AppError('Đã lưu tin này rồi', 409);

  await Watchlist.create({ userId, listingId });
  await Listing.findByIdAndUpdate(listingId, { $inc: { saves: 1 } });
};

export const remove = async (userId: string, listingId: string) => {
  const item = await Watchlist.findOneAndDelete({ userId, listingId });
  if (!item) throw new AppError('Không tìm thấy mục đã lưu', 404);
  await Listing.findByIdAndUpdate(listingId, { $inc: { saves: -1 } });
};
