import express from 'express';
import { getCredits, createClient, payCredit, getClients } from '../controllers/creditsController.js';

const router = express.Router();

router.get('/', getCredits);
router.get('/clients', getClients);
router.post('/client', createClient);
router.post('/:id/pay', payCredit);

export default router;
