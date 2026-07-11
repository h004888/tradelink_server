import { Router } from 'express';
import { createOffer, getOffers } from '../controllers/offer.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/', createOffer);
router.get('/', getOffers);

export default router;
