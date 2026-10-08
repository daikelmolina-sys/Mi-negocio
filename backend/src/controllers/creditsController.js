import pool from '../utils/db.js';

export const getCredits = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT cr.id, cl.name as client_name, cr.amount_usd, cr.amount_ves, cr.due_date, cr.status 
            FROM credits cr
            JOIN clients cl ON cr.client_id = cl.id
            ORDER BY cr.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo créditos' });
    }
};

export const createClient = async (req, res) => {
    try {
        const { name, document_id, phone } = req.body;
        const result = await pool.query(
            `INSERT INTO clients (name, document_id, phone) VALUES ($1, $2, $3) RETURNING *`,
            [name, document_id, phone]
        );
        res.json({ message: 'Cliente creado', client: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error creando cliente, verifique si la cédula ya existe.' });
    }
};

export const payCredit = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount_usd } = req.body; // Cantidad a abonar, si es null/undefined es liquidar todo

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const creditRes = await client.query('SELECT * FROM credits WHERE id = $1', [id]);
            if (creditRes.rows.length === 0) throw new Error('Crédito no encontrado');
            const credit = creditRes.rows[0];

            let newAmountUsd = 0;
            let newAmountVes = 0;
            let newStatus = 'PAID';

            if (amount_usd !== undefined && amount_usd !== null) {
                // Pago parcial
                newAmountUsd = Math.max(0, parseFloat(credit.amount_usd) - parseFloat(amount_usd));
                // Recalcular VES basado en el ratio (simplificado)
                const ratio = newAmountUsd / parseFloat(credit.amount_usd);
                newAmountVes = parseFloat(credit.amount_ves) * ratio;
                if (newAmountUsd > 0) newStatus = 'PENDING';
            }

            await client.query(
                'UPDATE credits SET amount_usd = $1, amount_ves = $2, status = $3 WHERE id = $4',
                [newAmountUsd, newAmountVes, newStatus, id]
            );

            await client.query('COMMIT');
            res.json({ message: 'Abono procesado correctamente' });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ error: 'Error procesando el pago' });
    }
};

export const getClients = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clients ORDER BY name ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching clients' });
    }
};
