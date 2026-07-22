import { Request, Response, NextFunction } from 'express';
import * as searchService from '../services/search.service';

export const search = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await searchService.search({
      q: req.query.q as string,
      type: req.query.type as string,
      category: req.query.category as string,
      categoryId: req.query.categoryId as string,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      sort: req.query.sort as string,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const home = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid page or limit parameter',
      });
    }

    const data = await searchService.getHome(page, limit);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const feed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid page or limit parameter',
      });
    }

    const filters = {
      type: req.query.type as string,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      condition: req.query.condition as string,
      sort: req.query.sort as string,
    };

    const data = await searchService.getFeed(page, limit, filters);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const suggestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.q as string || '';
    const data = await searchService.getSuggestions(query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const popularSearches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const data = await searchService.getPopularSearches(limit);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const categories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await searchService.getCategories();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const getProvinces = async (_req: Request, res: Response) => {
  const provinces = [
    { id: 'hn', name: 'Hà Nội' },
    { id: 'hcm', name: 'Hồ Chí Minh' },
    { id: 'dn', name: 'Đà Nẵng' },
    { id: 'hp', name: 'Hải Phòng' },
    { id: 'ct', name: 'Cần Thơ' },
    { id: 'kh', name: 'Khánh Hòa' },
    { id: 'bd', name: 'Bình Dương' },
    { id: 'ddn', name: 'Đồng Nai' },
    { id: 'qni', name: 'Quảng Ninh' },
    { id: 'th', name: 'Thanh Hóa' },
    { id: 'na', name: 'Nghệ An' },
    { id: 'dl', name: 'Đắk Lắk' },
    { id: 'ag', name: 'An Giang' },
    { id: 'kg', name: 'Kiên Giang' },
    { id: 'cm', name: 'Cà Mau' },
  ];
  res.json({ success: true, data: provinces });
};

export const appConfig = async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      maintenance: false,
      minVersion: '1.0.0',
      features: { search: true, escrow: true, chat: true },
    },
  });
};

export const appStatus = async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { maintenance: false, maintenanceMessage: null },
  });
};
