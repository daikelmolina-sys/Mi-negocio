export default {
    render: async () => `
        <h1>Créditos</h1>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">Gestiona las cuentas por cobrar. Solo aparecerán aquí los clientes que tengan deudas activas.</p>
        
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
            <button class="btn-primary" id="btn-add-client">+ Nuevo cliente (Directorio)</button>
        </div>

        <div class="panel">
            <table>
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Deuda $</th>
                        <th>Deuda Bs</th>
                        <th>Vencimiento</th>
                        <th>Estado</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody id="credits-table">
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">Cargando créditos...</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Modal Agregar Cliente -->
        <div id="modal-client" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
            <div class="panel" style="width: 100%; max-width: 400px; margin: 20px;">
                <h2 style="margin-bottom: 20px;">Registrar Cliente</h2>
                <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9em;">El cliente no aparecerá en la tabla hasta que le proceses una venta a crédito en la Caja.</p>
                <form id="form-client">
                    <div class="input-group">
                        <label>Nombre del cliente *</label>
                        <input type="text" id="client-name" class="input-control" required>
                    </div>
                    <div class="input-group">
                        <label>Cédula / RIF *</label>
                        <input type="text" id="client-doc" class="input-control" required>
                    </div>
                    <div class="input-group">
                        <label>Teléfono</label>
                        <input type="text" id="client-phone" class="input-control">
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                        <button type="button" class="btn-outline" id="btn-cancel-client">Cancelar</button>
                        <button type="submit" class="btn-primary">Guardar en Directorio</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal Abonar -->
        <div id="modal-pay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
            <div class="panel" style="width: 100%; max-width: 350px; margin: 20px;">
                <h2 style="margin-bottom: 20px;">Abonar a Deuda</h2>
                <p style="margin-bottom: 10px;">Cliente: <strong id="pay-client-name"></strong></p>
                <p style="margin-bottom: 20px; color: var(--danger);">Deuda total: $<strong id="pay-client-debt"></strong></p>
                
                <div class="input-group">
                    <label>Monto a abonar ($)</label>
                    <input type="number" id="pay-amount" class="input-control" step="0.01" min="0.01">
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-top: 25px;">
                    <button type="button" class="btn-outline" id="btn-cancel-pay">Cancelar</button>
                    <div style="display: flex; gap: 10px;">
                        <button type="button" class="btn-primary" style="background: var(--accent-color);" id="btn-submit-pay">Abonar</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    afterRender: async () => {
        const tableBody = document.getElementById('credits-table');
        
        // Modals
        const modalClient = document.getElementById('modal-client');
        const modalPay = document.getElementById('modal-pay');
        
        let currentCreditId = null;

        const loadCredits = async () => {
            try {
                const res = await fetch('http://localhost:3000/api/credits');
                if(res.ok) {
                    const credits = await res.json();
                    
                    // Filter out fully paid credits if desired, but let's show all or just PENDING
                    const pendingCredits = credits.filter(c => c.status !== 'PAID');

                    if(pendingCredits.length === 0) {
                        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 20px;">No hay deudas pendientes en este momento.</td></tr>';
                        return;
                    }
                    
                    tableBody.innerHTML = pendingCredits.map(c => `
                        <tr>
                            <td style="font-weight: 500;">${c.client_name}</td>
                            <td style="color: #ef4444; font-weight: bold;">$${parseFloat(c.amount_usd).toFixed(2)}</td>
                            <td>Bs. ${parseFloat(c.amount_ves).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td>${c.due_date ? new Date(c.due_date).toLocaleDateString() : '-'}</td>
                            <td>
                                <span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">PENDIENTE</span>
                            </td>
                            <td>
                                <div style="display: flex; gap: 5px;">
                                    <button class="btn-outline btn-abonar" data-id="${c.id}" data-name="${c.client_name}" data-debt="${c.amount_usd}" style="padding: 4px 8px; font-size: 0.85em;">Abonar</button>
                                    <button class="btn-outline btn-liquidar" data-id="${c.id}" style="padding: 4px 8px; font-size: 0.85em; color: var(--success); border-color: rgba(16, 185, 129, 0.3);">Liquidar</button>
                                </div>
                            </td>
                        </tr>
                    `).join('');

                    // Attach abonar events
                    document.querySelectorAll('.btn-abonar').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            currentCreditId = e.target.getAttribute('data-id');
                            document.getElementById('pay-client-name').textContent = e.target.getAttribute('data-name');
                            document.getElementById('pay-client-debt').textContent = parseFloat(e.target.getAttribute('data-debt')).toFixed(2);
                            document.getElementById('pay-amount').value = '';
                            modalPay.style.display = 'flex';
                        });
                    });

                    // Attach liquidar events
                    document.querySelectorAll('.btn-liquidar').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            if(confirm('¿Estás seguro de que este cliente ya pagó TODA la deuda?')) {
                                const id = e.target.getAttribute('data-id');
                                await processPayment(id, null);
                            }
                        });
                    });
                }
            } catch(e) {
                console.error(e);
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger); padding: 20px;">Error cargando créditos</td></tr>';
            }
        };

        const processPayment = async (id, amount) => {
            try {
                const res = await fetch(`http://localhost:3000/api/credits/${id}/pay`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ amount_usd: amount })
                });
                if(res.ok) {
                    modalPay.style.display = 'none';
                    loadCredits();
                } else {
                    alert('Error al procesar el pago');
                }
            } catch(err) {
                alert('Error de conexión');
            }
        };

        document.getElementById('btn-submit-pay').addEventListener('click', async () => {
            const amount = document.getElementById('pay-amount').value;
            if(!amount || parseFloat(amount) <= 0) return alert('Ingresa un monto válido');
            await processPayment(currentCreditId, parseFloat(amount));
        });

        loadCredits();

        // Client Modal
        const form = document.getElementById('form-client');
        
        document.getElementById('btn-add-client').addEventListener('click', () => {
            form.reset();
            modalClient.style.display = 'flex';
        });
        
        document.getElementById('btn-cancel-client').addEventListener('click', () => modalClient.style.display = 'none');
        document.getElementById('btn-cancel-pay').addEventListener('click', () => modalPay.style.display = 'none');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                name: document.getElementById('client-name').value,
                document_id: document.getElementById('client-doc').value,
                phone: document.getElementById('client-phone').value
            };

            try {
                const res = await fetch('http://localhost:3000/api/credits/client', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                if(res.ok) {
                    modalClient.style.display = 'none';
                    alert('Cliente creado exitosamente en el directorio. ¡Ahora puedes fiarle en la pantalla de Ventas!');
                } else {
                    const err = await res.json();
                    alert(err.error || 'Error al crear cliente');
                }
            } catch(err) {
                alert('Error de conexión');
            }
        });
    }
};
