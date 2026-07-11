import { Router } from 'express';
import {
  getTransactions, getTransaction, createTransaction,
  advanceEscrow, confirmTrade,
} from '../controllers/transaction.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getTransactions);
router.get('/:id', getTransaction);
router.post('/', createTransaction);
router.post('/:id/advance-escrow', advanceEscrow);
router.post('/:id/confirm', confirmTrade);

export default router;
