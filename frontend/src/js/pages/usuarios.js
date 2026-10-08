export default {
    render: async () => `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h1>Usuarios del Sistema</h1>
            <button class="btn-primary" onclick="window.openUsuarioModal()">+ Nuevo Usuario</button>
        </div>

        <div class="panel">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Usuario</th>
                        <th>Rol</th>
                        <th>Fecha Creación</th>
                        <th style="text-align: right;">Acciones</th>
                    </tr>
                </thead>
                <tbody id="usuarios-body">
                    <tr><td colspan="5" style="text-align:center;">Cargando...</td></tr>
                </tbody>
            </table>
        </div>

        <!-- Modal Usuario -->
        <div id="modal-usuario" class="modal">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2 id="modal-usuario-title">Crear Usuario</h2>
                    <span class="close-modal" onclick="window.closeUsuarioModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="form-usuario">
                        <input type="hidden" id="user-id">
                        
                        <div class="input-group">
                            <label>Nombre de Usuario</label>
                            <input type="text" id="user-username" class="input-control" required>
                        </div>
                        
                        <div class="input-group" style="margin-top: 15px;">
                            <label>Contraseña <span id="pwd-hint" style="font-size:0.8em; color:#666;">(Déjalo en blanco para no cambiarla)</span></label>
                            <div style="position: relative; display: flex; align-items: center;">
                                <input type="password" id="user-password" class="input-control" style="width: 100%; padding-right: 40px;">
                                <button type="button" onclick="window.toggleUserPassword()" style="position: absolute; right: 10px; background: none; border: none; cursor: pointer; font-size: 1.2em; color: #666; padding: 0;">👁️</button>
                            </div>
                        </div>

                        <div class="input-group" style="margin-top: 15px;">
                            <label>Rol</label>
                            <select id="user-role" class="input-control" required>
                                <option value="CASHIER">Cajero (Solo ventas)</option>
                                <option value="ADMIN">Administrador (Control total)</option>
                            </select>
                        </div>
                        
                        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px;">
                            <button type="button" class="btn-outline" onclick="window.closeUsuarioModal()">Cancelar</button>
                            <button type="submit" class="btn-primary">Guardar Usuario</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `,
    afterRender: async () => {
        const tbody = document.getElementById('usuarios-body');
        const modal = document.getElementById('modal-usuario');
        const form = document.getElementById('form-usuario');
        let usuarios = [];

        const loadUsuarios = async () => {
            try {
                const res = await fetch('http://localhost:3000/api/users');
                if(!res.ok) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:red;">Acceso Denegado o Error de red</td></tr>';
                    return;
                }
                usuarios = await res.json();
                renderTable();
            } catch (error) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Error cargando usuarios</td></tr>';
            }
        };

        const renderTable = () => {
            tbody.innerHTML = usuarios.map(u => `
                <tr>
                    <td>#${u.id}</td>
                    <td><strong>${u.username}</strong></td>
                    <td>
                        <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.85em; background: ${u.role === 'ADMIN' ? 'var(--accent-color)' : 'var(--primary-color)'}; color: white;">
                            ${u.role === 'ADMIN' ? 'Administrador' : 'Cajero'}
                        </span>
                    </td>
                    <td>${new Date(u.created_at).toLocaleDateString()}</td>
                    <td style="text-align: right;">
                        <button class="btn-outline" style="padding: 4px 8px;" onclick="window.editUsuario(${u.id})">Editar</button>
                        ${u.id !== 1 ? `<button class="btn-outline" style="padding: 4px 8px; color: var(--danger); border-color: var(--danger);" onclick="window.deleteUsuario(${u.id})">Eliminar</button>` : ''}
                    </td>
                </tr>
            `).join('');
        };

        window.openUsuarioModal = () => {
            document.getElementById('modal-usuario-title').textContent = 'Crear Usuario';
            document.getElementById('pwd-hint').style.display = 'none';
            document.getElementById('user-password').required = true;
            form.reset();
            document.getElementById('user-id').value = '';
            modal.classList.add('show');
        };

        window.closeUsuarioModal = () => {
            modal.classList.remove('show');
        };

        window.toggleUserPassword = () => {
            const pwdInput = document.getElementById('user-password');
            const btn = pwdInput.nextElementSibling;
            if (pwdInput.type === 'password') {
                pwdInput.type = 'text';
                btn.textContent = '🙈';
            } else {
                pwdInput.type = 'password';
                btn.textContent = '👁️';
            }
        };

        window.editUsuario = (id) => {
            const u = usuarios.find(x => x.id === id);
            if(!u) return;
            document.getElementById('modal-usuario-title').textContent = 'Editar Usuario';
            document.getElementById('pwd-hint').style.display = 'inline';
            document.getElementById('user-password').required = false;
            
            document.getElementById('user-id').value = u.id;
            document.getElementById('user-username').value = u.username;
            document.getElementById('user-role').value = u.role;
            document.getElementById('user-password').value = '';
            
            modal.classList.add('show');
        };

        window.deleteUsuario = async (id) => {
            if(confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
                try {
                    const res = await fetch(`http://localhost:3000/api/users/${id}`, { method: 'DELETE' });
                    if(res.ok) {
                        loadUsuarios();
                    } else {
                        const data = await res.json();
                        alert(data.error || 'Error eliminando');
                    }
                } catch(e) {
                    alert('Error de red');
                }
            }
        };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('user-id').value;
            const payload = {
                username: document.getElementById('user-username').value,
                role: document.getElementById('user-role').value
            };
            
            const pwd = document.getElementById('user-password').value;
            if (pwd) payload.password = pwd;

            try {
                const url = id ? `http://localhost:3000/api/users/${id}` : 'http://localhost:3000/api/users';
                const method = id ? 'PUT' : 'POST';
                
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (res.ok) {
                    window.closeUsuarioModal();
                    loadUsuarios();
                } else {
                    const data = await res.json();
                    alert(data.error || 'Error al guardar');
                }
            } catch (error) {
                alert('Error de red');
            }
        });

        loadUsuarios();
    }
};
