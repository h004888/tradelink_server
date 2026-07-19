import { Request, Response, NextFunction } from 'express';
import * as listingService from '../services/listing.service';
import { AuthRequest } from '../middlewares/auth';
import { User } from '../models/user.model';

export const getListings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sort = req.query.sort as string;
    const validSorts = ['boosted', 'newest', 'popular', 'nearby'];
    const result = await listingService.findAll({
      sort: validSorts.includes(sort) ? sort as 'boosted' | 'newest' | 'popular' | 'nearby' : undefined,
      status: req.query.status as string,
      type: req.query.type as string,
      category: req.query.category as string,
      categoryId: req.query.categoryId as string,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      lat: req.query.lat ? Number(req.query.lat) : undefined,
      lng: req.query.lng ? Number(req.query.lng) : undefined,
      radius: req.query.radius ? Number(req.query.radius) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const getMyListings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listings = await listingService.findMyListings(req.user!.id, req.query.status as string);
    res.json({ success: true, data: listings });
  } catch (err) { next(err); }
};

export const getDrafts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listings = await listingService.findDrafts(req.user!.id);
    res.json({ success: true, data: listings });
  } catch (err) { next(err); }
};

export const getListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listing = await listingService.findById(req.params.id as string);
    res.json({ success: true, data: listing });
  } catch (err) { next(err); }
};

export const createListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const seller = await User.findById(req.user!.id).select('fullName');
    const listing = await listingService.create({ ...req.body, sellerId: req.user!.id, sellerName: seller?.fullName || 'Unknown' });
    res.status(201).json({ success: true, data: listing });
  } catch (err) { next(err); }
};

export const updateListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listing = await listingService.update(req.params.id as string, req.user!.id, req.body);
    res.json({ success: true, data: listing });
  } catch (err) { next(err); }
};

export const deleteListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await listingService.remove(req.params.id as string, req.user!.id);
    res.json({ success: true, message: 'Xoá tin đăng thành công' });
  } catch (err) { next(err); }
};

export const boostListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { days } = req.body;
    const listing = await listingService.boost(req.params.id as string, req.user!.id, days);
    res.json({ success: true, data: listing });
  } catch (err) { next(err); }
};
