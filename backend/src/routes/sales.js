import express from 'express';
import { createSale, getProductsSearch, getSettings, getStats } from '../controllers/salesController.js';

const router = express.Router();

router.get('/products/search', getProductsSearch);
router.get('/settings', getSettings);
router.get('/stats', getStats);
router.post('/', createSale);

export default router;
