import { initRouter } from './router/index.js';
import { initAuth } from './auth.js';

// Intercept fetch to add token
const originalFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
    let [resource, config] = args;
    if (typeof resource === 'string' && resource.includes('/api/')) {
        const token = localStorage.getItem('pos_token');
        if (token) {
            config = config || {};
            config.headers = config.headers || {};
            config.headers['Authorization'] = `Bearer ${token}`;
        }
    }
    const response = await originalFetch(resource, config);
    if (response.status === 401 && !resource.includes('/api/auth/login')) {
        // Token expired or invalid
        if(window.logout) window.logout();
    }
    return response;
};

// Como es type="module", el DOM ya está parseado cuando esto se ejecuta.
initAuth().then(isAuthenticated => {
    // We can init router anyway, but if not authenticated it just hides the app container.
    initRouter();
});
