// src/components/navbar.js
// ─── Barra de navegación inferior (mobile-first) ────────────────────────────

import { navigate } from '../router.js';
import { auth } from '../firebase.js';

export function renderNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  nav.innerHTML = `
    <button class="nav-item" data-nav="leaderboard" onclick="window.__nav('leaderboard')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6l4-4 4 4"/><path d="M3 10h18"/><path d="M5 10v10"/><path d="M19 10v10"/><path d="M12 10v10"/></svg>
      <span>Ranking</span>
    </button>
    <button class="nav-item" data-nav="workout" onclick="window.__nav('workout')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
      <span>Programa</span>
    </button>
    <button class="nav-item nav-center-btn" data-nav="tracker" onclick="window.__nav('tracker')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 12l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="3"/></svg>
      <span>Tracker</span>
    </button>
    <button class="nav-item" data-nav="videos" onclick="window.__nav('videos')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
      <span>Videos</span>
    </button>
    <button class="nav-item" data-nav="calculator" onclick="window.__nav('calculator')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="8" y1="10" x2="8" y2="10.01"/></svg>
      <span>Calc</span>
    </button>
    <button class="nav-item" data-nav="profile" onclick="window.__nav('profile')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
      <span>Perfil</span>
    </button>
  `;

  // Expose navigate globally for inline onclick handlers
  window.__nav = (page, params) => navigate(page, params);
}
