import pool from '../utils/db.js';
import PDFDocument from 'pdfkit';
import * as xlsx from 'xlsx';

export const getCostListPDF = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT name, stock, cost_usd FROM products ORDER BY name ASC');
        
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=lista_costos.pdf');
        
        doc.pipe(res);
        doc.fontSize(20).text('Lista de Costos de Inventario', { align: 'center' });
        doc.moveDown();
        
        // Simple table header
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Producto', 50, 100);
        doc.text('Stock', 400, 100);
        doc.text('Costo ($)', 480, 100);
        doc.moveTo(50, 115).lineTo(550, 115).stroke();
        
        let y = 130;
        doc.font('Helvetica');
        
        rows.forEach(p => {
            if (y > 700) {
                doc.addPage();
                y = 50;
            }
            doc.text(p.name.substring(0, 45), 50, y);
            doc.text(p.stock.toString(), 400, y);
            doc.text(parseFloat(p.cost_usd).toFixed(2), 480, y);
            y += 20;
        });
        
        doc.end();
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error generando PDF' });
    }
};

export const getInventoryExcel = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT barcode as "Código", name as "Producto", category as "Categoría", stock as "Stock", cost_usd as "Costo ($)", price_usd as "Precio Venta ($)" FROM products ORDER BY name ASC');
        
        const worksheet = xlsx.utils.json_to_sheet(rows);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Inventario");
        
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=inventario.xlsx');
        res.send(buffer);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error generando Excel' });
    }
};

export const getDailyReportPDF = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM sales WHERE DATE(created_at) = CURRENT_DATE');
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_diario.pdf');
        doc.pipe(res);
        doc.fontSize(20).text('Reporte de Ventas Diario', { align: 'center' });
        doc.moveDown();
        if (rows.length === 0) {
            doc.fontSize(12).text('No hay ventas registradas el dia de hoy.', { align: 'center' });
        } else {
            let total = 0;
            rows.forEach(r => {
                doc.fontSize(12).text(`Ticket #${r.id} - ${r.payment_method} - $${r.total_usd}`);
                total += parseFloat(r.total_usd);
            });
            doc.moveDown();
            doc.fontSize(14).text(`Total del dia: $${total.toFixed(2)}`, { align: 'right' });
        }
        doc.end();
    } catch (e) {
        res.status(500).json({ error: 'Error' });
    }
};

export const getCategoryPDF = async (req, res) => {
    try {
        const cat = req.query.category;
        const query = cat && cat !== 'Todas' ? 'SELECT * FROM products WHERE category = $1 ORDER BY name ASC' : 'SELECT * FROM products ORDER BY name ASC';
        const params = cat && cat !== 'Todas' ? [cat] : [];
        const { rows } = await pool.query(query, params);
        
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=productos_${cat || 'todas'}.pdf`);
        doc.pipe(res);
        doc.fontSize(20).text(`Productos - Categoria: ${cat || 'Todas'}`, { align: 'center' });
        doc.moveDown();
        rows.forEach(p => {
            doc.fontSize(12).text(`${p.name} - $${p.price_usd} - Stock: ${p.stock}`);
        });
        doc.end();
    } catch (e) {
        res.status(500).json({ error: 'Error' });
    }
};

export const getLabelsPDF = async (req, res) => {
    try {
        const cat = req.query.category;
        const query = cat && cat !== 'Todas' ? 'SELECT * FROM products WHERE category = $1 ORDER BY name ASC' : 'SELECT * FROM products ORDER BY name ASC';
        const params = cat && cat !== 'Todas' ? [cat] : [];
        const { rows } = await pool.query(query, params);
        
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=etiquetas.pdf`);
        doc.pipe(res);
        doc.fontSize(20).text(`Etiquetas para Anaquel`, { align: 'center' });
        doc.moveDown();
        rows.forEach(p => {
            doc.rect(doc.x, doc.y, 250, 60).stroke();
            doc.fontSize(10).text(p.name.substring(0, 35), doc.x + 10, doc.y + 10);
            doc.fontSize(16).text(`$${parseFloat(p.price_usd).toFixed(2)}`, doc.x + 10, doc.y + 30);
            doc.moveDown(3);
        });
        doc.end();
    } catch (e) {
        res.status(500).json({ error: 'Error' });
    }
};

export const getCashRegistersPDF = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM cash_registers WHERE DATE(opened_at) = CURRENT_DATE');
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=cierres_caja.pdf`);
        doc.pipe(res);
        doc.fontSize(20).text(`Cierres de Caja del Dia`, { align: 'center' });
        doc.moveDown();
        if (rows.length === 0) {
            doc.fontSize(12).text('No hay registros de cajas abiertas/cerradas hoy.', { align: 'center' });
        } else {
            rows.forEach(r => {
                doc.fontSize(12).text(`Caja #${r.id} - Inicial: $${r.initial_balance} - Estado: ${r.status}`);
            });
        }
        doc.end();
    } catch (e) {
        res.status(500).json({ error: 'Error' });
    }
};
