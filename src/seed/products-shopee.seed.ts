import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Listing } from '../models/listing.model';
import { User } from '../models/user.model';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tradelink';
const MAX_PRODUCTS = 200; // Limit seed products

interface ShopeeRow {
  title: string;
  sold: number;
  rating: number;
  reviews: number;
  initial_price: string;
  final_price: string;
  currency: string;
  stock: string;
  image: string;       // JSON array string
  seller_name: string;
  breadcrumb: string;  // JSON array string
  product_desc: string;
  brand: string;
}

/**
 * Parse Shopee CSV (handles quoted fields with commas)
 */
function parseCSV(filePath: string): ShopeeRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  if (lines.length < 2) return [];

  // Parse header
  const header = parseCSVLine(lines[0]);
  const titleIdx = header.indexOf('title');
  const soldIdx = header.indexOf('sold');
  const ratingIdx = header.indexOf('rating');
  const reviewsIdx = header.indexOf('reviews');
  const initPriceIdx = header.indexOf('initial_price');
  const finalPriceIdx = header.indexOf('final_price');
  const currencyIdx = header.indexOf('currency');
  const stockIdx = header.indexOf('stock');
  const imageIdx = header.indexOf('image');
  const sellerIdx = header.indexOf('seller_name');
  const breadcrumbIdx = header.indexOf('breadcrumb');
  const descIdx = header.indexOf('Product Description');
  const brandIdx = header.indexOf('brand');

  const rows: ShopeeRow[] = [];
  for (let i = 1; i < lines.length && rows.length < MAX_PRODUCTS; i++) {
    if (!lines[i].trim()) continue;
    try {
      const fields = parseCSVLine(lines[i]);
      rows.push({
        title: cleanText(fields[titleIdx] || ''),
        sold: parseInt(fields[soldIdx] || '0', 10),
        rating: parseFloat(fields[ratingIdx] || '0'),
        reviews: parseInt(fields[reviewsIdx] || '0', 10),
        initial_price: fields[initPriceIdx] || '0',
        final_price: fields[finalPriceIdx] || '0',
        currency: fields[currencyIdx] || 'USD',
        stock: fields[stockIdx] || '',
        image: fields[imageIdx] || '[]',
        seller_name: cleanText(fields[sellerIdx] || 'Unknown Seller'),
        breadcrumb: fields[breadcrumbIdx] || '[]',
        product_desc: cleanText(fields[descIdx] || '').substring(0, 2000),
        brand: cleanText(fields[brandIdx] || ''),
      });
    } catch {
      // Skip malformed lines
    }
  }
  return rows;
}

/**
 * Parse a single CSV line respecting quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields;
}

function cleanText(text: string): string {
  return text
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .trim();
}

/**
 * Parse image JSON array string to string array
 */
function parseImages(imageStr: string): string[] {
  try {
    const arr = JSON.parse(imageStr);
    if (Array.isArray(arr)) {
      return arr
        .filter((u: unknown) => typeof u === 'string')
        .map((u: string) => u.replace('_tn', '')); // remove thumbnail suffix
    }
  } catch {
    return [];
  }
  return [];
}

/**
 * Parse breadcrumb array, return top-level category
 */
function parseCategory(breadcrumbStr: string): string {
  try {
    const arr = JSON.parse(breadcrumbStr);
    if (Array.isArray(arr) && arr.length > 0) {
      return arr[arr.length - 1]; // most specific category
    }
  } catch {
    return 'Other';
  }
  return 'Other';
}

/**
 * Get a condition based on title keywords
 */
function getCondition(title: string): 'new' | 'likeNew' | 'used' {
  const lower = title.toLowerCase();
  if (lower.includes('new') || lower.includes('brand new') || lower.includes('mới')) return 'new';
  if (lower.includes('like new') || lower.includes('like-new') || lower.includes('như mới')) return 'likeNew';
  return 'used';
}

/**
 * Main seed function
 */
async function seedProducts() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Create or get demo seller
  let seller = await User.findOne({ email: 'demo-seller@tradelink.dev' });
  if (!seller) {
    seller = await User.create({
      email: 'demo-seller@tradelink.dev',
      fullName: 'Demo Seller',
      role: 'user',
      isVerified: true,
      reputationScore: 85,
      totalTransactions: 150,
      successRate: 98,
    });
    console.log('👤 Created demo seller account');
  } else {
    console.log('👤 Using existing demo seller');
  }

  // Parse CSV
  const filePath = path.resolve(__dirname, '../../data/shopee-products.csv');
  console.log(`📖 Reading products from: ${filePath}`);

  const rows = parseCSV(filePath);
  console.log(`📊 Parsed ${rows.length} products from CSV`);

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    // Skip rows without title
    if (!row.title || row.title.length < 3) continue;

    const existing = await Listing.findOne({ title: row.title, sellerId: seller._id });
    if (existing) {
      skipped++;
      continue;
    }

    const images = parseImages(row.image);
    const category = parseCategory(row.breadcrumb);
    const price = parseFloat(row.final_price) || 0;

    await Listing.create({
      title: row.title.substring(0, 200),
      description: row.product_desc || `${row.title} - ${row.brand || 'No brand'}. From Shopee marketplace.`,
      price: price > 0 ? Math.round(price) : undefined,
      imageUrls: images.slice(0, 5), // max 5 images
      category,
      condition: getCondition(row.title),
      type: 'sale',
      status: 'active',
      sellerId: seller._id,
      sellerName: seller.fullName,
      views: Math.floor(Math.random() * 200),
      interests: Math.floor(Math.random() * 20),
      saves: Math.floor(Math.random() * 30),
    });

    created++;
    if (created % 50 === 0) {
      console.log(`   📝 Created ${created} listings...`);
    }
  }

  console.log(`\n✅ Done! Products created: ${created}, Skipped: ${skipped}`);
  console.log(`📊 Total listings from demo seller: ${await Listing.countDocuments({ sellerId: seller._id })}`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

seedProducts().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
