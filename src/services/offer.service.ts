import { Offer, IOffer } from '../models/offer.model';
import { Listing } from '../models/listing.model';
import { Transaction } from '../models/transaction.model';
import { User } from '../models/user.model';
import { AppError } from '../utils/AppError';
import * as notificationService from './notification.service';
import { generatePaymentCode } from './transaction.service';

export const create = async (data: Partial<IOffer>): Promise<IOffer> => {
  return Offer.create(data);
};

/**
 * Seller chấp nhận/từ chối 1 offer.
 * Chấp nhận → tạo luôn Transaction (SALE dùng giá đã thương lượng, TRADE không có amount)
 * và đánh dấu listing đã bán/ẩn — thay vì buộc buyer phải bấm "Mua an toàn" lại với giá gốc.
 */
export const respond = async (offerId: string, actingUserId: string, accept: boolean) => {
  const offer = await Offer.findById(offerId);
  if (!offer) throw new AppError('Không tìm thấy đề nghị', 404);

  const listing = await Listing.findById(offer.listingId);
  if (!listing) throw new AppError('Không tìm thấy tin đăng', 404);
  if (listing.sellerId.toString() !== actingUserId) {
    throw new AppError('Chỉ người bán mới có quyền phản hồi đề nghị này', 403);
  }

  if (!accept) {
    // findOneAndUpdate với điều kiện status='pending' là atomic — tránh race condition
    // khi 2 request reject/accept cùng lúc đều "pass" qua check find+if riêng lẻ.
    const rejected = await Offer.findOneAndUpdate(
      { _id: offerId, status: 'pending' },
      { $set: { status: 'rejected' } },
      { new: true }
    );
    if (!rejected) throw new AppError('Đề nghị này đã được xử lý', 409);

    await notificationService.create({
      userId: offer.buyerId.toString(),
      type: 'offer',
      title: 'Đề nghị bị từ chối',
      body: `Người bán đã từ chối đề nghị của bạn cho "${listing.title}"`,
      relatedId: offer._id.toString(),
    }).catch((err) => console.error('Offer notification failed:', err));
    return { offer: rejected, transaction: null };
  }

  if (listing.status !== 'active') {
    throw new AppError('Tin đăng không còn khả dụng để chấp nhận đề nghị', 400);
  }

  // Claim offer trước khi tạo Transaction — đảm bảo chỉ 1 request accept thắng.
  const claimed = await Offer.findOneAndUpdate(
    { _id: offerId, status: 'pending' },
    { $set: { status: 'accepted' } },
    { new: true }
  );
  if (!claimed) throw new AppError('Đề nghị này đã được xử lý', 409);

  const transactionType = offer.type === 'trade' ? 'trade' : 'sale';
  const newListingStatus = transactionType === 'sale' ? 'sold' : 'hidden';

  // Claim listing atomic — nếu seller có 2 offer pending khác nhau trên cùng listing và
  // accept gần như đồng thời, chỉ 1 request được đi tiếp; request còn lại nhận lỗi rõ ràng
  // thay vì tạo ra 2 Transaction cho cùng 1 listing.
  const listingClaimed = await Listing.findOneAndUpdate(
    { _id: listing._id, status: 'active' },
    { $set: { status: newListingStatus } },
    { new: true }
  );
  if (!listingClaimed) {
    await Offer.findByIdAndUpdate(offerId, { $set: { status: 'pending' } });
    throw new AppError('Tin đăng không còn khả dụng để chấp nhận đề nghị', 400);
  }

  try {
    const buyer = await User.findById(offer.buyerId).select('fullName');

    const tx = await Transaction.create({
      type: transactionType,
      listingId: listing._id,
      listingTitle: listing.title,
      buyerId: offer.buyerId,
      buyerName: buyer?.fullName ?? 'Unknown',
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      amount: transactionType === 'sale' ? (offer.price ?? listing.price) : undefined,
      escrowStep: transactionType === 'sale' ? 'paymentPending' : undefined,
      paymentCode: transactionType === 'sale' ? generatePaymentCode() : undefined,
    });

    claimed.transactionId = tx._id as any;
    await claimed.save();

    await notificationService.create({
      userId: offer.buyerId.toString(),
      type: 'offer',
      title: 'Đề nghị được chấp nhận!',
      body: `Người bán đã chấp nhận đề nghị của bạn cho "${listing.title}"`,
      relatedId: tx._id.toString(),
    }).catch((err) => console.error('Offer notification failed:', err));

    return { offer: claimed, transaction: tx };
  } catch (err) {
    // Rollback cả offer lẫn listing nếu tạo Transaction thất bại giữa chừng — cho phép thử lại.
    await Offer.findByIdAndUpdate(offerId, { $set: { status: 'pending' } });
    await Listing.findByIdAndUpdate(listing._id, { $set: { status: 'active' } });
    throw err;
  }
};

export const findByListing = async (listingId: string) => {
  return Offer.find({ listingId }).sort({ createdAt: -1 }).populate('buyerId', 'fullName phone');
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
    .populate('buyerId', 'fullName phone')
    .populate('listingId', 'title price');
};
