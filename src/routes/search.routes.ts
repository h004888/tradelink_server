import { Router } from 'express';
import { search, home, categories, getProvinces, appConfig, appStatus } from '../controllers/search.controller';

const router = Router();

router.get('/', search);
router.get('/home', home);
router.get('/categories', categories);
router.get('/provinces', getProvinces);
router.get('/app/config', appConfig);
router.get('/app/status', appStatus);

export default router;
