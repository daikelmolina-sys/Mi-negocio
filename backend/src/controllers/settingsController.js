import pool from '../utils/db.js';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';

export const getSettings = async (req, res) => {
    try {
        const result = await pool.query('SELECT exchange_rate FROM settings ORDER BY id DESC LIMIT 1');
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.json({ exchange_rate: 0 });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error fetching settings' });
    }
};

export const updateExchangeRate = async (req, res) => {
    try {
        const { exchange_rate } = req.body;
        await pool.query('UPDATE settings SET exchange_rate = $1, updated_at = CURRENT_TIMESTAMP', [exchange_rate]);
        res.json({ message: 'Exchange rate updated' });
    } catch (error) {
        res.status(500).json({ error: 'Error updating exchange rate' });
    }
};

export const getBackup = (req, res) => {
    const date = new Date().toISOString().split('T')[0];
    const filename = `backup_bodega_${date}.sql`;
    const filepath = path.join('/tmp', filename);
    
    const host = process.env.DB_HOST || 'db';
    const user = process.env.DB_USER || 'postgres';
    const dbname = process.env.DB_NAME || 'pos_bodega';
    
    // -c limpia la base de datos antes de restaurar, vital para evitar conflictos
    const command = `PGPASSWORD="${process.env.DB_PASSWORD || 'postgres'}" pg_dump -h ${host} -U ${user} -d ${dbname} -F p -c --if-exists -f ${filepath}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Backup error: ${error.message}`);
            return res.status(500).json({ error: 'Error generando el respaldo de la base de datos' });
        }
        
        res.download(filepath, filename, (err) => {
            if (err) console.error("Error al enviar archivo de backup:", err);
            fs.unlink(filepath, () => {});
        });
    });
};

export const restoreBackup = (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

    const filepath = req.file.path;
    const host = process.env.DB_HOST || 'db';
    const user = process.env.DB_USER || 'postgres';
    const dbname = process.env.DB_NAME || 'pos_bodega';

    const command = `PGPASSWORD="${process.env.DB_PASSWORD || 'postgres'}" psql -h ${host} -U ${user} -d ${dbname} -f ${filepath}`;

    exec(command, (error, stdout, stderr) => {
        fs.unlink(filepath, () => {}); // Siempre borrar
        if (error) {
            console.error(`Restore error: ${error.message}`);
            return res.status(500).json({ error: 'Error al restaurar la base de datos. Verifica el archivo.' });
        }
        res.json({ message: 'Restauración completada con éxito' });
    });
};

export const exportExcel = async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        
        // Hoja Inventario
        const invSheet = workbook.addWorksheet('Inventario');
        invSheet.columns = [
            { header: 'Código', key: 'barcode', width: 15 },
            { header: 'Nombre', key: 'name', width: 30 },
            { header: 'Categoría', key: 'category', width: 20 },
            { header: 'Precio ($)', key: 'price_usd', width: 15 },
            { header: 'Costo ($)', key: 'cost_usd', width: 15 },
            { header: 'Stock', key: 'stock', width: 10 }
        ];
        const prodRes = await pool.query('SELECT * FROM products ORDER BY name ASC');
        invSheet.addRows(prodRes.rows);

        // Hoja Ventas
        const salesSheet = workbook.addWorksheet('Ventas Históricas');
        salesSheet.columns = [
            { header: 'ID Venta', key: 'id', width: 10 },
            { header: 'Total ($)', key: 'total_usd', width: 15 },
            { header: 'Total (VES)', key: 'total_ves', width: 15 },
            { header: 'Método de Pago', key: 'payment_method', width: 20 },
            { header: 'Fecha', key: 'created_at', width: 25 }
        ];
        const salesRes = await pool.query('SELECT * FROM sales ORDER BY id DESC');
        salesSheet.addRows(salesRes.rows);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Reporte_Bodega_${new Date().toISOString().split('T')[0]}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error exportando Excel' });
    }
};
