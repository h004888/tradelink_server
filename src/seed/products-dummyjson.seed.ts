import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Listing } from '../models/listing.model';
import { User } from '../models/user.model';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tradelink';

interface DummyProduct {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  tags: string[];
  brand?: string;
  images: string[];
  thumbnail: string;
}

async function seedDummyProducts() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // Create or get demo seller
  let seller = await User.findOne({ email: 'demo-seller@tradelink.dev' });
  if (!seller) {
    seller = await User.create({
      email: 'demo-seller@tradelink.dev',
      name: 'Demo Seller',
      role: 'seller',
      isVerified: true,
      reputationScore: 85,
      totalTransactions: 150,
      successRate: 98,
    });
    console.log('👤 Created demo seller');
  }

  // Read DummyJSON data
  const filePath = path.resolve(__dirname, '../../data/dummyjson-products.json');
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const products: DummyProduct[] = raw.products;
  console.log(`📦 ${products.length} products from DummyJSON\n`);

  let created = 0;
  let skipped = 0;
  let totalImages = 0;

  for (const p of products) {
    // Skip if already exists
    const existing = await Listing.findOne({
      title: p.title,
      sellerId: seller._id,
    });
    if (existing) {
      skipped++;
      continue;
    }

    const priceVND = Math.round(p.price * 25000); // Convert USD to VND

    await Listing.create({
      title: p.title.substring(0, 200),
      description: p.description.substring(0, 2000),
      price: priceVND,
      imageUrls: p.images.slice(0, 5),
      category: p.category,
      categoryId: undefined, // can be matched later
      condition: p.title.toLowerCase().includes('new') ? 'new' : 'used',
      type: 'sale',
      status: 'active',
      sellerId: seller._id,
      sellerName: seller.name,
      views: Math.floor(Math.random() * 500),
      interests: Math.floor(Math.random() * 50),
      saves: Math.floor(Math.random() * 80),
    });

    totalImages += p.images.length;
    created++;

    if (created % 50 === 0) {
      console.log(`   📝 ${created}/${products.length} listings created...`);
    }
  }

  console.log(`\n✅ Done! Created: ${created}, Skipped: ${skipped}`);
  console.log(`🖼️  Total images imported: ${totalImages}`);
  console.log(`📊 Total listings from demo seller: ${await Listing.countDocuments({ sellerId: seller._id })}`);

  // Show a few categories covered
  const cats = await Listing.distinct('category', { sellerId: seller._id });
  console.log(`🏷️  Categories: ${cats.join(', ')}`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

seedDummyProducts().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
