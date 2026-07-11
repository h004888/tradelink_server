import { Router } from 'express';
import {
  getListings, getMyListings, getDrafts, getListing,
  createListing, updateListing, deleteListing, boostListing,
} from '../controllers/listing.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/', getListings);
router.get('/my', authenticate, getMyListings);
router.get('/drafts', authenticate, getDrafts);
router.get('/:id', getListing);
router.post('/', authenticate, createListing);
router.put('/:id', authenticate, updateListing);
router.delete('/:id', authenticate, deleteListing);
router.post('/:id/boost', authenticate, boostListing);

export default router;
