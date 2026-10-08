export default {
    render: async () => `
        <h1 style="margin-bottom: 5px;">Buenas tardes, Local</h1>
        <p style="color: var(--text-secondary); margin-bottom: 30px;" id="dash-subtitle">Cargando información del día...</p>
        
        <div class="grid-4" style="margin-bottom: 24px;">
            <div class="panel" style="margin-bottom: 0;">
                <p style="color: var(--text-secondary); font-size: 0.9em;">Ganancia total estimada</p>
                <div id="dash-ganancia" style="font-size: 1.8em; font-weight: bold; margin-top: 10px;">...</div>
            </div>
            <div class="panel" style="margin-bottom: 0;">
                <p style="color: var(--text-secondary); font-size: 0.9em;">Total productos</p>
                <div id="dash-productos" style="font-size: 1.8em; font-weight: bold; margin-top: 10px;">...</div>
            </div>
            <div class="panel" style="margin-bottom: 0;">
                <p style="color: var(--text-secondary); font-size: 0.9em;">Stock bajo</p>
                <div id="dash-stock" style="font-size: 1.8em; font-weight: bold; margin-top: 10px;">...</div>
            </div>
            <div class="panel" style="margin-bottom: 0;">
                <p style="color: var(--text-secondary); font-size: 0.9em;">Total invertido</p>
                <div id="dash-invertido" style="font-size: 1.8em; font-weight: bold; margin-top: 10px;">...</div>
            </div>
        </div>

        <div class="panel">
            <h3 style="font-family: var(--font-sans); font-size: 1.1em; margin-bottom: 20px;">Accesos rápidos</h3>
            <div style="display: flex; gap: 15px;">
                <button class="btn-primary" onclick="window.history.pushState(null, '', '/venta'); window.dispatchEvent(new Event('popstate'));">Ir a vender</button>
                <button class="btn-primary" onclick="window.history.pushState(null, '', '/productos'); window.dispatchEvent(new Event('popstate'));">+ Nuevo producto</button>
                <button class="btn-primary" onclick="window.history.pushState(null, '', '/reportes'); window.dispatchEvent(new Event('popstate'));">Reporte diario</button>
                <button class="btn-outline" onclick="window.history.pushState(null, '', '/creditos'); window.dispatchEvent(new Event('popstate'));">Créditos</button>
            </div>
        </div>
    `,
    afterRender: async () => {
        try {
            const res = await fetch('http://localhost:3000/api/inventory/stats');
            if (res.ok) {
                const data = await res.json();
                
                document.getElementById('dash-productos').textContent = data.total_productos || 0;
                document.getElementById('dash-stock').textContent = data.stock_bajo || 0;
                
                const formatMoney = (val) => '$' + parseFloat(val).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                
                document.getElementById('dash-ganancia').textContent = formatMoney(data.ganancia_estimada);
                document.getElementById('dash-invertido').textContent = formatMoney(data.total_invertido);
                document.getElementById('dash-subtitle').textContent = "¡Que sea un gran día de ventas!";
            }
        } catch (e) {
            console.error('Error fetching stats:', e);
            document.getElementById('dash-subtitle').textContent = "Error conectando al servidor.";
        }
    }
};
