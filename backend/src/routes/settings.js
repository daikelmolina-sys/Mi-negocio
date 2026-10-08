import express from 'express';
import multer from 'multer';
import { getSettings, updateExchangeRate, getBackup, restoreBackup, exportExcel } from '../controllers/settingsController.js';

const router = express.Router();
const upload = multer({ dest: '/tmp/' });

router.get('/', getSettings);
router.post('/rate', updateExchangeRate);
router.get('/backup', getBackup);
router.post('/restore', upload.single('file'), restoreBackup);
router.get('/excel', exportExcel);

export default router;
