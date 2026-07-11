import { Router } from 'express';
import { uploadOne, uploadMany } from '../controllers/upload.controller';
import { uploadSingle, uploadMultiple } from '../middlewares/upload';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/image', authenticate, uploadSingle, uploadOne);
router.post('/images', authenticate, uploadMultiple, uploadMany);

export default router;
