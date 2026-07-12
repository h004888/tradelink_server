import mongoose from 'mongoose';
import { Listing } from '../models/listing.model';
import { Category } from '../models/category.model';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tradelink';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Lấy tất cả category string duy nhất từ listings
  const distinctCategories: string[] = await Listing.distinct('category', { status: 'active' });
  console.log(`Found ${distinctCategories.length} distinct categories in listings:`, distinctCategories);

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (let i = 0; i < distinctCategories.length; i++) {
    const name = distinctCategories[i];
    if (!name || name.includes('�')) {
      console.log(`  ⚠ Skipping invalid category name: "${name}"`);
      skipped++;
      continue;
    }

    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Upsert category
    const cat = await Category.findOneAndUpdate(
      { slug },
      { $setOnInsert: { name, slug, icon: 'grid_view_rounded', order: i, isActive: true } },
      { upsert: true, new: true }
    );

    if (cat.createdAt.getTime() === cat.updatedAt.getTime()) {
      created++;
    } else {
      console.log(`  → Category exists: ${name} (${slug})`);
      skipped++;
    }

    // Cập nhật listing.categoryId
    const result = await Listing.updateMany(
      { category: name, categoryId: { $exists: false } },
      { $set: { categoryId: cat._id } }
    );
    if (result.modifiedCount > 0) {
      updated += result.modifiedCount;
      console.log(`  ✓ ${name}: updated ${result.modifiedCount} listings`);
    }
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}, Listings updated: ${updated}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
