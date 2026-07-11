import { Request, Response, NextFunction } from 'express';
import * as offerService from '../services/offer.service';
import { AuthRequest } from '../middlewares/auth';

export const createOffer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const offer = await offerService.create({ ...req.body, buyerId: req.user!.id });
    res.status(201).json({ success: true, data: offer });
  } catch (err) { next(err); }
};

export const getOffers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listingId = req.query.listingId as string | undefined;
    const buyerId = req.query.buyerId as string | undefined;
    const scope = (req.query.scope as string | undefined) ?? 'sent';
    let data: any[] = [];
    if (listingId) data = await offerService.findByListing(listingId);
    else if (buyerId) data = await offerService.findByBuyer(buyerId);
    else if (scope === 'received') {
      // Offers nhận được (user là seller của listing)
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Cần đăng nhập' });
      data = await offerService.findReceivedBySeller(userId);
    }
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
