import { Router } from 'express';
import { getAll, check, add, remove } from '../controllers/watchlist.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAll);
router.get('/check/:listingId', check);
router.post('/', add);
router.delete('/:listingId', remove);

export default router;
