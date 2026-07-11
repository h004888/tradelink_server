import { Router } from 'express';
import { create, getByTransaction } from '../controllers/dispute.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/', create);
router.get('/:transactionId', getByTransaction);

export default router;
