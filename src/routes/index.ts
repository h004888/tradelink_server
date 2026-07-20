import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import listingRoutes from './listing.routes';
import searchRoutes from './search.routes';
import offerRoutes from './offer.routes';
import transactionRoutes from './transaction.routes';
import chatRoutes from './chat.routes';
import watchlistRoutes from './watchlist.routes';
import notificationRoutes from './notification.routes';
import disputeRoutes from './dispute.routes';
import reviewRoutes from './review.routes';
import adminRoutes from './admin.routes';
import walletRoutes from './wallet.routes';
import uploadRoutes from './upload.routes';
import categoryRoutes from './category.routes';
import webhookRoutes from './webhook.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/listings', listingRoutes);
router.use('/search', searchRoutes);
router.use('/', searchRoutes); // exposes /home
router.use('/offers', offerRoutes);
router.use('/transactions', transactionRoutes);
router.use('/conversations', chatRoutes);
router.use('/watchlist', watchlistRoutes);
router.use('/notifications', notificationRoutes);
router.use('/disputes', disputeRoutes);
router.use('/reviews', reviewRoutes);
router.use('/admin', adminRoutes);
router.use('/wallet', walletRoutes);
router.use('/upload', uploadRoutes);
router.use('/categories', categoryRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
