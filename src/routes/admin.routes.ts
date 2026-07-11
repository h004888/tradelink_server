import { Router } from 'express';
import {
  getDashboard, getUsers, getTransactions,
  resolveDispute, getFlaggedListings,
  createUser, deleteUser, updateRole,
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.get('/transactions', getTransactions);
router.patch('/disputes/:id', resolveDispute);
router.get('/listings/flagged', getFlaggedListings);
// H6 — admin create/delete user
router.post('/users', createUser);
router.delete('/users/:id', deleteUser);
// H7 — admin promote/demote role
router.patch('/users/:id/role', updateRole);

export default router;
