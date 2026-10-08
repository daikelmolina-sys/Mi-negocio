export default {
    render: async () => `
        <h1>Control de cajas</h1>
        
        <div class="panel" style="margin-top: 20px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <span id="caja-status-text" style="color: var(--text-secondary); font-size: 1.1em;">Cargando estado de caja...</span>
                <button class="btn-outline" id="btn-ir-caja" style="display: none;">Ir a Caja / Venta</button>
            </div>
            <div id="caja-status-indicator"></div>
        </div>

        <div class="panel">
            <h3 style="font-family: var(--font-sans); font-size: 1.1em; margin-bottom: 20px;">Historial de Cajas</h3>
            <table>
                <thead>
                    <tr>
                        <th>Caja ID</th>
                        <th>Estado</th>
                        <th>Apertura</th>
                        <th>Cierre</th>
                        <th>Fondo Inicial $</th>
                        <th>Monto Final $</th>
                    </tr>
                </thead>
                <tbody id="cajas-table">
                    <tr>
                        <td colspan="6" style="color: var(--text-secondary); text-align: center; padding: 20px;">Cargando historial...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `,
    afterRender: async () => {
        const statusText = document.getElementById('caja-status-text');
        const btnIrCaja = document.getElementById('btn-ir-caja');
        const indicator = document.getElementById('caja-status-indicator');
        const tableBody = document.getElementById('cajas-table');

        btnIrCaja.addEventListener('click', () => {
            window.history.pushState(null, '', '/venta');
            const event = new Event('popstate');
            window.dispatchEvent(event);
        });

        // Get Status
        try {
            const res = await fetch('/api/registers/status');
            if (res.ok) {
                const data = await res.json();
                if (data.isOpen) {
                    statusText.textContent = 'Tienes una caja abierta actualmente.';
                    statusText.style.color = 'var(--text-primary)';
                    btnIrCaja.style.display = 'inline-block';
                    btnIrCaja.textContent = 'Ir a la Caja (Punto de Venta)';
                    indicator.innerHTML = '<span style="background: rgba(16, 185, 129, 0.15); color: var(--accent-color); padding: 6px 12px; border-radius: 20px; font-weight: bold;">Caja Abierta</span>';
                } else {
                    statusText.textContent = 'No tienes ninguna caja abierta.';
                    btnIrCaja.style.display = 'inline-block';
                    btnIrCaja.textContent = 'Abrir Caja Nueva';
                    btnIrCaja.className = 'btn-primary'; // Highlight since they need to open one
                    indicator.innerHTML = '<span style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 6px 12px; border-radius: 20px; font-weight: bold;">Caja Cerrada</span>';
                }
            }
        } catch(e) {
            statusText.textContent = 'Error de conexión con la caja.';
        }

        // Get History
        try {
            const res = await fetch('/api/registers/history');
            if (res.ok) {
                const registers = await res.json();
                if (registers.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="6" style="color: var(--text-secondary); text-align: center; padding: 20px;">Sin registros históricos de caja.</td></tr>';
                    return;
                }
                
                tableBody.innerHTML = registers.map(r => `
                    <tr>
                        <td style="font-family: monospace;">#${r.id}</td>
                        <td>
                            <span style="background: ${r.status === 'OPEN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${r.status === 'OPEN' ? 'var(--accent-color)' : '#ef4444'}; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold;">
                                ${r.status === 'OPEN' ? 'ABIERTA' : 'CERRADA'}
                            </span>
                        </td>
                        <td>${new Date(r.opened_at).toLocaleString()}</td>
                        <td style="color: var(--text-secondary);">${r.closed_at ? new Date(r.closed_at).toLocaleString() : 'En curso...'}</td>
                        <td style="font-weight: bold;">$${parseFloat(r.opening_balance_usd).toFixed(2)}</td>
                        <td style="font-weight: bold; color: ${r.status === 'OPEN' ? 'var(--text-secondary)' : 'inherit'};">$${r.closing_balance_usd !== null ? parseFloat(r.closing_balance_usd).toFixed(2) : '...'}</td>
                    </tr>
                `).join('');
            }
        } catch(e) {
            tableBody.innerHTML = '<tr><td colspan="6" style="color: var(--danger); text-align: center; padding: 20px;">Error al cargar historial.</td></tr>';
        }
    }
};
