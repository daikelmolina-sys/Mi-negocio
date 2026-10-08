export default {
    render: async () => `
        <h1>Inventario</h1>
        
        <div class="grid-2" style="margin-top: 20px; margin-bottom: 24px;">
            <div class="panel" style="margin-bottom: 0;">
                <p style="color: var(--text-secondary); font-size: 0.9em;">Productos</p>
                <div id="inv-total-productos" style="font-size: 1.8em; font-weight: bold; margin-top: 10px;">...</div>
            </div>
            <div class="panel" style="margin-bottom: 0;">
                <p style="color: var(--text-secondary); font-size: 0.9em;">Valor invertido</p>
                <div id="inv-total-invertido" style="font-size: 1.8em; font-weight: bold; margin-top: 10px;">...</div>
            </div>
        </div>

        <div class="panel" style="padding: 0; overflow-x: auto; max-height: 400px; overflow-y: auto;">
            <table style="width: 100%;">
                <thead style="position: sticky; top: 0; background: var(--panel-bg); z-index: 1;">
                    <tr>
                        <th>Producto</th>
                        <th>Stock</th>
                        <th>Mín.</th>
                        <th>Costo</th>
                        <th>Invertido</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody id="inv-products-table">
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">Cargando inventario...</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="panel">
            <h3 style="font-family: var(--font-sans); font-size: 1.1em; margin-bottom: 20px;">Movimientos recientes</h3>
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Producto</th>
                        <th>Tipo</th>
                        <th>Cant.</th>
                        <th>Quedó</th>
                        <th>Usuario</th>
                        <th>Nota</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colspan="7" style="color: var(--text-secondary); padding: 15px; text-align: center;">El historial de movimientos estará disponible pronto.</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `,
    afterRender: async () => {
        const tableBody = document.getElementById('inv-products-table');
        const formatMoney = (val) => '$' + parseFloat(val).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});

        // Load Stats
        try {
            const resStats = await fetch('/api/inventory/stats');
            if(resStats.ok) {
                const stats = await resStats.json();
                document.getElementById('inv-total-productos').textContent = stats.total_productos || 0;
                document.getElementById('inv-total-invertido').textContent = formatMoney(stats.total_invertido);
            }
        } catch (e) {
            console.error(e);
        }

        // Load Products
        try {
            const resProd = await fetch('/api/inventory');
            if (resProd.ok) {
                const products = await resProd.json();
                if(products.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">No hay productos registrados.</td></tr>';
                    return;
                }

                tableBody.innerHTML = products.map(p => {
                    const minStock = 5; 
                    let estadoHtml = '';
                    if (p.stock <= 0) {
                        estadoHtml = '<span style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">Agotado</span>';
                    } else if (p.stock <= minStock) {
                        estadoHtml = '<span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">Bajo</span>';
                    } else {
                        estadoHtml = '<span style="background: var(--accent-light); color: var(--accent-color); padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">Normal</span>';
                    }

                    const cost = parseFloat(p.cost_usd) || 0;
                    const inverted = cost * p.stock;

                    return `
                        <tr>
                            <td style="font-weight: 500;">${p.name}</td>
                            <td>${p.stock}</td>
                            <td style="color: var(--text-secondary);">${minStock}</td>
                            <td>${formatMoney(cost)}</td>
                            <td>${formatMoney(inverted)}</td>
                            <td>${estadoHtml}</td>
                        </tr>
                    `;
                }).join('');
            }
        } catch (e) {
            console.error(e);
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--danger);">Error cargando inventario.</td></tr>';
        }
    }
};
