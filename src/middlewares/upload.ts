import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from '../utils/AppError';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Multer storage config — lưu file vào thư mục `uploads/` với tên random.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    const stamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    cb(null, `img-${stamp}-${rand}${safeExt}`);
  },
});

/**
 * Chỉ chấp nhận file ảnh, giới hạn 5MB / file, tối đa 8 file / request.
 */
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new AppError(`Định dạng ${file.mimetype} không hỗ trợ. Chỉ chấp nhận jpg/png/webp/gif.`, 400));
  }
  cb(null, true);
};

/**
 * Middleware upload một ảnh đơn (field name = `image`, max 5MB).
 */
export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('image');

/**
 * Middleware upload nhiều ảnh (field name = `images`, max 8 file, mỗi file 5MB).
 */
export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
}).array('images', 8);

/**
 * Chuẩn hoá URL public cho file đã upload — ghép base URL từ request.
 */
export const buildPublicUrl = (req: Request, filename: string): string => {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const host = req.headers.host;
  return `${proto}://${host}/uploads/${filename}`;
};
