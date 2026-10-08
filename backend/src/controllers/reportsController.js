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
        const { registerId } = req.query;
        const registerQuery = registerId
            ? 'SELECT * FROM cash_registers WHERE id = $1'
            : 'SELECT * FROM cash_registers WHERE DATE(opened_at) = CURRENT_DATE ORDER BY opened_at ASC';
        const registerParams = registerId ? [registerId] : [];
        const { rows } = await pool.query(registerQuery, registerParams);

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=cierres_caja.pdf`);
        doc.pipe(res);

        const formatUsd = (value) => `$${parseFloat(value || 0).toFixed(2)}`;
        const formatVes = (value) => `Bs. ${parseFloat(value || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const methodLabel = (method) => ({
            EFECTIVO: 'Efectivo',
            PAGO_MOVIL: 'Pago Movil',
            PUNTO_VENTA: 'Punto de Venta / Tarjeta',
            CREDITO: 'Credito (Fiar)'
        })[method] || method || 'Sin metodo';

        doc.fontSize(20).text(registerId ? `Cierre de Caja #${registerId}` : 'Cierres de Caja del Dia', { align: 'center' });
        doc.fontSize(10).text(`Generado: ${new Date().toLocaleString('es-VE')}`, { align: 'center' });
        doc.moveDown();

        if (rows.length === 0) {
            doc.fontSize(12).text('No hay registros de cajas abiertas/cerradas hoy.', { align: 'center' });
        } else {
            for (const register of rows) {
                const openedAt = register.opened_at;
                const closedAt = register.closed_at || new Date();

                const salesSummary = await pool.query(`
                    SELECT payment_method,
                           COUNT(*) AS tickets,
                           COALESCE(SUM(total_usd), 0) AS total_usd,
                           COALESCE(SUM(total_ves), 0) AS total_ves,
                           COALESCE(AVG(exchange_rate), 0) AS exchange_rate
                    FROM sales
                    WHERE created_at >= $1 AND created_at <= $2
                    GROUP BY payment_method
                    ORDER BY payment_method ASC
                `, [openedAt, closedAt]);

                const totals = salesSummary.rows.reduce((acc, row) => {
                    acc.tickets += parseInt(row.tickets, 10);
                    acc.usd += parseFloat(row.total_usd || 0);
                    acc.ves += parseFloat(row.total_ves || 0);
                    return acc;
                }, { tickets: 0, usd: 0, ves: 0 });

                doc.fontSize(14).font('Helvetica-Bold').text(`Caja #${register.id}`);
                doc.fontSize(10).font('Helvetica')
                    .text(`Estado: ${register.status === 'OPEN' ? 'Abierta' : 'Cerrada'}`)
                    .text(`Apertura: ${new Date(register.opened_at).toLocaleString('es-VE')}`)
                    .text(`Cierre: ${register.closed_at ? new Date(register.closed_at).toLocaleString('es-VE') : 'En curso'}`)
                    .text(`Fondo inicial: ${formatUsd(register.opening_balance_usd)} / ${formatVes(register.opening_balance_ves)}`);
                doc.moveDown();

                doc.fontSize(11).font('Helvetica-Bold');
                const headerY = doc.y;
                doc.text('Metodo de pago', 50, headerY, { width: 170 });
                doc.text('Tickets', 225, headerY, { width: 60, align: 'right' });
                doc.text('Total USD', 310, headerY, { width: 90, align: 'right' });
                doc.text('Total Bs.', 430, headerY, { width: 110, align: 'right' });
                doc.y = headerY + 15;
                doc.moveDown(0.4);
                doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
                doc.moveDown(0.5);

                doc.font('Helvetica');
                if (salesSummary.rows.length === 0) {
                    doc.text('No hubo ventas en esta caja.');
                } else {
                    salesSummary.rows.forEach(row => {
                        const y = doc.y;
                        doc.text(methodLabel(row.payment_method), 50, y, { width: 170 });
                        doc.text(row.tickets.toString(), 225, y, { width: 60, align: 'right' });
                        doc.text(formatUsd(row.total_usd), 310, y, { width: 90, align: 'right' });
                        doc.text(formatVes(row.total_ves), 430, y, { width: 110, align: 'right' });
                        doc.moveDown(0.7);
                    });
                }

                doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
                doc.moveDown(0.5);
                doc.font('Helvetica-Bold');
                const y = doc.y;
                doc.text('Total vendido', 50, y, { width: 170 });
                doc.text(totals.tickets.toString(), 225, y, { width: 60, align: 'right' });
                doc.text(formatUsd(totals.usd), 310, y, { width: 90, align: 'right' });
                doc.text(formatVes(totals.ves), 430, y, { width: 110, align: 'right' });

                doc.moveDown();
                doc.fontSize(11).text(`Monto final esperado: ${formatUsd(register.closing_balance_usd)} / ${formatVes(register.closing_balance_ves)}`);
                doc.moveDown(2);

                if (!registerId && rows.indexOf(register) < rows.length - 1) {
                    doc.addPage();
                }
            }
        }
        doc.end();
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error' });
    }
};
