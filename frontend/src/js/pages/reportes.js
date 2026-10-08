export default {
    render: async () => `
        <h1>Reportes y etiquetas</h1>
        
        <div class="panel" style="margin-top: 20px;">
            <h3 style="font-family: var(--font-sans); font-size: 1.1em; margin-bottom: 20px;">Generar documentos</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn-primary" id="btn-rep-diario">Reporte diario</button>
                <button class="btn-primary" id="btn-rep-costos">Lista de costos (PDF)</button>
                <button class="btn-primary" id="btn-rep-categoria">PDF por categoría</button>
                <button class="btn-primary" id="btn-rep-etiquetas">Etiquetas anaqueles</button>
                <button class="btn-primary" id="btn-rep-cajas">Cierres de caja del día</button>
                <button class="btn-outline" id="btn-rep-excel">Descargar Inventario (Excel)</button>
            </div>
            
            <div class="input-group" style="margin-top: 20px; max-width: 300px;">
                <label>Categoría (para PDF por categoría y etiquetas)</label>
                <select class="input-control" id="select-category">
                    <option value="Todas">Todas</option>
                </select>
            </div>
        </div>

        <h2 style="margin-top: 30px; margin-bottom: 20px;">Ventas por periodo</h2>
        <div style="display: flex; gap: 10px; margin-bottom: 20px;" id="period-buttons">
            <button class="btn-primary" data-period="hoy">Hoy</button>
            <button class="btn-outline" data-period="semana">Semana</button>
            <button class="btn-outline" data-period="mes">Mes</button>
            <button class="btn-outline" data-period="trimestre">Trimestre</button>
        </div>

        <div class="grid-3" style="margin-bottom: 24px;">
            <div class="panel" style="margin-bottom: 0;">
                <p style="color: var(--text-secondary); font-size: 0.9em;">Ventas</p>
                <div id="rep-ventas" style="font-size: 1.8em; font-weight: bold; margin-top: 10px;">...</div>
            </div>
            <div class="panel" style="margin-bottom: 0;">
                <p style="color: var(--text-secondary); font-size: 0.9em;">Tickets</p>
                <div id="rep-tickets" style="font-size: 1.8em; font-weight: bold; margin-top: 10px;">...</div>
            </div>
            <div class="panel" style="margin-bottom: 0;">
                <p style="color: var(--text-secondary); font-size: 0.9em;">Ticket promedio</p>
                <div id="rep-promedio" style="font-size: 1.8em; font-weight: bold; margin-top: 10px;">...</div>
            </div>
        </div>
    `,
    afterRender: async () => {
        // Load categories into dropdown
        try {
            const res = await fetch('http://localhost:3000/api/inventory');
            if(res.ok) {
                const products = await res.json();
                const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
                const select = document.getElementById('select-category');
                categories.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c;
                    opt.textContent = c;
                    select.appendChild(opt);
                });
            }
        } catch(e) {}

        const getCat = () => document.getElementById('select-category').value;

        document.getElementById('btn-rep-costos')?.addEventListener('click', () => {
            window.open('http://localhost:3000/api/reports/costos-pdf', '_blank');
        });
        document.getElementById('btn-rep-excel')?.addEventListener('click', () => {
            window.open('http://localhost:3000/api/reports/inventario-excel', '_blank');
        });
        document.getElementById('btn-rep-diario')?.addEventListener('click', () => {
            window.open('http://localhost:3000/api/reports/diario-pdf', '_blank');
        });
        document.getElementById('btn-rep-cajas')?.addEventListener('click', () => {
            window.open('http://localhost:3000/api/reports/cajas-pdf', '_blank');
        });
        document.getElementById('btn-rep-categoria')?.addEventListener('click', () => {
            window.open(`http://localhost:3000/api/reports/categoria-pdf?category=${encodeURIComponent(getCat())}`, '_blank');
        });
        document.getElementById('btn-rep-etiquetas')?.addEventListener('click', () => {
            window.open(`http://localhost:3000/api/reports/etiquetas-pdf?category=${encodeURIComponent(getCat())}`, '_blank');
        });

        const periodButtons = document.querySelectorAll('#period-buttons button');
        const fetchSalesStats = async (period) => {
            document.getElementById('rep-ventas').textContent = '...';
            document.getElementById('rep-tickets').textContent = '...';
            document.getElementById('rep-promedio').textContent = '...';
            
            try {
                const res = await fetch(`http://localhost:3000/api/sales/stats?period=${period}`);
                if (res.ok) {
                    const data = await res.json();
                    const formatMoney = (val) => '$' + parseFloat(val).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                    
                    document.getElementById('rep-ventas').textContent = formatMoney(data.total_ventas || 0);
                    document.getElementById('rep-tickets').textContent = data.total_tickets || 0;
                    document.getElementById('rep-promedio').textContent = formatMoney(data.ticket_promedio || 0);
                }
            } catch (e) {
                console.error(e);
            }
        };

        periodButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                periodButtons.forEach(b => {
                    b.classList.remove('btn-primary');
                    b.classList.add('btn-outline');
                });
                e.target.classList.remove('btn-outline');
                e.target.classList.add('btn-primary');
                
                fetchSalesStats(e.target.getAttribute('data-period'));
            });
        });

        // initial load
        fetchSalesStats('hoy');
    }
};
