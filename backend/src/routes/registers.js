import express from 'express';
import { openRegister, closeRegister, getRegisterStatus, getRegistersHistory } from '../controllers/registersController.js';

const router = express.Router();

router.get('/status', getRegisterStatus);
router.get('/history', getRegistersHistory);
router.post('/open', openRegister);
router.post('/close', closeRegister);

export default router;
