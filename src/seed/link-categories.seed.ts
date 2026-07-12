import mongoose from 'mongoose';
import { Category } from '../models/category.model';
import { Listing } from '../models/listing.model';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tradelink';

// Mapping: DummyJSON slug → { name (Vietnamese), icon (Material Design), location }
const CATEGORY_MAP: Record<string, { name: string; icon: string; location: string }> = {
  'beauty':              { name: 'Làm đẹp',              icon: 'spa_rounded',              location: 'Quận Bình Thạnh, TP.HCM' },
  'fragrances':          { name: 'Nước hoa',             icon: 'local_florist_rounded',    location: 'Quận 1, TP.HCM' },
  'furniture':           { name: 'Nội thất',             icon: 'chair_rounded',            location: 'Đà Nẵng' },
  'groceries':           { name: 'Tạp hóa',              icon: 'shopping_basket_rounded',  location: 'Quận 4, TP.HCM' },
  'home-decoration':     { name: 'Trang trí nhà',        icon: 'decorative_services_rounded', location: 'Quận 7, TP.HCM' },
  'kitchen-accessories': { name: 'Phụ kiện bếp',         icon: 'kitchen_rounded',          location: 'Quận 3, TP.HCM' },
  'laptops':             { name: 'Laptop',               icon: 'laptop_mac_rounded',       location: 'Quận 2, TP.HCM' },
  'mens-shirts':         { name: 'Áo nam',               icon: 'checkroom_rounded',        location: 'Quận 10, TP.HCM' },
  'mens-shoes':          { name: 'Giày nam',             icon: 'directions_walk_rounded',  location: 'Quận Phú Nhuận, TP.HCM' },
  'mens-watches':        { name: 'Đồng hồ nam',          icon: 'watch_rounded',            location: 'Quận Gò Vấp, TP.HCM' },
  'mobile-accessories':  { name: 'Phụ kiện điện thoại',  icon: 'phone_android_rounded',    location: 'Quận 11, TP.HCM' },
  'motorcycle':          { name: 'Xe máy',               icon: 'two_wheeler_rounded',      location: 'Quận Tân Phú, TP.HCM' },
  'skin-care':           { name: 'Chăm sóc da',          icon: 'face_retouching_natural_rounded', location: 'Quận Phú Nhuận, TP.HCM' },
  'smartphones':         { name: 'Điện thoại',           icon: 'smartphone_rounded',       location: 'Quận Thủ Đức, TP.HCM' },
  'sports-accessories':  { name: 'Phụ kiện thể thao',    icon: 'sports_rounded',           location: 'Quận Tân Bình, TP.HCM' },
  'sunglasses':          { name: 'Kính mát',             icon: 'visibility_rounded',       location: 'Quận 1, TP.HCM' },
  'tablets':             { name: 'Máy tính bảng',        icon: 'tablet_mac_rounded',       location: 'Quận 5, TP.HCM' },
  'tops':                { name: 'Áo nữ',                icon: 'checkroom_rounded',        location: 'Quận Tân Bình, TP.HCM' },
  'vehicle':             { name: 'Xe cộ',                icon: 'directions_car_rounded',   location: 'Hà Nội' },
  'womens-bags':         { name: 'Túi xách nữ',         icon: 'shopping_bag_rounded',     location: 'Quận Bình Thạnh, TP.HCM' },
  'womens-dresses':      { name: 'Váy đầm nữ',           icon: 'checkroom_rounded',        location: 'Quận Tân Bình, TP.HCM' },
  'womens-jewellery':    { name: 'Trang sức nữ',         icon: 'diamond_rounded',          location: 'Quận 7, TP.HCM' },
  'womens-shoes':        { name: 'Giày nữ',              icon: 'directions_walk_rounded',  location: 'Quận 3, TP.HCM' },
  'womens-watches':      { name: 'Đồng hồ nữ',           icon: 'watch_rounded',            location: 'Quận 1, TP.HCM' },
};

async function linkCategories() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // Step 1: Delete old/unused categories
  const oldSeed = await Category.deleteMany({
    name: { $in: ['Laptop', 'Máy ảnh', 'Phụ kiện', 'Sách', 'Thể thao', 'Thời trang', 'Xe cộ', 'Điện thoại', 'Đồ gia dụng'] }
  });
  console.log(`🗑️  Xóa ${oldSeed.deletedCount} old seed categories`);

  const googleTaxonomy = await Category.deleteMany({
    $or: [
      { name: { $regex: /\s>\s/ } },          // có dấu " > " (nested path)
      { name: { $in: [                         // Google root categories
        'Animals & Pet Supplies', 'Apparel & Accessories', 'Arts & Entertainment',
        'Baby & Toddler', 'Business & Industrial', 'Cameras & Optics',
        'Electronics', 'Food, Beverages & Tobacco', 'Furniture', 'Hardware',
        'Health & Beauty', 'Home & Garden', 'Luggage & Bags', 'Mature',
        'Media', 'Office Supplies', 'Religious & Ceremonial', 'Software',
        'Sporting Goods', 'Toys & Games', 'Vehicles & Parts'
      ]}}
    ]
  });
  console.log(`🗑️  Xóa ${googleTaxonomy.deletedCount} Google Taxonomy categories`);

  const afterDelete = await Category.countDocuments();
  console.log(`📦 Còn lại ${afterDelete} categories\n`);

  // Step 2: Create/update 24 DummyJSON categories
  const slugToId = new Map<string, mongoose.Types.ObjectId>();
  let created = 0;

  for (const [slug, { name, icon, location }] of Object.entries(CATEGORY_MAP)) {
    const cat = await Category.findOneAndUpdate(
      { slug },
      {
        $set: { name, icon },
        $setOnInsert: { slug, isActive: true, order: created }
      },
      { upsert: true, new: true }
    );
    slugToId.set(slug, cat._id as mongoose.Types.ObjectId);
    created++;
    console.log(`  ✅ ${name} (${slug})`);
  }

  console.log(`\n📝 ${created} categories ready\n`);

  // Step 3: Link categoryId + location to all listings
  const listings = await Listing.find({});
  let linked = 0;
  let notFound = 0;

  for (const listing of listings) {
    const catSlug = listing.category;
    const catData = CATEGORY_MAP[catSlug];

    if (catData) {
      const catId = slugToId.get(catSlug);
      if (catId) listing.categoryId = catId;
      if (!listing.location) listing.location = catData.location;
      await listing.save();
      linked++;
    } else {
      notFound++;
    }
  }

  console.log(`✅ Done!`);
  console.log(`   Linked: ${linked}/${listings.length} listings`);
  console.log(`   Not found category: ${notFound}`);

  // Verify
  const withCategoryId = await Listing.countDocuments({ categoryId: { $exists: true, $ne: null } });
  console.log(`\n📊 Verification:`);
  console.log(`   Total listings: ${await Listing.countDocuments()}`);
  console.log(`   With categoryId: ${withCategoryId}`);
  console.log(`   Categories in DB: ${await Category.countDocuments()}`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

linkCategories().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
