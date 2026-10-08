export default {
    render: async () => `
        <h1>Respaldo y Exportación</h1>
        
        <div class="grid-2" style="margin-top: 20px;">
            <div class="panel">
                <h3 style="margin-bottom: 15px;">💾 Respaldo de Seguridad (.sql)</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 0.9em;">Guarda una copia exacta de la base de datos o restaura el sistema a un punto anterior.</p>
                <div style="display: flex; gap: 10px;">
                    <button id="btn-download-backup" class="btn-primary">⬇️ Descargar SQL</button>
                    <input type="file" id="upload-sql" accept=".sql" style="display: none;">
                    <button class="btn-outline" onclick="document.getElementById('upload-sql').click()">⬆️ Restaurar SQL</button>
                </div>
                <p id="restore-status" style="margin-top: 10px; font-weight: 500; font-size: 0.9em;"></p>
            </div>

            <div class="panel">
                <h3 style="margin-bottom: 15px;">📊 Exportar para Leer (Excel)</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 0.9em;">Descarga un archivo .xlsx para leer tu Inventario y Ventas fácilmente en Excel.</p>
                <button id="btn-download-excel" class="btn-primary" style="background: #10b981;">⬇️ Descargar Excel</button>
            </div>
        </div>
    `,
    afterRender: async () => {
        const btnSql = document.getElementById('btn-download-backup');
        const btnExcel = document.getElementById('btn-download-excel');
        const fileInput = document.getElementById('upload-sql');
        const statusEl = document.getElementById('restore-status');

        if (btnSql) {
            btnSql.addEventListener('click', () => {
                window.location.href = 'http://localhost:3000/api/settings/backup';
            });
        }

        if (btnExcel) {
            btnExcel.addEventListener('click', () => {
                window.location.href = 'http://localhost:3000/api/settings/excel';
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', async function() {
                if(this.files.length === 0) return;
                
                if(!confirm("⚠️ ADVERTENCIA: Esto sobreescribirá TODA la base de datos actual con los datos del respaldo. ¿Estás seguro?")) {
                    this.value = '';
                    return;
                }

                const file = this.files[0];
                statusEl.style.color = 'var(--text-primary)';
                statusEl.textContent = 'Restaurando ' + file.name + '... No cierres esta ventana.';

                const formData = new FormData();
                formData.append('file', file);

                try {
                    const response = await fetch('http://localhost:3000/api/settings/restore', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();

                    if(response.ok) {
                        statusEl.style.color = 'var(--success)';
                        statusEl.textContent = '¡Sistema restaurado con éxito!';
                    } else {
                        statusEl.style.color = 'var(--danger)';
                        statusEl.textContent = 'Error: ' + result.error;
                    }
                } catch(e) {
                    statusEl.style.color = 'var(--danger)';
                    statusEl.textContent = 'Error de conexión durante la restauración.';
                }
                
                this.value = '';
            });
        }
    }
};
