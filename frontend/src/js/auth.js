export const initAuth = async () => {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    const formLogin = document.getElementById('form-login');
    const loginError = document.getElementById('login-error');

    if (!loginScreen || !mainApp || !formLogin) {
        alert("¡Aviso! Tu navegador está usando una versión vieja de la página. Por favor presiona Ctrl + F5 para actualizar completamente.");
        return false;
    }
    
    // Check if user is logged in
    const checkAuth = async () => {
        const token = localStorage.getItem('pos_token');
        if (!token) return false;

        try {
            const res = await fetch('http://localhost:3000/api/auth/verify', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                window.currentUser = data.user;
                return true;
            }
        } catch (e) {
            console.error('Error verifying token', e);
        }
        return false;
    };

    const showApp = () => {
        loginScreen.style.display = 'none';
        mainApp.style.display = 'flex'; // app-container is usually flex or block
        
        // Update sidebar
        const sidebarFooter = document.querySelector('.sidebar-footer strong');
        if (sidebarFooter && window.currentUser) {
            sidebarFooter.innerHTML = `${window.currentUser.username} <br><span style="font-size:0.8em; font-weight:normal">${window.currentUser.role}</span>`;
            
            // Hide admin links if cashier
            const isAdmin = window.currentUser.role === 'ADMIN';
            const adminLinks = ['nav-productos', 'nav-inventario', 'nav-reportes', 'nav-usuarios', 'nav-ajustes', 'nav-respaldo'];
            adminLinks.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.style.display = isAdmin ? 'flex' : 'none';
            });
            
            // Si es cajero y está en una ruta prohibida, enviarlo a inicio
            if (!isAdmin) {
                const currentPath = window.location.pathname;
                const adminPaths = ['/productos', '/inventario', '/reportes', '/usuarios', '/ajustes', '/respaldo'];
                if (adminPaths.includes(currentPath)) {
                    window.history.pushState(null, null, '/venta');
                    // Router will handle it or dispatch event
                }
            }
        }
    };

    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        loginError.style.display = 'none';

        try {
            const res = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                localStorage.setItem('pos_token', data.token);
                window.currentUser = data.user;
                showApp();
                // Optionally dispatch an event so router can load the initial view properly
                window.dispatchEvent(new Event('auth-success'));
            } else {
                loginError.textContent = data.error || 'Credenciales incorrectas';
                loginError.style.display = 'block';
            }
        } catch (e) {
            loginError.textContent = 'Error de red';
            loginError.style.display = 'block';
        }
    });

    // Logout function
    window.logout = () => {
        localStorage.removeItem('pos_token');
        window.currentUser = null;
        mainApp.style.display = 'none';
        loginScreen.style.display = 'flex';
    };

    // Initial check
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        showApp();
        return true;
    } else {
        loginScreen.style.display = 'flex';
        return false;
    }
};
