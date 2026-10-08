import Dashboard from '../pages/dashboard.js';
import Pos from '../pages/pos.js';
import Productos from '../pages/productos.js';
import Inventory from '../pages/inventory.js';
import Reportes from '../pages/reportes.js';
import Creditos from '../pages/creditos.js';
import Cajas from '../pages/cajas.js';
import Usuarios from '../pages/usuarios.js';
import Ajustes from '../pages/ajustes.js';
import Respaldo from '../pages/respaldo.js';

const routes = {
    '/': Dashboard,
    '/venta': Pos,
    '/productos': Productos,
    '/inventario': Inventory,
    '/reportes': Reportes,
    '/creditos': Creditos,
    '/cajas': Cajas,
    '/usuarios': Usuarios,
    '/ajustes': Ajustes,
    '/respaldo': Respaldo
};

export const initRouter = () => {
    const appContainer = document.getElementById('app');

    const navigateTo = async (url) => {
        window.history.pushState(null, null, url);
        await router();
    };

    const router = async () => {
        const path = window.location.pathname;
        const page = routes[path] || Dashboard;
        
        appContainer.innerHTML = await page.render();
        if (page.afterRender) {
            await page.afterRender();
        }

        document.querySelectorAll('#sidebar-nav a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === path) {
                link.classList.add('active');
            }
        });
        
        if(!document.querySelector('#sidebar-nav a.active')){
            document.querySelector('#sidebar-nav a[href="/"]').classList.add('active');
        }
    };

    window.addEventListener('popstate', router);

    document.addEventListener('click', e => {
        if (e.target.matches('[data-link]') || e.target.closest('[data-link]')) {
            e.preventDefault();
            const link = e.target.matches('[data-link]') ? e.target : e.target.closest('[data-link]');
            navigateTo(link.href);
        }
    });

    router();
};
