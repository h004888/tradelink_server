// Reset password cho seller@example.com (admin) → Test1234!
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const uri = process.env.DATABASE_URL || 'mongodb://localhost:27017/tradelink';
const EMAIL = 'seller@example.com';
const NEW_PASSWORD = 'Test1234!';

(async () => {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;

    // 1. Hash password
    const hash = bcrypt.hashSync(NEW_PASSWORD, 10);
    console.log('Hashed:', hash.substring(0, 20) + '...');

    // 2. Verify user tồn tại
    const before = await db.collection('users').findOne(
      { email: EMAIL },
      { projection: { email: 1, role: 1, name: 1 } }
    );
    if (!before) {
      console.error('User not found:', EMAIL);
      process.exit(1);
    }
    console.log('Before:', JSON.stringify(before));

    // 3. Update
    const result = await db.collection('users').updateOne(
      { email: EMAIL },
      { $set: { passwordHash: hash, updatedAt: new Date() } }
    );
    console.log('Update result:', JSON.stringify(result));

    // 4. Verify sau update
    const after = await db.collection('users').findOne(
      { email: EMAIL },
      { projection: { email: 1, role: 1, name: 1, passwordHash: 1 } }
    );
    const verifyOk = await bcrypt.compare(NEW_PASSWORD, after.passwordHash);
    console.log('After:', { email: after.email, role: after.role, name: after.name });
    console.log('Password verify:', verifyOk ? '✅ OK' : '❌ FAIL');

    await mongoose.disconnect();
  } catch (e) {
    console.error('FATAL:', e.message);
    process.exit(1);
  }
})();