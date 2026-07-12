import { Router } from 'express';
import {
  getCategories, getCategory, createCategory, updateCategory, deleteCategory,
} from '../controllers/category.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/', getCategories);
router.get('/:id', getCategory);
router.post('/', authenticate, createCategory);
router.put('/:id', authenticate, updateCategory);
router.delete('/:id', authenticate, deleteCategory);

export default router;
