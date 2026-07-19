import { Router } from 'express';
import { createOffer, getOffers, respondOffer } from '../controllers/offer.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/', createOffer);
router.get('/', getOffers);
router.patch('/:id/respond', respondOffer);

export default router;
