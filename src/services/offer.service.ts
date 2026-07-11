import { Offer, IOffer } from '../models/offer.model';
import { Listing } from '../models/listing.model';

export const create = async (data: Partial<IOffer>): Promise<IOffer> => {
  return Offer.create(data);
};

export const findByListing = async (listingId: string) => {
  return Offer.find({ listingId }).sort({ createdAt: -1 }).populate('buyerId', 'name phone');
};

export const findByBuyer = async (buyerId: string) => {
  return Offer.find({ buyerId }).sort({ createdAt: -1 }).populate('listingId', 'title price');
};

/**
 * Lấy tất cả offers nhận được trên các listing của user (seller-side).
 * Áp dụng khi user xem "Offers nhận được" trong app.
 */
export const findReceivedBySeller = async (sellerId: string) => {
  // Tìm các listing thuộc seller
  const listings = await Listing.find({ sellerId }).select('_id');
  const listingIds = listings.map((l) => l._id);
  return Offer.find({ listingId: { $in: listingIds } })
    .sort({ createdAt: -1 })
    .populate('buyerId', 'name phone')
    .populate('listingId', 'title price');
};
