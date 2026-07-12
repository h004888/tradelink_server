import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Category } from '../models/category.model';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tradelink';

interface CategoryNode {
  name: string;
  slug: string;
  parentSlug: string | null;
  googleId: number;
  order: number;
  children: CategoryNode[];
}

/**
 * Parse Google Product Taxonomy file
 * Format: "ID - Category > Subcategory > Subsubcategory"
 */
function parseTaxonomy(filePath: string): CategoryNode[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));

  const rootMap = new Map<string, CategoryNode>();
  const slugMap = new Map<string, CategoryNode>(); // full path slug -> node

  lines.forEach(line => {
    const match = line.match(/^(\d+)\s*-\s*(.+)$/);
    if (!match) return;

    const googleId = parseInt(match[1], 10);
    const fullPath = match[2].trim();
    const parts = fullPath.split(' > ');

    const slug = parts
      .map(p => p.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
      .join('__');

    const parentParts = parts.slice(0, -1);
    const parentSlug = parentParts.length > 0
      ? parentParts.map(p => p.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')).join('__')
      : null;

    const node: CategoryNode = {
      name: parts[parts.length - 1],
      slug,
      parentSlug,
      googleId,
      order: 0,
      children: [],
    };

    slugMap.set(slug, node);

    if (!parentSlug) {
      rootMap.set(slug, node);
    }
  });

  // Link children
  slugMap.forEach((node) => {
    if (node.parentSlug) {
      const parent = slugMap.get(node.parentSlug);
      if (parent) {
        parent.children.push(node);
      } else {
        // Orphan - add as root
        rootMap.set(node.slug, node);
      }
    }
  });

  // Assign order numbers (DFS)
  let counter = 0;
  function assignOrder(nodes: CategoryNode[]) {
    nodes.forEach(node => {
      node.order = counter++;
      if (node.children.length > 0) {
        assignOrder(node.children);
      }
    });
  }
  assignOrder(Array.from(rootMap.values()));

  // Flatten
  const flat: CategoryNode[] = [];
  function flatten(nodes: CategoryNode[]) {
    nodes.forEach(node => {
      flat.push(node);
      if (node.children.length > 0) flatten(node.children);
    });
  }
  flatten(Array.from(rootMap.values()));

  return flat;
}

/**
 * Import categories into MongoDB
 */
async function seedCategories() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Drop existing categories (optional - comment out to keep existing)
  // await Category.deleteMany({});
  // console.log('🗑️  Cleared existing categories');

  const filePath = path.resolve(__dirname, '../../data/google-taxonomy-en.txt');
  console.log(`📖 Reading taxonomy from: ${filePath}`);

  const nodes = parseTaxonomy(filePath);
  console.log(`📊 Parsed ${nodes.length} categories from Google Taxonomy`);

  const slugToId = new Map<string, mongoose.Types.ObjectId>();
  let created = 0;
  let skipped = 0;

  // Insert in order (parents before children)
  // Nodes are already flattened in DFS order
  for (const node of nodes) {
    const parentId = node.parentSlug ? slugToId.get(node.parentSlug) : undefined;

    const existing = await Category.findOne({ slug: node.slug });
    if (existing) {
      // Update if parent changed
      if (parentId && !existing.parentId?.equals(parentId)) {
        existing.parentId = parentId;
        await existing.save();
      }
      slugToId.set(node.slug, existing._id as mongoose.Types.ObjectId);
      skipped++;
      continue;
    }

    const cat = await Category.create({
      name: node.name,
      slug: node.slug,
      icon: getIconForCategory(node.name),
      parentId,
      order: node.order,
      isActive: true,
    });

    slugToId.set(node.slug, cat._id as mongoose.Types.ObjectId);
    created++;

    if (created % 1000 === 0) {
      console.log(`   📝 Created ${created} categories...`);
    }
  }

  console.log(`\n✅ Done! Created: ${created}, Skipped (already exist): ${skipped}`);
  console.log(`📊 Total categories in DB: ${await Category.countDocuments()}`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

/**
 * Pick a suitable icon based on category name
 */
function getIconForCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('electronic') || lower.includes('computer') || lower.includes('phone') || lower.includes('camera'))
    return 'devices_rounded';
  if (lower.includes('cloth') || lower.includes('apparel') || lower.includes('shoe') || lower.includes('fashion'))
    return 'checkroom_rounded';
  if (lower.includes('food') || lower.includes('beverage') || lower.includes('drink'))
    return 'restaurant_rounded';
  if (lower.includes('furniture') || lower.includes('home') || lower.includes('garden') || lower.includes('kitchen'))
    return 'home_rounded';
  if (lower.includes('sport') || lower.includes('fitness') || lower.includes('exercise'))
    return 'fitness_center_rounded';
  if (lower.includes('toy') || lower.includes('game') || lower.includes('baby'))
    return 'toys_rounded';
  if (lower.includes('book') || lower.includes('media') || lower.includes('software'))
    return 'library_books_rounded';
  if (lower.includes('car') || lower.includes('vehicle') || lower.includes('auto'))
    return 'directions_car_rounded';
  if (lower.includes('health') || lower.includes('beauty') || lower.includes('cosmetic'))
    return 'spa_rounded';
  if (lower.includes('pet') || lower.includes('animal'))
    return 'pets_rounded';
  if (lower.includes('art') || lower.includes('craft') || lower.includes('music'))
    return 'palette_rounded';
  if (lower.includes('luggage') || lower.includes('bag'))
    return 'backpack_rounded';
  if (lower.includes('office') || lower.includes('stationery'))
    return 'work_rounded';
  if (lower.includes('jewelry') || lower.includes('watch'))
    return 'diamond_rounded';
  return 'grid_view_rounded';
}

seedCategories().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
