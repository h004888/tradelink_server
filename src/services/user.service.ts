import { User, IUser } from "../models/user.model";
import { Listing } from "../models/listing.model";
import { AppError } from "../utils/AppError";

type UpdateProfilePayload = {
  fullName?: string;
  phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
};

type UpdateUserSettingsPayload = {
  settings?: {
    notifications?: boolean;
    language?: string;
  };
  hasSeenOnboarding?: boolean;
};

export const findById = async (id: string): Promise<IUser> => {
  const user = await User.findById(id).select("-passwordHash");
  if (!user) throw new AppError("Không tìm thấy người dùng", 404);
  return user;
};

export const findByEmail = async (email: string): Promise<IUser | null> => {
  return User.findOne({ email }).select("-passwordHash");
};

export const updateProfile = async (
  id: string,
  data: UpdateProfilePayload,
): Promise<IUser> => {
  const user = await User.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true },
  ).select("-passwordHash");
  if (!user) throw new AppError("Không tìm thấy người dùng", 404);
  return user;
};

export const updateAvatar = async (
  id: string,
  avatarUrl: string,
): Promise<IUser> => {
  const user = await User.findByIdAndUpdate(
    id,
    { $set: { avatarUrl } },
    { new: true },
  ).select("-passwordHash");
  if (!user) throw new AppError("Không tìm thấy người dùng", 404);
  return user;
};

export const updateSettings = async (
  id: string,
  data: UpdateUserSettingsPayload,
): Promise<IUser> => {
  const updateData: Record<string, unknown> = {};

  if (data.settings?.notifications !== undefined) {
    updateData["settings.notifications"] = data.settings.notifications;
  }
  if (data.settings?.language !== undefined) {
    updateData["settings.language"] = data.settings.language;
  }
  if (data.hasSeenOnboarding !== undefined) {
    updateData.hasSeenOnboarding = data.hasSeenOnboarding;
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true },
  ).select("-passwordHash");

  if (!user) throw new AppError("Không tìm thấy người dùng", 404);
  return user;
};

export const getTopSellers = async (limit = 6) => {
  return Listing.aggregate([
    { $match: { status: "active" } },
    {
      $group: {
        _id: "$sellerId",
        sellerName: { $first: "$sellerName" },
        totalListings: { $sum: 1 },
        totalViews: { $sum: "$views" },
      },
    },
    { $sort: { totalViews: -1 } },
    { $limit: limit },
  ]);
};

export const getUserStats = async (userId: string) => {
  const user = await User.findById(userId).select(
    "fullName rating totalTransactions totalReviews responseTime",
  );
  if (!user) throw new AppError("Không tìm thấy người dùng", 404);

  return {
    sellerId: user._id,
    sellerName: user.fullName,
    rating: user.rating || 0,
    totalTransactions: user.totalTransactions || 0,
    totalReviews: user.totalReviews || 0,
    responseTime: user.responseTime || "Chưa có",
  };
};

/**
 * GET /users/:id/profile — Public profile cho Seller Profile screen.
 * Trả về thông tin người bán + danh sách tin đang active.
 */
export const getPublicProfile = async (userId: string) => {
  const user = await User.findById(userId).select("-passwordHash");
  if (!user) throw new AppError("Không tìm thấy người dùng", 404);

  const [activeListings, totalActive] = await Promise.all([
    Listing.find({ sellerId: userId, status: "active" })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("title price imageUrls"),
    Listing.countDocuments({ sellerId: userId, status: "active" }),
  ]);

  return {
    _id: user._id,
    name: user.fullName,
    avatarUrl: user.avatarUrl,
    isVerified: user.isVerified || false,
    completedTransactions: user.totalTransactions || 0,
    successRate: user.successRate || 100,
    rating: user.rating || 0,
    responseTime: user.responseTime || "Chưa có",
    shipOnTimeRate: null, // Chưa implement tracking vận chuyển
    memberSince: user.memberSince,
    activeListings: totalActive,
    listings: activeListings.map((l) => ({
      _id: l._id,
      title: l.title,
      price: l.price?.toString() ?? "0",
      priceFormatted:
        l.price != null ? `${l.price.toLocaleString("vi-VN")}₫` : "0₫",
      imageUrl: l.imageUrls?.length > 0 ? l.imageUrls[0] : null,
    })),
  };
};
