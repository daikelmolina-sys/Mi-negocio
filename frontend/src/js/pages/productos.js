export default {
    render: async () => `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
                <h1 style="margin-bottom: 5px;">Productos <span id="total-products-badge" style="font-size: 0.5em; background: var(--border-color); padding: 4px 10px; border-radius: 20px; vertical-align: middle;">Calculando...</span></h1>
                <p style="color: var(--text-secondary);">Empecemos a llenar tu inventario</p>
            </div>
            <button class="btn-primary" id="btn-add-product-top">+ Agregar producto</button>
        </div>
        
        <input type="text" class="input-control" id="search-products" placeholder="Buscar por nombre, código o categoría" style="margin-bottom: 24px;">

        <div class="panel">
            <h3 style="font-family: var(--font-sans); font-size: 1.1em; margin-bottom: 10px;">Carga de Productos</h3>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">Agrega productos manualmente o utiliza la herramienta de importación para cargar toda tu base de datos desde un archivo Excel (.xlsx).</p>
            
            <div style="display: flex; gap: 15px; align-items: center;">
                <button class="btn-primary" id="btn-add-product-first">+ Agregar mi primer producto</button>
                <input type="file" id="excel-upload" accept=".xlsx, .xls" style="display: none;">
                <button class="btn-outline" onclick="document.getElementById('excel-upload').click()">📥 Importar desde Excel</button>
                <span id="upload-status" style="font-weight: 500; font-size: 0.9em;"></span>
            </div>
        </div>

        <div class="panel" style="padding: 0; overflow-x: auto;">
            <table>
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nombre del Producto</th>
                        <th>Categoría</th>
                        <th>Costo $</th>
                        <th>Precio $</th>
                        <th>Stock</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="products-table">
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 20px; color: var(--text-secondary);">Cargando productos...</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Modal Agregar Producto -->
        <div id="modal-product" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
            <div class="panel" style="width: 100%; max-width: 500px; margin: 20px;">
                <h2 style="margin-bottom: 20px;" id="modal-title">Nuevo Producto</h2>
                <form id="form-product">
                    <input type="hidden" id="prod-id">
                    <div class="input-group">
                        <label>Código de barras</label>
                        <input type="text" id="prod-barcode" class="input-control">
                    </div>
                    <div class="input-group">
                        <label>Nombre del producto *</label>
                        <input type="text" id="prod-name" class="input-control" required>
                    </div>
                    <div class="input-group">
                        <label>Categoría</label>
                        <input type="text" id="prod-category" class="input-control">
                    </div>
                    <div class="grid-3" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                        <div class="input-group">
                            <label>Costo ($)</label>
                            <input type="number" id="prod-cost" step="0.01" class="input-control" value="0">
                        </div>
                        <div class="input-group">
                            <label>Precio Venta ($) *</label>
                            <input type="number" id="prod-price" step="0.01" class="input-control" required>
                        </div>
                        <div class="input-group">
                            <label>Stock inicial</label>
                            <input type="number" id="prod-stock" class="input-control" value="0">
                        </div>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                        <button type="button" class="btn-outline" id="btn-cancel-product">Cancelar</button>
                        <button type="submit" class="btn-primary">Guardar Producto</button>
                    </div>
                </form>
            </div>
        </div>
    `,
    afterRender: async () => {
        const fileInput = document.getElementById('excel-upload');
        const statusEl = document.getElementById('upload-status');
        const tableBody = document.getElementById('products-table');
        const searchInput = document.getElementById('search-products');
        const badge = document.getElementById('total-products-badge');

        const modal = document.getElementById('modal-product');
        const form = document.getElementById('form-product');
        const btnAddTop = document.getElementById('btn-add-product-top');
        const btnAddFirst = document.getElementById('btn-add-product-first');
        const btnCancel = document.getElementById('btn-cancel-product');
        const modalTitle = document.getElementById('modal-title');

        let currentProducts = [];

        const loadProducts = async (search = '') => {
            try {
                const res = await fetch(`http://localhost:3000/api/inventory?search=${encodeURIComponent(search)}`);
                if (res.ok) {
                    currentProducts = await res.json();
                    badge.textContent = `Total: ${currentProducts.length}`;
                    
                    if(currentProducts.length === 0) {
                        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-secondary);">No se encontraron productos.</td></tr>';
                        return;
                    }

                    tableBody.innerHTML = currentProducts.map(p => `
                        <tr>
                            <td style="color: var(--text-secondary); font-family: monospace;">${p.barcode || '-'}</td>
                            <td style="font-weight: 500;">${p.name}</td>
                            <td><span style="background: var(--accent-light); color: var(--accent-color); padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">${p.category || 'Sin categoría'}</span></td>
                            <td style="color: var(--text-secondary);">$${parseFloat(p.cost_usd || 0).toFixed(2)}</td>
                            <td style="font-weight: bold; color: var(--success);">$${parseFloat(p.price_usd).toFixed(2)}</td>
                            <td>${p.stock}</td>
                            <td>
                                <button class="btn-outline btn-edit" data-id="${p.id}" style="padding: 4px 8px; font-size: 0.8em; margin-right: 5px;">Editar</button>
                                <button class="btn-outline btn-delete" data-id="${p.id}" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3); padding: 4px 8px; font-size: 0.8em;">Eliminar</button>
                            </td>
                        </tr>
                    `).join('');

                    document.querySelectorAll('.btn-edit').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const id = parseInt(e.target.getAttribute('data-id'));
                            const p = currentProducts.find(x => x.id === id);
                            if(p) {
                                document.getElementById('prod-id').value = p.id;
                                document.getElementById('prod-barcode').value = p.barcode || '';
                                document.getElementById('prod-name').value = p.name || '';
                                document.getElementById('prod-category').value = p.category || '';
                                document.getElementById('prod-cost').value = p.cost_usd || 0;
                                document.getElementById('prod-price').value = p.price_usd || 0;
                                document.getElementById('prod-stock').value = p.stock || 0;
                                modalTitle.textContent = 'Editar Producto';
                                modal.style.display = 'flex';
                            }
                        });
                    });

                    document.querySelectorAll('.btn-delete').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            if(confirm('¿Estás totalmente seguro de eliminar este producto del inventario?')) {
                                const id = e.target.getAttribute('data-id');
                                try {
                                    const delRes = await fetch(`http://localhost:3000/api/inventory/${id}`, { method: 'DELETE' });
                                    if(delRes.ok) {
                                        loadProducts(searchInput.value); // reload table
                                    } else {
                                        const err = await delRes.json();
                                        alert(err.error || 'No se pudo eliminar');
                                    }
                                } catch(err) {
                                    alert('Error de red al eliminar');
                                }
                            }
                        });
                    });
                }
            } catch (e) {
                console.error(e);
                tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--danger);">Error cargando productos.</td></tr>';
            }
        };

        loadProducts();

        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => loadProducts(e.target.value), 300);
        });

        const openModal = () => {
            form.reset();
            document.getElementById('prod-id').value = '';
            modalTitle.textContent = 'Nuevo Producto';
            modal.style.display = 'flex';
        };
        const closeModal = () => modal.style.display = 'none';

        if(btnAddTop) btnAddTop.addEventListener('click', openModal);
        if(btnAddFirst) btnAddFirst.addEventListener('click', openModal);
        if(btnCancel) btnCancel.addEventListener('click', closeModal);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('prod-id').value;
            const productData = {
                barcode: document.getElementById('prod-barcode').value,
                name: document.getElementById('prod-name').value,
                category: document.getElementById('prod-category').value,
                cost_usd: document.getElementById('prod-cost').value,
                price_usd: document.getElementById('prod-price').value,
                stock: document.getElementById('prod-stock').value
            };

            try {
                let res;
                if(id) {
                    // Update
                    res = await fetch(`http://localhost:3000/api/inventory/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(productData)
                    });
                } else {
                    // Create
                    res = await fetch('http://localhost:3000/api/inventory', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(productData)
                    });
                }
                
                if (res.ok) {
                    closeModal();
                    loadProducts(searchInput.value);
                } else {
                    alert('Error al guardar el producto');
                }
            } catch(e) {
                alert('Error de red al guardar');
            }
        });

        if(fileInput) {
            fileInput.addEventListener('change', async function() {
                if(this.files.length === 0) return;
                
                const file = this.files[0];
                statusEl.style.color = 'var(--text-primary)';
                statusEl.textContent = 'Subiendo ' + file.name + '...';

                const formData = new FormData();
                formData.append('file', file);

                try {
                    const response = await fetch('http://localhost:3000/api/inventory/bulk-upload', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();

                    if(response.ok) {
                        statusEl.style.color = 'var(--success)';
                        statusEl.textContent = '¡Éxito! Productos importados/actualizados correctamente.';
                        loadProducts();
                    } else {
                        statusEl.style.color = 'var(--danger)';
                        statusEl.textContent = 'Error: ' + result.error;
                    }
                } catch(e) {
                    statusEl.style.color = 'var(--danger)';
                    statusEl.textContent = 'Error de conexión';
                }
                
                this.value = '';
            });
        }
    }
};
