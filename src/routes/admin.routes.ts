import { Router } from 'express';
import {
  getDashboard, getUsers, getTransactions,
  resolveDispute, getFlaggedListings, moderateListing,
  createUser, deleteUser, updateRole,
  getWalletOverview, getWithdrawals, approveWithdrawal, rejectWithdrawal,
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { rejectWithdrawalSchema } from './wallet.schema';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.get('/transactions', getTransactions);
router.get('/wallet/overview', getWalletOverview);
router.get('/wallet/withdrawals', getWithdrawals);
router.patch('/wallet/withdrawals/:id/approve', approveWithdrawal);
router.patch('/wallet/withdrawals/:id/reject', validate(rejectWithdrawalSchema), rejectWithdrawal);
router.patch('/disputes/:id', resolveDispute);
router.get('/listings/flagged', getFlaggedListings);
router.patch('/listings/:id/moderate', moderateListing);
// H6 — admin create/delete user
router.post('/users', createUser);
router.delete('/users/:id', deleteUser);
// H7 — admin promote/demote role
router.patch('/users/:id/role', updateRole);

export default router;
