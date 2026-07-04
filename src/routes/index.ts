import { Router } from 'express';
import userRoutes from './user.routes';

const router = Router();

// Gộp tất cả route con
router.use('/users', userRoutes);

// TODO: thêm các route khác ở đây
// router.use('/products', productRoutes);
// router.use('/orders', orderRoutes);
// router.use('/auth', authRoutes);

export default router;
