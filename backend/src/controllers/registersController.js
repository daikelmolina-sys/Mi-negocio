import pool from '../utils/db.js';

export const getRegisterStatus = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM cash_registers WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1`);
        if (result.rows.length > 0) {
            res.json({ isOpen: true, register: result.rows[0] });
        } else {
            res.json({ isOpen: false });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo estado de caja' });
    }
};

export const openRegister = async (req, res) => {
    try {
        const openingUsd = req.body.openingUsd ?? req.body.opening_balance_usd ?? 0;
        const openingVes = req.body.openingVes ?? req.body.opening_balance_ves ?? 0;
        
        const current = await pool.query(`SELECT id FROM cash_registers WHERE status = 'OPEN' LIMIT 1`);
        if (current.rows.length > 0) {
            return res.status(400).json({ error: 'Ya existe una caja abierta' });
        }

        const result = await pool.query(
            `INSERT INTO cash_registers (opening_balance_usd, opening_balance_ves, status) 
             VALUES ($1, $2, 'OPEN') RETURNING *`,
            [openingUsd || 0, openingVes || 0]
        );
        res.json({ message: 'Caja abierta', register: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error abriendo caja' });
    }
};

export const closeRegister = async (req, res) => {
    try {
        const current = await pool.query(`SELECT * FROM cash_registers WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1`);
        if (current.rows.length === 0) {
            return res.status(400).json({ error: 'No hay ninguna caja abierta para cerrar' });
        }
        
        const registerId = current.rows[0].id;
        
        // Sumar todas las ventas realizadas después de la apertura de caja
        const salesResult = await pool.query(
            `SELECT SUM(total_usd) as total_sales_usd, SUM(total_ves) as total_sales_ves 
             FROM sales WHERE created_at >= $1`, 
            [current.rows[0].opened_at]
        );
        
        const totalSalesUsd = parseFloat(salesResult.rows[0].total_sales_usd || 0);
        const totalSalesVes = parseFloat(salesResult.rows[0].total_sales_ves || 0);

        const closingUsd = parseFloat(current.rows[0].opening_balance_usd) + totalSalesUsd;
        const closingVes = parseFloat(current.rows[0].opening_balance_ves) + totalSalesVes;

        await pool.query(
            `UPDATE cash_registers 
             SET closing_balance_usd = $1, closing_balance_ves = $2, closed_at = CURRENT_TIMESTAMP, status = 'CLOSED' 
             WHERE id = $3`,
            [closingUsd, closingVes, registerId]
        );
        
        res.json({ 
            message: 'Caja cerrada y cuadre completado', 
            registerId,
            report: {
                totalSalesUsd,
                totalSalesVes,
                closingUsd,
                closingVes
            } 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error cerrando caja' });
    }
};

export const getRegistersHistory = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM cash_registers ORDER BY opened_at DESC LIMIT 50');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo historial de cajas' });
    }
};
