import { Category, ICategory } from '../models/category.model';

export const getAll = async (): Promise<ICategory[]> => {
  return Category.find({ isActive: true }).sort({ order: 1 });
};

export const getById = async (id: string): Promise<ICategory | null> => {
  return Category.findById(id);
};

export const create = async (data: {
  name: string;
  icon?: string;
  parentId?: string;
  order?: number;
}): Promise<ICategory> => {
  const slug = data.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return Category.create({
    name: data.name,
    slug,
    icon: data.icon || 'grid_view_rounded',
    parentId: data.parentId || undefined,
    order: data.order ?? 0,
    isActive: true,
  });
};

export const update = async (
  id: string,
  data: { name?: string; icon?: string; parentId?: string; order?: number; isActive?: boolean }
): Promise<ICategory | null> => {
  const updateData: any = { ...data };
  if (data.name) {
    updateData.slug = data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  return Category.findByIdAndUpdate(id, updateData, { new: true });
};

export const remove = async (id: string): Promise<ICategory | null> => {
  return Category.findByIdAndDelete(id);
};
