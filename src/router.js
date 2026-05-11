// src/router.js
// ─── Router de cliente (SPA sin librería externa) ────────────────────────────
// Maneja la navegación entre vistas sin recargar la página.

const routes = {};
let currentPage = null;

/**
 * Registra una ruta con su función renderizadora.
 * @param {string} path - Nombre de la vista (ej: 'leaderboard')
 * @param {Function} renderFn - Función que devuelve HTML y lanza listeners
 */
export function register(path, renderFn) {
  routes[path] = renderFn;
}

/**
 * Navega a una vista.
 * @param {string} path - Nombre de la vista
 * @param {object} params - Parámetros opcionales
 */
export function navigate(path, params = {}) {
  if (!routes[path]) {
    console.error(`Ruta '${path}' no registrada.`);
    return;
  }
  currentPage = path;

  // Actualizar navbar activo
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nav === path);
  });

  // Renderizar la vista
  const app = document.getElementById('app');
  routes[path](app, params);
  window.scrollTo(0, 0);
}

export function getCurrentPage() {
  return currentPage;
}

// Exponer navigate globalmente para usarlo en atributos onclick HTML
window.__nav = navigate;
