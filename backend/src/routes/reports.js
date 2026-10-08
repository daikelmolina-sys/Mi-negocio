import express from 'express';
import { getCostListPDF, getInventoryExcel, getDailyReportPDF, getCategoryPDF, getLabelsPDF, getCashRegistersPDF } from '../controllers/reportsController.js';

const router = express.Router();

router.get('/costos-pdf', getCostListPDF);
router.get('/inventario-excel', getInventoryExcel);
router.get('/diario-pdf', getDailyReportPDF);
router.get('/categoria-pdf', getCategoryPDF);
router.get('/etiquetas-pdf', getLabelsPDF);
router.get('/cajas-pdf', getCashRegistersPDF);

export default router;
