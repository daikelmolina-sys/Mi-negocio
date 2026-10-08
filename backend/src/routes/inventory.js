import express from 'express';
import { upload } from '../middlewares/upload.js';
import {
    bulkUpload,
    getBulkImports,
    getStats,
    getProducts,
    createProduct,
    deleteProduct,
    updateProduct,
    getMovements,
    rollbackBulkImport
} from '../controllers/inventoryController.js';

const router = express.Router();

router.get('/', getProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

// Endpoint para obtener movimientos
router.get('/movements', getMovements);

// Endpoint para obtener estadisticas de inventario
router.get('/stats', getStats);

// Endpoints para historial y deshacer cargas masivas
router.get('/bulk-imports', getBulkImports);
router.post('/bulk-imports/:id/rollback', rollbackBulkImport);

// Endpoint para carga masiva
router.post('/bulk-upload', upload.single('file'), bulkUpload);

export default router;
