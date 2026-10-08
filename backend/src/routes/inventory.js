import express from 'express';
import { upload } from '../middlewares/upload.js';
import { bulkUpload, getStats, getProducts, createProduct, deleteProduct, updateProduct } from '../controllers/inventoryController.js';

const router = express.Router();

router.get('/', getProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

// Endpoint para obtener estadisticas de inventario
router.get('/stats', getStats);

// Endpoint para carga masiva
router.post('/bulk-upload', upload.single('file'), bulkUpload);

export default router;
