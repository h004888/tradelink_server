import { Schema, model } from 'mongoose';

/**
 * Lưu tần suất tìm kiếm để tính "Tìm kiếm phổ biến" từ dữ liệu thật,
 * thay vì danh sách hardcode ở client.
 */
const searchLogSchema = new Schema(
  {
    query: { type: String, required: true, unique: true }, // normalized (lowercase, trimmed) — khóa gộp
    label: { type: String, required: true }, // chữ hiển thị (giữ nguyên hoa/thường lần tìm gần nhất)
    count: { type: Number, default: 1 },
    lastSearchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

searchLogSchema.index({ count: -1, lastSearchedAt: -1 });

export const SearchLog = model('SearchLog', searchLogSchema);
