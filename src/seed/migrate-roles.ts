import mongoose from 'mongoose';
import { User } from '../models/user.model';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tradelink';

/**
 * Gộp role 'buyer'/'seller' cũ về 'user' — chạy 1 lần sau khi đổi User.role
 * từ enum ['buyer','seller','admin'] sang ['user','admin'].
 */
async function migrateRoles() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Cast query to `any` — 'buyer'/'seller' không còn nằm trong type IUser.role sau khi
  // đã đổi enum, nhưng dữ liệu cũ trong DB vẫn có thể mang giá trị này trước khi migrate.
  const res = await User.updateMany(
    { role: { $in: ['buyer', 'seller'] } } as any,
    { $set: { role: 'user' } }
  );
  console.log(`✅ Migrated ${res.modifiedCount} user(s) to role 'user'`);

  const remaining = await User.countDocuments({ role: { $nin: ['user', 'admin'] } });
  console.log(`📊 Users with unexpected role còn lại: ${remaining}`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

migrateRoles().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
