export default {
    render: async () => `
        <style>
            .product-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 15px;
                padding-top: 15px;
            }
            .product-card {
                background: white;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 15px;
                cursor: pointer;
                transition: transform 0.1s, box-shadow 0.1s;
                text-align: center;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                height: 120px;
            }
            .product-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                border-color: var(--accent-color);
            }
            .product-card.out-of-stock {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .cart-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 0;
                border-bottom: 1px solid var(--border-color);
            }
            .qty-btn {
                background: var(--bg-color);
                border: 1px solid var(--border-color);
                border-radius: 4px;
                width: 28px;
                height: 28px;
                cursor: pointer;
                font-weight: bold;
            }
            .qty-btn:hover {
                background: var(--border-color);
            }
        </style>

        <div id="pos-setup">
            <h1>Punto de venta</h1>
            <div class="panel" style="max-width: 600px; margin-top: 20px;">
                <h3 style="font-family: var(--font-sans); font-size: 1.1em; margin-bottom: 10px;">Tu caja está cerrada</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">Ingresa el efectivo inicial para comenzar a vender.</p>
                
                <div class="input-group">
                    <label>Efectivo inicial en $</label>
                    <input type="number" id="efectivo-inicial" class="input-control" value="0" step="0.01">
                </div>
                
                <button id="btn-abrir-caja" class="btn-primary" style="margin-top: 10px;">Abrir caja</button>
            </div>
        </div>

        <div id="pos-main" style="display: none; height: calc(100vh - 80px);">
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; height: 100%;">
                
                <!-- Left side: Products -->
                <div style="display: flex; flex-direction: column;">
                    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                        <input type="text" id="pos-search" class="input-control" placeholder="Buscar producto o escanear código de barras..." style="flex: 1; font-size: 1.1em; padding: 15px;">
                    </div>
                    <div class="panel" style="flex: 1; overflow-y: auto;">
                        <div id="pos-products" class="product-grid">
                            <p style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center; margin-top: 50px;">Cargando productos...</p>
                        </div>
                    </div>
                </div>

                <!-- Right side: Cart -->
                <div class="panel" style="display: flex; flex-direction: column; margin-bottom: 0;">
                    <h2 style="font-family: var(--font-sans); font-size: 1.2em; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; margin-bottom: 15px;">Ticket de Venta</h2>
                    
                    <div id="pos-cart" style="flex: 1; overflow-y: auto;">
                        <p style="color: var(--text-secondary); text-align: center; font-size: 0.9em; margin-top: 20px;">El carrito está vacío</p>
                    </div>

                    <div style="border-top: 1px solid var(--border-color); padding-top: 15px; margin-top: 15px;">
                        <div style="display: flex; justify-content: space-between; font-size: 1.2em; font-weight: bold; margin-bottom: 5px;">
                            <span>Total USD:</span>
                            <span id="pos-total-usd">$0.00</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 1.1em; color: var(--text-secondary); margin-bottom: 15px;">
                            <span id="pos-rate-label">Total VES:</span>
                            <span id="pos-total-ves">Bs. 0,00</span>
                        </div>
                        <button id="btn-cobrar" class="btn-primary" style="width: 100%; padding: 15px; font-size: 1.1em; background: var(--success);" disabled>Cobrar</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Checkout Modal -->
        <div id="modal-checkout" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
            <div class="panel" style="width: 100%; max-width: 400px; margin: 20px;">
                <h2 style="margin-bottom: 20px; text-align: center;">Completar Pago</h2>
                
                <div style="background: var(--bg-color); padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 2em; font-weight: bold; color: var(--success);" id="checkout-total-usd">$0.00</div>
                    <div style="color: var(--text-secondary);" id="checkout-total-ves">Bs. 0,00</div>
                </div>

                <div class="input-group">
                    <label>Método de Pago</label>
                    <select id="checkout-method" class="input-control">
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="PAGO_MOVIL">Pago Móvil</option>
                        <option value="PUNTO_VENTA">Punto de Venta / Tarjeta</option>
                        <option value="CREDITO">Crédito (Fiar)</option>
                    </select>
                </div>

                <div id="client-section" class="input-group" style="display: none;">
                    <label>Seleccionar Cliente (Requerido para Crédito)</label>
                    <select id="checkout-client" class="input-control">
                        <option value="">-- Seleccione un cliente --</option>
                    </select>
                </div>

                <div style="display: flex; justify-content: space-between; gap: 10px; margin-top: 20px;">
                    <button type="button" class="btn-outline" id="btn-cancel-checkout" style="flex: 1;">Cancelar</button>
                    <button type="button" class="btn-primary" id="btn-confirm-checkout" style="flex: 1; background: var(--success);">Confirmar</button>
                </div>
            </div>
        </div>
    `,
    afterRender: async () => {
        const setupDiv = document.getElementById('pos-setup');
        const mainDiv = document.getElementById('pos-main');
        const btnAbrir = document.getElementById('btn-abrir-caja');
        const inputEfectivo = document.getElementById('efectivo-inicial');
        const productsContainer = document.getElementById('pos-products');
        const cartContainer = document.getElementById('pos-cart');
        const searchInput = document.getElementById('pos-search');
        
        const totalUsdEl = document.getElementById('pos-total-usd');
        const totalVesEl = document.getElementById('pos-total-ves');
        const rateLabelEl = document.getElementById('pos-rate-label');
        const btnCobrar = document.getElementById('btn-cobrar');

        const modalCheckout = document.getElementById('modal-checkout');
        const btnCancelCheckout = document.getElementById('btn-cancel-checkout');
        const btnConfirmCheckout = document.getElementById('btn-confirm-checkout');
        const checkoutMethod = document.getElementById('checkout-method');
        const clientSection = document.getElementById('client-section');
        const checkoutClient = document.getElementById('checkout-client');

        let products = [];
        let cart = [];
        let exchangeRate = 36.5;

        // Fetch settings for exchange rate
        try {
            const res = await fetch('http://localhost:3000/api/settings');
            if (res.ok) {
                const data = await res.json();
                exchangeRate = parseFloat(data.exchange_rate) || 1;
                rateLabelEl.textContent = `Total VES (Tasa: ${exchangeRate}):`;
            }
        } catch(e) { console.error('Error fetching settings', e); }

        // Fetch clients
        const loadClients = async () => {
            try {
                const res = await fetch('http://localhost:3000/api/credits/clients');
                if (res.ok) {
                    const clients = await res.json();
                    checkoutClient.innerHTML = '<option value="">-- Seleccione un cliente --</option>' + 
                        clients.map(c => `<option value="${c.id}">${c.name} - ${c.document_id}</option>`).join('');
                }
            } catch(e) {}
        };

        const updateCartTotal = () => {
            const totalUsd = cart.reduce((sum, item) => sum + (item.price_usd * item.qty), 0);
            const totalVes = totalUsd * exchangeRate;
            
            totalUsdEl.textContent = `$${totalUsd.toFixed(2)}`;
            totalVesEl.textContent = `Bs. ${totalVes.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            
            document.getElementById('checkout-total-usd').textContent = `$${totalUsd.toFixed(2)}`;
            document.getElementById('checkout-total-ves').textContent = `Bs. ${totalVes.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

            btnCobrar.disabled = cart.length === 0;
            renderCart();
        };

        const renderCart = () => {
            if (cart.length === 0) {
                cartContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; font-size: 0.9em; margin-top: 20px;">El carrito está vacío</p>';
                return;
            }

            cartContainer.innerHTML = cart.map((item, index) => `
                <div class="cart-item">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; font-size: 0.9em;">${item.name}</div>
                        <div style="color: var(--text-secondary); font-size: 0.8em;">$${parseFloat(item.price_usd).toFixed(2)} c/u</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button class="qty-btn" onclick="window.posUpdateQty(${index}, -1)">-</button>
                        <span style="min-width: 20px; text-align: center;">${item.qty}</span>
                        <button class="qty-btn" onclick="window.posUpdateQty(${index}, 1)">+</button>
                    </div>
                    <div style="font-weight: bold; width: 60px; text-align: right;">
                        $${(item.price_usd * item.qty).toFixed(2)}
                    </div>
                </div>
            `).join('');
        };

        window.posUpdateQty = (index, delta) => {
            cart[index].qty += delta;
            if (cart[index].qty <= 0) {
                cart.splice(index, 1);
            } else {
                // Check stock limit
                const prod = products.find(p => p.id === cart[index].id);
                if (prod && cart[index].qty > prod.stock) {
                    cart[index].qty = parseFloat(prod.stock);
                    alert('No hay suficiente stock');
                }
            }
            updateCartTotal();
        };

        const addToCart = (product) => {
            if (parseFloat(product.stock) <= 0) {
                alert('Producto agotado');
                return;
            }

            const existing = cart.find(i => i.id === product.id);
            if (existing) {
                if (existing.qty < product.stock) {
                    existing.qty += 1;
                } else {
                    alert('No hay más stock disponible');
                }
            } else {
                cart.push({ ...product, qty: 1 });
            }
            updateCartTotal();
        };

        const renderProducts = (search = '') => {
            const filtered = products.filter(p => 
                p.name.toLowerCase().includes(search.toLowerCase()) || 
                (p.barcode && p.barcode.includes(search))
            );

            if (filtered.length === 0) {
                productsContainer.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center; margin-top: 50px;">No se encontraron productos</p>';
                return;
            }

            productsContainer.innerHTML = filtered.map(p => {
                const isOutOfStock = parseFloat(p.stock) <= 0;
                const stockDisplay = parseFloat(p.stock).toString(); // Quita los .00 si es entero
                return `
                <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" onclick="${isOutOfStock ? '' : `window.posAddToCart(${p.id})`}">
                    <div style="font-size: 0.8em; color: var(--text-secondary); text-align: left;">${stockDisplay} disp.</div>
                    <div style="font-weight: 500; font-size: 0.95em; margin: 10px 0;">${p.name}</div>
                    <div style="color: var(--success); font-weight: bold;">$${parseFloat(p.price_usd).toFixed(2)}</div>
                </div>
            `}).join('');
        };

        window.posAddToCart = (id) => {
            const p = products.find(x => x.id === id);
            if(p) addToCart(p);
        };

        const loadProducts = async () => {
            try {
                const res = await fetch('http://localhost:3000/api/inventory');
                if (res.ok) {
                    products = await res.json();
                    renderProducts();
                }
            } catch(e) {
                productsContainer.innerHTML = '<p style="color: var(--danger); grid-column: 1 / -1; text-align: center;">Error al cargar inventario</p>';
            }
        };

        // Initialize POS
        const initPOS = () => {
            setupDiv.style.display = 'none';
            mainDiv.style.display = 'block';
            loadProducts();
            loadClients();
        };

        // Check register status
        try {
            const res = await fetch('http://localhost:3000/api/registers/status');
            if (res.ok) {
                const data = await res.json();
                if (data.isOpen) initPOS();
            }
        } catch(e) { console.error('Error checking register status', e); }

        if(btnAbrir) {
            btnAbrir.addEventListener('click', async () => {
                const amount = inputEfectivo.value || 0;
                try {
                    const res = await fetch('http://localhost:3000/api/registers/open', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ opening_balance_usd: amount })
                    });
                    if(res.ok) initPOS();
                    else alert('Error al abrir la caja');
                } catch(e) { alert('Error de conexión al abrir la caja'); }
            });
        }

        searchInput.addEventListener('input', (e) => {
            renderProducts(e.target.value);
        });

        // Checkout logic
        btnCobrar.addEventListener('click', () => {
            checkoutMethod.value = 'EFECTIVO';
            clientSection.style.display = 'none';
            modalCheckout.style.display = 'flex';
        });

        btnCancelCheckout.addEventListener('click', () => {
            modalCheckout.style.display = 'none';
        });

        checkoutMethod.addEventListener('change', (e) => {
            clientSection.style.display = e.target.value === 'CREDITO' ? 'block' : 'none';
        });

        btnConfirmCheckout.addEventListener('click', async () => {
            const method = checkoutMethod.value;
            let clientId = null;
            
            if (method === 'CREDITO') {
                clientId = checkoutClient.value;
                if (!clientId) return alert('Debes seleccionar un cliente para fiar la mercancía.');
            }

            const totalUsd = cart.reduce((sum, item) => sum + (item.price_usd * item.qty), 0);
            const totalVes = totalUsd * exchangeRate;

            const saleData = {
                total_usd: totalUsd,
                total_ves: totalVes,
                exchange_rate: exchangeRate,
                payment_method: method,
                client_id: clientId,
                items: cart.map(i => ({
                    product_id: i.id,
                    quantity: i.qty,
                    price_usd: i.price_usd
                }))
            };

            try {
                const res = await fetch('http://localhost:3000/api/sales', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(saleData)
                });

                if (res.ok) {
                    alert('✅ Venta completada con éxito');
                    cart = [];
                    updateCartTotal();
                    modalCheckout.style.display = 'none';
                    loadProducts(); // reload stock
                } else {
                    const err = await res.json();
                    alert(err.error || 'Error al procesar la venta');
                }
            } catch(e) {
                alert('Error de conexión procesando la venta');
            }
        });
    }
};
