import { Router } from 'express';
import { getConversations, initConversation, getMessages, sendMessage, markRead } from '../controllers/chat.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getConversations);
router.post('/init', initConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);
router.post('/:id/read', markRead);

export default router;
