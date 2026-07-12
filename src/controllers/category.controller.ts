import { Request, Response } from 'express';
import * as categoryService from '../services/category.service';

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await categoryService.getAll();
    res.json({ success: true, data: categories });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCategory = async (req: Request, res: Response) => {
  try {
    const cat = await categoryService.getById(req.params.id as string);
    if (!cat) return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    res.json({ success: true, data: cat });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const cat = await categoryService.create(req.body);
    res.status(201).json({ success: true, data: cat });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const cat = await categoryService.update(req.params.id as string, req.body);
    if (!cat) return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    res.json({ success: true, data: cat });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const cat = await categoryService.remove(req.params.id as string);
    if (!cat) return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    res.json({ success: true, data: cat });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
