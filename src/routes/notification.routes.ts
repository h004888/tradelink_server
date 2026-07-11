import { Router } from 'express';
import { getAll, markRead, markAllRead, getUnreadCount } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/unread-count', authenticate, getUnreadCount);
router.use(authenticate);

router.get('/', getAll);
router.patch('/:id/read', markRead);
router.patch('/read-all', markAllRead);

export default router;
