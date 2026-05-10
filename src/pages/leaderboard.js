// src/pages/leaderboard.js
// ─── Pantalla de Leaderboard Global ─────────────────────────────────────────

import { getLeaderboard } from '../services/userService.js';
import { auth } from '../firebase.js';
import { showToast } from '../components/toast.js';

export async function renderLeaderboard(container) {
  container.innerHTML = `
    <div class="page leaderboard-page">
      <div class="page-header">
        <h1 class="page-title">🏆 RANKING GLOBAL</h1>
        <p class="page-subtitle">RM Relativo = Lastre 1RM ÷ Peso Corporal</p>
      </div>
      <div id="lb-list" class="lb-list">
        ${skeletonCards(8)}
      </div>
    </div>
  `;

  try {
    const users = await getLeaderboard(50);
    renderList(users);
  } catch (err) {
    showToast('Error al cargar el ranking', 'error');
    document.getElementById('lb-list').innerHTML = `
      <div class="empty-state">
        <p>No se pudo cargar el ranking. Revisá tu conexión.</p>
      </div>`;
  }
}

function renderList(users) {
  const currentUid = auth.currentUser?.uid;
  const list = document.getElementById('lb-list');
  if (!list) return;

  if (users.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>Sé el primero en registrar tu progreso 🚀</p></div>`;
    return;
  }

  list.innerHTML = users.map(u => {
    const isMe = u.id === currentUid;
    const rm = u.currentRM?.toFixed(1) || '–';
    const relRM = u.relativeRM ? (u.relativeRM * 100).toFixed(0) : '–';
    const bw = u.bodyWeight?.toFixed(0) || '–';
    const weeks = u.currentWeek || 1;
    const workouts = u.totalWorkouts || 0;

    const medal = u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : `#${u.rank}`;
    const rankClass = u.rank <= 3 ? `rank-podium rank-${u.rank}` : 'rank-normal';

    const initial = u.displayName ? u.displayName.charAt(0).toUpperCase() : 'U';
    const avatarHtml = u.photoURL 
      ? `<img src="${u.photoURL}" alt="Avatar" class="lb-avatar-img">` 
      : `<div class="lb-avatar-initial">${initial}</div>`;

    return `
      <div class="lb-card ${isMe ? 'lb-card-me' : ''}">
        <div class="lb-rank ${rankClass}">${medal}</div>
        <div class="lb-avatar">${avatarHtml}</div>
        <div class="lb-info">
          <div class="lb-name">${escapeHtml(u.displayName || 'Usuario')} ${isMe ? '<span class="badge-me">TÚ</span>' : ''}</div>
          <div class="lb-stats">
            <span class="stat-chip">💪 RM: +${rm} kg</span>
            <span class="stat-chip">⚖️ ${bw} kg</span>
            <span class="stat-chip">📈 Sem. ${weeks}</span>
          </div>
        </div>
        <div class="lb-rm-relative">
          <div class="lb-rm-value">${relRM}<span>%</span></div>
          <div class="lb-rm-label">RM REL.</div>
        </div>
      </div>
    `;
  }).join('');
}

function skeletonCards(n) {
  return Array.from({ length: n }, (_, i) => `
    <div class="lb-card lb-skeleton">
      <div class="sk sk-rank"></div>
      <div class="lb-info">
        <div class="sk sk-name"></div>
        <div class="sk sk-stats"></div>
      </div>
      <div class="sk sk-rm"></div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}
