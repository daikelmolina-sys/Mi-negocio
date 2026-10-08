import * as xlsx from 'xlsx';
import pool from '../utils/db.js';

export const bulkUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        const data = xlsx.utils.sheet_to_json(sheet, { range: 1 });
        
        const client = await pool.connect();
        
        let imported = 0;
        let errors = [];

        try {
            await client.query('BEGIN');

            for (const [index, row] of data.entries()) {
                const nameStr = row['nombre del producto'] || row['Nombre'] || row['NOMBRE'] || row['name'];
                const marca = row['marca'] || '';
                const name = nameStr ? `${nameStr} ${marca}`.trim() : null;
                const price = parseFloat(row['precio $'] || row['Precio ($)'] || row['Precio'] || row['PRECIO'] || row['price']);
                const cost = parseFloat(row['Costo ($)'] || row['Costo'] || row['COSTO'] || row['cost']) || 0;
                const stock = parseFloat(row['Stock'] || row['UND'] || row['Stock Inicial'] || row['STOCK INICIAL'] || row['stock']) || 0;
                const category = row['categoria'] || row['Categoría'] || row['CATEGORÍA'] || row['category'] || 'General';
                let barcode = row['Código'] || row['CÓDIGO'] || row['barcode'];
                
                let existingProduct = null;
                
                // Intentamos buscar por código de barras primero si es que viene en el Excel
                if (barcode) {
                    const res = await client.query('SELECT * FROM products WHERE barcode = $1', [barcode]);
                    if (res.rows.length > 0) existingProduct = res.rows[0];
                }
                
                // Si no tiene código de barras o no se encontró, buscamos por el nombre exacto
                if (!existingProduct) {
                    const res = await client.query('SELECT * FROM products WHERE name = $1', [name]);
                    if (res.rows.length > 0) existingProduct = res.rows[0];
                }

                if (existingProduct) {
                    // Si ya existe, SUMAMOS el stock y actualizamos precio/costo
                    await client.query(`
                        UPDATE products 
                        SET price_usd = $1, cost_usd = $2, stock = stock + $3, category = $4
                        WHERE id = $5
                    `, [price, cost, stock, category, existingProduct.id]);
                } else {
                    // Si es totalmente nuevo, lo insertamos
                    if (!barcode) {
                        barcode = `GEN-${Date.now()}-${index}`;
                    }
                    await client.query(`
                        INSERT INTO products (barcode, name, price_usd, cost_usd, stock, category)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [barcode, name, price, cost, stock, category]);
                }

                imported++;
            }

            await client.query('COMMIT');
            
            res.json({
                message: 'Procesamiento de archivo finalizado',
                imported,
                errorsCount: errors.length,
                errors
            });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error en carga masiva:', error);
        res.status(500).json({ error: 'Error procesando el archivo Excel' });
    }
};

export const getStats = async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_productos,
                COUNT(*) FILTER (WHERE stock < 5) as stock_bajo,
                COALESCE(SUM(cost_usd * stock), 0) as total_invertido,
                COALESCE(SUM((price_usd - cost_usd) * stock), 0) as ganancia_estimada
            FROM products
        `);
        res.json(stats.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
};

export const getProducts = async (req, res) => {
    try {
        const { search = '' } = req.query;
        let query = 'SELECT * FROM products';
        let params = [];
        
        if (search) {
            query += ' WHERE name ILIKE $1 OR barcode ILIKE $1 OR category ILIKE $1';
            params.push(`%${search}%`);
        }
        
        query += ' ORDER BY name ASC';
        
        const products = await pool.query(query, params);
        res.json(products.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo productos' });
    }
};

export const createProduct = async (req, res) => {
    try {
        const { barcode, name, description, category, price_usd, cost_usd, stock } = req.body;
        const result = await pool.query(`
            INSERT INTO products (barcode, name, description, category, price_usd, cost_usd, stock)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [barcode || null, name, description || '', category || '', price_usd || 0, cost_usd || 0, stock || 0]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando producto' });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { barcode, name, description, category, price_usd, cost_usd, stock } = req.body;
        const result = await pool.query(`
            UPDATE products 
            SET barcode = $1, name = $2, description = $3, category = $4, price_usd = $5, cost_usd = $6, stock = $7
            WHERE id = $8
            RETURNING *
        `, [barcode || null, name, description || '', category || '', price_usd || 0, cost_usd || 0, stock || 0, id]);
        
        if(result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error actualizando producto' });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
        if (error.code === '23503') { // foreign key violation code in PG
            return res.status(400).json({ error: 'No puedes eliminar un producto que ya tiene ventas registradas en el sistema.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Error eliminando producto' });
    }
};
