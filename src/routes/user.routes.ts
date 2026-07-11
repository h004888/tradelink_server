import { Router } from 'express';
import { getUser, updateUser, updateAvatar, getTopSellers } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth';
import { uploadSingle } from '../middlewares/upload';

const router = Router();

router.get('/top-sellers', getTopSellers);
router.get('/:id', getUser);
router.patch('/:id', authenticate, updateUser);
router.put('/:id/avatar', authenticate, uploadSingle, updateAvatar);

export default router;
