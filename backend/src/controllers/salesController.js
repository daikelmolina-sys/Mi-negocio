import pool from '../utils/db.js';

export const getSettings = async (req, res) => {
    try {
        const result = await pool.query('SELECT exchange_rate FROM settings LIMIT 1');
        res.json(result.rows[0] || { exchange_rate: 36.5 });
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo ajustes' });
    }
};

export const getProductsSearch = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const result = await pool.query(
            `SELECT * FROM products 
             WHERE barcode = $1 OR name ILIKE $2 
             LIMIT 20`,
            [q, `%${q}%`]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error buscando productos' });
    }
};

export const createSale = async (req, res) => {
    const client = await pool.connect();
    try {
        const { items, payment_method, exchange_rate, total_usd, total_ves, client_id } = req.body;
        
        await client.query('BEGIN');

        // Insert Sale
        let saleResult;
        if (payment_method === 'CREDITO' && client_id) {
            saleResult = await client.query(
                `INSERT INTO sales (total_usd, total_ves, exchange_rate, payment_method) 
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                [total_usd, total_ves, exchange_rate, payment_method]
            );
            const saleId = saleResult.rows[0].id;
            
            // Register credit
            await client.query(
                `INSERT INTO credits (client_id, sale_id, amount_usd, amount_ves)
                 VALUES ($1, $2, $3, $4)`,
                [client_id, saleId, total_usd, total_ves]
            );
        } else {
            saleResult = await client.query(
                `INSERT INTO sales (total_usd, total_ves, exchange_rate, payment_method) 
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                [total_usd, total_ves, exchange_rate, payment_method]
            );
        }
        const saleId = saleResult.rows[0].id;

        // Insert Items and deduct stock
        for (const item of items) {
            await client.query(
                `INSERT INTO sale_items (sale_id, product_id, quantity, price_usd, total_usd) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [saleId, item.product_id, item.quantity, item.price_usd, item.quantity * item.price_usd]
            );

            await client.query(
                `UPDATE products SET stock = stock - $1 WHERE id = $2`,
                [item.quantity, item.product_id]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Venta completada', saleId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error procesando venta:', error);
        res.status(500).json({ error: 'Error procesando la venta' });
    } finally {
        client.release();
    }
};

export const getStats = async (req, res) => {
    try {
        const { period } = req.query;
        let dateCondition = '';
        
        if (period === 'semana') {
            dateCondition = "created_at >= date_trunc('week', CURRENT_DATE)";
        } else if (period === 'mes') {
            dateCondition = "created_at >= date_trunc('month', CURRENT_DATE)";
        } else if (period === 'trimestre') {
            dateCondition = "created_at >= date_trunc('quarter', CURRENT_DATE)";
        } else {
            // hoy
            dateCondition = "DATE(created_at) = CURRENT_DATE";
        }

        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_tickets,
                COALESCE(SUM(total_usd), 0) as total_ventas,
                COALESCE(AVG(total_usd), 0) as ticket_promedio
            FROM sales 
            WHERE ${dateCondition}
        `);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo estadisticas de ventas' });
    }
};
