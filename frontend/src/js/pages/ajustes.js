export default {
    render: async () => `
        <h1>Negocio</h1>
        
        <div class="panel" style="margin-top: 20px; max-width: 800px;">
            <div class="input-group">
                <label>Nombre del establecimiento</label>
                <input type="text" class="input-control" value="Mi Negocio">
            </div>

            <div class="input-group">
                <label>Mensaje de bienvenida (pantalla de entrada)</label>
                <input type="text" class="input-control" value="Qué bueno verte. Entra con tu usuario para comenzar.">
            </div>

            <div class="grid-2">
                <div class="input-group">
                    <label>Símbolo de moneda principal</label>
                    <input type="text" class="input-control" value="$">
                </div>
                <div class="input-group">
                    <label>IVA por defecto %</label>
                    <input type="number" class="input-control" value="16">
                </div>
            </div>

            <div class="input-group">
                <label>Otros métodos de pago (separados por coma)</label>
                <input type="text" class="input-control" value="Transferencia, Tarjeta">
            </div>

            <p style="color: var(--text-secondary); font-size: 0.85em; margin-bottom: 20px;">
                Efectivo, pago móvil y crédito ya vienen incluidos. El efectivo se usa para el cuadre de caja.
            </p>

            <button class="btn-primary">Guardar</button>
        </div>

        <div class="panel" style="max-width: 800px;">
            <h3 style="font-family: var(--font-sans); font-size: 1.1em; margin-bottom: 20px;">Tasa de cambio</h3>
            
            <div class="grid-2">
                <div class="input-group">
                    <label>Moneda</label>
                    <select class="input-control">
                        <option>Bolívar (VES)</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>1 $ equivale a</label>
                    <input type="number" step="0.0001" id="ajustes-rate" class="input-control" value="0">
                </div>
            </div>

            <p id="ajustes-rate-label" style="color: var(--text-secondary); font-size: 0.85em; margin-bottom: 20px;">
                Moneda activa: Bolívar (1 $ = 0.00 VES). Con tasa 0 no se muestran precios en esa moneda.
            </p>

            <button id="btn-update-rate" class="btn-primary">Actualizar</button>
        </div>
    `,
    afterRender: async () => {
        const rateInput = document.getElementById('ajustes-rate');
        const rateLabel = document.getElementById('ajustes-rate-label');
        const btnUpdate = document.getElementById('btn-update-rate');

        // Load exchange rate
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                const rate = parseFloat(data.exchange_rate);
                rateInput.value = rate;
                rateLabel.textContent = `Moneda activa: Bolívar (1 $ = ${rate.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 4})} VES). Con tasa 0 no se muestran precios en esa moneda.`;
            }
        } catch(e) {
            console.error('Error cargando ajustes');
        }

        btnUpdate.addEventListener('click', async () => {
            const newRate = parseFloat(rateInput.value);
            if(isNaN(newRate) || newRate < 0) return alert('Tasa inválida');

            try {
                const res = await fetch('/api/settings/rate', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ exchange_rate: newRate })
                });

                if(res.ok) {
                    alert('Tasa de cambio actualizada correctamente');
                    rateLabel.textContent = `Moneda activa: Bolívar (1 $ = ${newRate.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 4})} VES). Con tasa 0 no se muestran precios en esa moneda.`;
                } else {
                    alert('Error al actualizar tasa');
                }
            } catch(e) {
                alert('Error de conexión');
            }
        });
    }
};
