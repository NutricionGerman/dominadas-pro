// src/components/toast.js
// ─── Notificaciones tipo toast ───────────────────────────────────────────────

/**
 * Muestra una notificación toast.
 * @param {string} message - Mensaje a mostrar
 * @param {'success'|'error'|'info'|'record'} type - Tipo de toast
 * @param {number} duration - Duración en ms
 */
export function showToast(message, type = 'info', duration = 3000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    record: '🏆',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || ''}</span> ${message}`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
