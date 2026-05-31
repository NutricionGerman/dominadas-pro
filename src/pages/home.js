// src/pages/home.js
// ─── Pantalla Principal (Dashboard) ──────────────────────────────────────────

import { auth } from '../firebase.js';

export function renderHome(container) {
  // Aseguramos que haya un usuario, de lo contrario esto no debería renderizarse
  const user = auth.currentUser;
  const displayName = user ? (user.displayName || 'Atleta') : 'Atleta';

  container.innerHTML = `
    <div class="page home-page">
      <div class="home-hero">
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <p class="hero-subtitle">Dominadas Pro</p>
          <h1 class="hero-title">Hola, <span>${displayName.toUpperCase()}</span></h1>
        </div>
      </div>

      <div class="home-menu">
        <button class="menu-card" onclick="window.__nav('tracker')">
          <div class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 12l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="3"/></svg></div>
          <div class="menu-info">
            <h3>Tracker de Sesión</h3>
            <p>Registra tu entrenamiento de hoy</p>
          </div>
          <div class="menu-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></div>
        </button>

        <button class="menu-card" onclick="window.__nav('workout')">
          <div class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></div>
          <div class="menu-info">
            <h3>Programa de 5 Semanas</h3>
            <p>Configura tu rutina paso a paso</p>
          </div>
          <div class="menu-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></div>
        </button>

        <button class="menu-card" onclick="window.__nav('leaderboard')">
          <div class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6l4-4 4 4"/><path d="M3 10h18"/><path d="M5 10v10"/><path d="M19 10v10"/><path d="M12 10v10"/></svg></div>
          <div class="menu-info">
            <h3>Ranking Global</h3>
            <p>Compite con la comunidad</p>
          </div>
          <div class="menu-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></div>
        </button>

        <button class="menu-card" onclick="window.__nav('videos')">
          <div class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg></div>
          <div class="menu-info">
            <h3>Comunidad y Videos</h3>
            <p>Mira y comparte entrenamientos</p>
          </div>
          <div class="menu-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></div>
        </button>

        <button class="menu-card" onclick="window.__nav('calculator')">
          <div class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="8" y1="10" x2="8" y2="10.01"/></svg></div>
          <div class="menu-info">
            <h3>Calculadora 1RM</h3>
            <p>Estima tu repetición máxima</p>
          </div>
          <div class="menu-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></div>
        </button>
      </div>
    </div>
  `;
}
