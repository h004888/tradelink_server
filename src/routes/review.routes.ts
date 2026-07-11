import { Router } from 'express';
import { create, getByUser } from '../controllers/review.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/', authenticate, create);
router.get('/user/:userId', getByUser);

export default router;
