// Script tạm: liệt kê collections + sample users để kiểm tra DB
const mongoose = require('mongoose');
const uri = process.env.DATABASE_URL || 'mongodb://localhost:27017/tradelink';

(async () => {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;
    const cols = await db.listCollections().toArray();
    console.log('=== Collections ===');
    console.log(cols.map(c => c.name).join(', '));

    for (const name of ['users', 'admins', 'otps']) {
      try {
        const cnt = await db.collection(name).countDocuments();
        console.log(`\n=== ${name} (${cnt} docs) ===`);
        if (cnt > 0) {
          // ẩn password/secret fields nếu có
          const docs = await db.collection(name).find().limit(5).project({ password: 0, otpHash: 0 }).toArray();
          console.log(JSON.stringify(docs, null, 2));
        }
      } catch (e) {
        console.log(`${name}: ${e.message}`);
      }
    }

    await mongoose.disconnect();
  } catch (e) {
    console.error('FATAL:', e.message);
    process.exit(1);
  }
})();