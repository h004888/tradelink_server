import { Router } from 'express';
import { getUser, updateUser, updateAvatar, updateSettings, getTopSellers, getUserStats, getPublicProfile } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth';
import { uploadSingle } from '../middlewares/upload';
import { validate } from '../middlewares/validate';
import { updateProfileSchema, updateUserSettingsSchema } from './user.schema';

const router = Router();

router.get('/top-sellers', getTopSellers);
router.put('/profile', authenticate, validate(updateProfileSchema), updateUser);
router.put('/profile/avatar', authenticate, uploadSingle, updateAvatar);
router.put('/settings', authenticate, validate(updateUserSettingsSchema), updateSettings);
router.get('/:id/stats', getUserStats);
router.get('/:id/profile', getPublicProfile);
router.get('/:id', getUser);

export default router;
