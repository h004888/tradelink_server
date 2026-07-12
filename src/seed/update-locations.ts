import mongoose from 'mongoose';
import { Listing } from '../models/listing.model';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tradelink';

// Location mapping theo category
const LOCATION_MAP: Record<string, string> = {
  'womens-watches': 'Quận 1, TP.HCM',
  'womens-shoes': 'Quận 3, TP.HCM',
  'womens-jewellery': 'Quận 7, TP.HCM',
  'womens-bags': 'Quận Bình Thạnh, TP.HCM',
  'womens-dresses': 'Quận Tân Bình, TP.HCM',
  'mens-shirts': 'Quận 10, TP.HCM',
  'mens-shoes': 'Quận Phú Nhuận, TP.HCM',
  'mens-watches': 'Quận Gò Vấp, TP.HCM',
  'laptops': 'Quận 2, TP.HCM',
  'smartphones': 'Quận Thủ Đức, TP.HCM',
  'tablets': 'Quận 5, TP.HCM',
  'mobile-accessories': 'Quận 11, TP.HCM',
  'motorcycle': 'Quận Tân Phú, TP.HCM',
  'vehicle': 'Hà Nội',
  'furniture': 'Đà Nẵng',
  'groceries': 'Quận 4, TP.HCM',
  'beauty': 'Quận Bình Thạnh, TP.HCM',
  'fragrances': 'Quận 1, TP.HCM',
  'home-decoration': 'Quận 7, TP.HCM',
  'kitchen-accessories': 'Quận 3, TP.HCM',
  'sports-accessories': 'Quận Tân Bình, TP.HCM',
  'sunglasses': 'Quận 1, TP.HCM',
  'skin-care': 'Quận Phú Nhuận, TP.HCM',
};

async function updateLocations() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Update each listing individually
  const listings = await Listing.find({ location: { $exists: false } });
  let updated = 0;

  for (const listing of listings) {
    const location = LOCATION_MAP[listing.category] || 'TP.HCM';
    await Listing.updateOne({ _id: listing._id }, { $set: { location } });
    updated++;
  }

  console.log(`✅ Updated ${updated} listings with location`);

  // Verify
  const withLocation = await Listing.countDocuments({ location: { $exists: true } });
  const total = await Listing.countDocuments();
  console.log(`📊 Total listings: ${total}`);
  console.log(`📊 With location: ${withLocation}`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

updateLocations().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
