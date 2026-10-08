import * as xlsx from 'xlsx';
import pool from '../utils/db.js';

export const bulkUpload = async (req, res) => {
    const client = await pool.connect();
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subio ningun archivo' });
        }

        const mode = req.body.mode === 'add' ? 'add' : 'replace';
        const username = req.body.username || 'Sistema';
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { range: 1 });
        let imported = 0;
        const errors = [];

        await client.query('BEGIN');

        const importResult = await client.query(`
            INSERT INTO bulk_imports (filename, mode, username)
            VALUES ($1, $2, $3)
            RETURNING id
        `, [req.file.originalname || 'archivo.xlsx', mode, username]);
        const importId = importResult.rows[0].id;

        for (const [index, row] of data.entries()) {
            const nameStr = row['nombre del producto'] || row['Nombre'] || row['NOMBRE'] || row['name'];
            const marca = row['marca'] || '';
            const name = nameStr ? `${nameStr} ${marca}`.trim() : null;
            const price = parseFloat(row['precio $'] || row['Precio ($)'] || row['Precio'] || row['PRECIO'] || row['price']);
            const cost = parseFloat(row['Costo ($)'] || row['Costo'] || row['COSTO'] || row['cost']) || 0;
            const stock = parseFloat(row['Stock'] || row['UND'] || row['Stock Inicial'] || row['STOCK INICIAL'] || row['stock']) || 0;
            const category = row['categoria'] || row['Categoria'] || row['Categoría'] || row['CATEGORIA'] || row['CATEGORÍA'] || row['category'] || 'General';
            let barcode = row['Codigo'] || row['Código'] || row['CODIGO'] || row['CÓDIGO'] || row['barcode'];

            if (!name || Number.isNaN(price)) {
                errors.push({ row: index + 2, error: 'Falta nombre o precio valido' });
                continue;
            }

            let existingProduct = null;
            if (barcode) {
                const result = await client.query('SELECT * FROM products WHERE barcode = $1', [barcode]);
                if (result.rows.length > 0) existingProduct = result.rows[0];
            }

            if (!existingProduct) {
                const result = await client.query('SELECT * FROM products WHERE name = $1', [name]);
                if (result.rows.length > 0) existingProduct = result.rows[0];
            }

            let productId;
            let previousStock = null;
            let newStock = stock;
            let productWasCreated = false;
            let movementId = null;

            if (existingProduct) {
                productId = existingProduct.id;
                previousStock = parseFloat(existingProduct.stock || 0);
                newStock = mode === 'add' ? previousStock + stock : stock;

                await client.query(`
                    UPDATE products
                    SET price_usd = $1, cost_usd = $2, stock = $3, category = $4
                    WHERE id = $5
                `, [price, cost, newStock, category, productId]);

                const diff = newStock - previousStock;
                if (diff !== 0) {
                    const movementResult = await client.query(`
                        INSERT INTO inventory_movements (product_id, type, quantity, stock_after, username, note)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING id
                    `, [
                        productId,
                        diff > 0 ? 'Entrada (Excel)' : 'Salida (Excel)',
                        Math.abs(diff),
                        newStock,
                        username,
                        mode === 'add' ? 'Carga masiva Excel: suma de stock' : 'Carga masiva Excel: reemplazo de stock'
                    ]);
                    movementId = movementResult.rows[0].id;
                }
            } else {
                if (!barcode) {
                    barcode = `GEN-${Date.now()}-${index}`;
                }

                const insertResult = await client.query(`
                    INSERT INTO products (barcode, name, price_usd, cost_usd, stock, category)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id
                `, [barcode, name, price, cost, stock, category]);

                productId = insertResult.rows[0].id;
                productWasCreated = true;

                const movementResult = await client.query(`
                    INSERT INTO inventory_movements (product_id, type, quantity, stock_after, username, note)
                    VALUES ($1, 'Entrada (Excel)', $2, $3, $4, $5)
                    RETURNING id
                `, [productId, stock, stock, username, 'Creacion por carga masiva Excel']);
                movementId = movementResult.rows[0].id;
            }

            await client.query(`
                INSERT INTO bulk_import_items (
                    import_id, product_id, barcode, product_name, previous_stock,
                    new_stock, quantity_applied, product_was_created, movement_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                importId,
                productId,
                barcode,
                name,
                previousStock,
                newStock,
                mode === 'add' ? stock : newStock - (previousStock || 0),
                productWasCreated,
                movementId
            ]);

            imported++;
        }

        await client.query(`
            UPDATE bulk_imports
            SET imported_count = $1, errors_count = $2
            WHERE id = $3
        `, [imported, errors.length, importId]);

        await client.query('COMMIT');
        res.json({ message: 'Procesamiento de archivo finalizado', importId, mode, imported, errorsCount: errors.length, errors });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en carga masiva:', error);
        res.status(500).json({ error: 'Error procesando el archivo Excel' });
    } finally {
        client.release();
    }
};

export const getBulkImports = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, filename, mode, imported_count, errors_count, status, username, created_at, rolled_back_at
            FROM bulk_imports
            ORDER BY created_at DESC
            LIMIT 20
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo cargas masivas:', error);
        res.status(500).json({ error: 'Error obteniendo cargas masivas' });
    }
};

export const rollbackBulkImport = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const username = req.body?.username || 'Sistema';

        await client.query('BEGIN');

        const importResult = await client.query('SELECT * FROM bulk_imports WHERE id = $1 FOR UPDATE', [id]);
        if (importResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Carga masiva no encontrada' });
        }

        const bulkImport = importResult.rows[0];
        if (bulkImport.status !== 'ACTIVE') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Esta carga ya fue deshecha o no esta activa' });
        }

        const itemsResult = await client.query('SELECT * FROM bulk_import_items WHERE import_id = $1 ORDER BY id DESC', [id]);
        const blocked = [];

        for (const item of itemsResult.rows) {
            const movementResult = await client.query(`
                SELECT id
                FROM inventory_movements
                WHERE product_id = $1
                  AND ($2::integer IS NULL OR id <> $2)
                  AND created_at > $3
                LIMIT 1
            `, [item.product_id, item.movement_id, bulkImport.created_at]);

            if (movementResult.rows.length > 0) {
                blocked.push(item.product_name);
            }
        }

        if (blocked.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: 'No se puede deshacer porque hay movimientos posteriores en algunos productos',
                products: blocked
            });
        }

        let restored = 0;
        let deleted = 0;

        for (const item of itemsResult.rows) {
            if (item.product_was_created) {
                const usageResult = await client.query(
                    'SELECT EXISTS (SELECT 1 FROM sale_items WHERE product_id = $1) AS has_sales',
                    [item.product_id]
                );

                if (usageResult.rows[0].has_sales) {
                    await client.query('UPDATE products SET stock = 0 WHERE id = $1', [item.product_id]);
                    await client.query(`
                        INSERT INTO inventory_movements (product_id, type, quantity, stock_after, username, note)
                        VALUES ($1, 'Salida (Excel)', $2, 0, $3, $4)
                    `, [item.product_id, item.new_stock, username, `Deshacer carga #${id}: producto creado con ventas`]);
                    restored++;
                } else {
                    await client.query(`
                        UPDATE bulk_import_items
                        SET product_id = NULL, movement_id = NULL
                        WHERE import_id = $1 AND product_id = $2
                    `, [id, item.product_id]);
                    await client.query('DELETE FROM inventory_movements WHERE product_id = $1', [item.product_id]);
                    await client.query('DELETE FROM products WHERE id = $1', [item.product_id]);
                    deleted++;
                }
            } else {
                await client.query('UPDATE products SET stock = $1 WHERE id = $2', [item.previous_stock, item.product_id]);
                await client.query(`
                    INSERT INTO inventory_movements (product_id, type, quantity, stock_after, username, note)
                    VALUES ($1, 'Ajuste Excel', $2, $3, $4, $5)
                `, [
                    item.product_id,
                    Math.abs(parseFloat(item.new_stock) - parseFloat(item.previous_stock)),
                    item.previous_stock,
                    username,
                    `Deshacer carga #${id}`
                ]);
                restored++;
            }
        }

        await client.query(`
            UPDATE bulk_imports
            SET status = 'ROLLED_BACK', rolled_back_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [id]);

        await client.query('COMMIT');
        res.json({ message: 'Carga masiva deshecha correctamente', restored, deleted });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deshaciendo carga masiva:', error);
        res.status(500).json({ error: 'Error deshaciendo la carga masiva' });
    } finally {
        client.release();
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
        res.status(500).json({ error: 'Error obteniendo estadisticas' });
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
        const { barcode, name, description, category, price_usd, cost_usd, stock, username } = req.body;
        const result = await pool.query(`
            INSERT INTO products (barcode, name, description, category, price_usd, cost_usd, stock)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [barcode || null, name, description || '', category || '', price_usd || 0, cost_usd || 0, stock || 0]);

        const newProduct = result.rows[0];

        await pool.query(`
            INSERT INTO inventory_movements (product_id, type, quantity, stock_after, username, note)
            VALUES ($1, 'Entrada (Creacion)', $2, $3, $4, $5)
        `, [newProduct.id, newProduct.stock, newProduct.stock, username || 'Sistema', 'Producto nuevo']);

        res.status(201).json(newProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando producto' });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { barcode, name, description, category, price_usd, cost_usd, stock, username } = req.body;
        const currentRes = await pool.query('SELECT stock FROM products WHERE id = $1', [id]);
        if (currentRes.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        const currentStock = currentRes.rows[0].stock;

        const result = await pool.query(`
            UPDATE products
            SET barcode = $1, name = $2, description = $3, category = $4, price_usd = $5, cost_usd = $6, stock = $7
            WHERE id = $8
            RETURNING *
        `, [barcode || null, name, description || '', category || '', price_usd || 0, cost_usd || 0, stock || 0, id]);

        const updatedProduct = result.rows[0];
        const diff = updatedProduct.stock - currentStock;
        if (diff !== 0) {
            const type = diff > 0 ? 'Entrada (Ajuste)' : 'Salida (Ajuste)';
            await pool.query(`
                INSERT INTO inventory_movements (product_id, type, quantity, stock_after, username, note)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [updatedProduct.id, type, Math.abs(diff), updatedProduct.stock, username || 'Sistema', 'Ajuste manual de stock']);
        }

        res.json(updatedProduct);
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
        if (error.code === '23503') {
            return res.status(400).json({ error: 'No puedes eliminar un producto que ya tiene ventas o movimientos registrados en el sistema.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Error eliminando producto' });
    }
};

export const getMovements = async (req, res) => {
    try {
        const movements = await pool.query(`
            SELECT m.*, p.name as product_name
            FROM inventory_movements m
            JOIN products p ON m.product_id = p.id
            ORDER BY m.created_at DESC
            LIMIT 50
        `);
        res.json(movements.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo movimientos' });
    }
};
