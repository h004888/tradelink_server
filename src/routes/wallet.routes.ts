import { Router } from 'express';
import { getMyWallet, getMyLedger, getMyWithdrawals, requestWithdrawal } from '../controllers/wallet.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { requestWithdrawalSchema } from './wallet.schema';

const router = Router();

router.use(authenticate);

router.get('/', getMyWallet);
router.get('/ledger', getMyLedger);
router.get('/withdrawals', getMyWithdrawals);
router.post('/withdrawals', validate(requestWithdrawalSchema), requestWithdrawal);

export default router;
