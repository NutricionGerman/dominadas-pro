// src/pages/videos.js
// ─── Pantalla de Galería de Videos (YouTube) ────────────────────────────────

import { auth } from '../firebase.js';
import { saveVideo, getUserVideos, deleteVideo, getPublicVideos, extractYoutubeId, getThumbnailUrl } from '../services/videoService.js';
import { getLeaderboard } from '../services/userService.js';
import { showToast } from '../components/toast.js';

export async function renderVideos(container) {
  const uid = auth.currentUser.uid;

  container.innerHTML = `
    <div class="page videos-page">
      <div class="page-header">
        <h1 class="page-title">🎬 VIDEOS</h1>
        <p class="page-subtitle">Tus entrenamientos en video</p>
      </div>

      <!-- Agregar video -->
      <div class="card">
        <h2 class="card-title">+ Agregar video</h2>
        <div class="field-group">
          <label class="field-label">Enlace de YouTube</label>
          <input type="url" id="video-url" class="field-input" placeholder="https://youtu.be/..." autocomplete="off">
        </div>
        <div class="field-group">
          <label class="field-label">Título (opcional)</label>
          <input type="text" id="video-title" class="field-input" placeholder="PR Semana 3 — +35kg lastre">
        </div>
        <div class="field-group">
          <label class="field-label">Semana del programa</label>
          <select id="video-week" class="field-input">
            ${[1,2,3,4,5].map(w => `<option value="${w}">Semana ${w}</option>`).join('')}
          </select>
        </div>
        <div id="video-preview" class="video-preview hidden"></div>
        <button class="btn-primary" id="save-video-btn" onclick="previewVideo()">Vista previa →</button>
      </div>

      <!-- Tabs: mis videos / comunidad -->
      <div class="video-tabs">
        <button class="video-tab active" id="tab-mine-btn" onclick="switchVideoTab('mine')">Mis videos</button>
        <button class="video-tab" id="tab-community-btn" onclick="switchVideoTab('community')">Comunidad</button>
      </div>

      <div id="videos-mine" class="video-grid">
        ${skeletonGrid(4)}
      </div>
      <div id="videos-community" class="video-grid hidden">
        ${skeletonGrid(6)}
      </div>
    </div>
  `;

  // Estado de preview
  let previewConfirmed = false;

  window.previewVideo = () => {
    const url = document.getElementById('video-url').value.trim();
    const videoId = extractYoutubeId(url);
    if (!videoId) {
      showToast('URL de YouTube inválida. Usá youtube.com o youtu.be', 'error');
      return;
    }
    const preview = document.getElementById('video-preview');
    preview.classList.remove('hidden');
    preview.innerHTML = `
      <div class="embed-wrapper">
        <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
      </div>
      <button class="btn-primary" style="margin-top:12px" onclick="confirmSaveVideo()">✅ Confirmar y guardar</button>
    `;
    document.getElementById('save-video-btn').classList.add('hidden');
  };

  window.confirmSaveVideo = async () => {
    const url = document.getElementById('video-url').value.trim();
    const title = document.getElementById('video-title').value.trim();
    const week = parseInt(document.getElementById('video-week').value);
    try {
      await saveVideo(uid, { youtubeUrl: url, title, week });
      showToast('Video guardado 🎬', 'success');
      document.getElementById('video-url').value = '';
      document.getElementById('video-title').value = '';
      document.getElementById('video-preview').classList.add('hidden');
      document.getElementById('save-video-btn').classList.remove('hidden');
      loadMyVideos();
    } catch (err) {
      showToast(err.message || 'Error al guardar el video', 'error');
    }
  };

  window.switchVideoTab = (tab) => {
    const isMine = tab === 'mine';
    document.getElementById('videos-mine').classList.toggle('hidden', !isMine);
    document.getElementById('videos-community').classList.toggle('hidden', isMine);
    document.getElementById('tab-mine-btn').classList.toggle('active', isMine);
    document.getElementById('tab-community-btn').classList.toggle('active', !isMine);
    if (!isMine) loadCommunityVideos();
  };

  window.deleteMyVideo = async (videoId) => {
    if (!confirm('¿Eliminar este video?')) return;
    try {
      await deleteVideo(uid, videoId);
      showToast('Video eliminado', 'info');
      loadMyVideos();
    } catch (_) {
      showToast('Error al eliminar', 'error');
    }
  };

  loadMyVideos();

  async function loadMyVideos() {
    const grid = document.getElementById('videos-mine');
    if (!grid) return;
    grid.innerHTML = skeletonGrid(4);
    try {
      const videos = await getUserVideos(uid);
      if (videos.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Todavía no subiste videos. ¡Grabá tu próximo entreno!</p></div>`;
        return;
      }
      grid.innerHTML = videos.map(v => videoCard(v, true)).join('');
    } catch (_) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Error al cargar videos</p></div>`;
    }
  }

  async function loadCommunityVideos() {
    const grid = document.getElementById('videos-community');
    if (!grid || !grid.classList.contains('hidden') === false) return;
    grid.innerHTML = skeletonGrid(6);
    try {
      const users = await getLeaderboard(20);
      const uids = users.map(u => u.id);
      const videos = await getPublicVideos(uids);
      if (videos.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>La comunidad no ha subido videos todavía</p></div>`;
        return;
      }
      grid.innerHTML = videos.map(v => videoCard(v, false)).join('');
    } catch (_) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Error al cargar videos</p></div>`;
    }
  }
}

function videoCard(v, isOwner) {
  const thumb = v.thumbnailUrl || getThumbnailUrl(v.videoId);
  const title = v.title || `Semana ${v.week}`;
  return `
    <div class="video-card" onclick="openVideoModal('${v.embedUrl || `https://www.youtube.com/embed/${v.videoId}`}')">
      <div class="video-thumb" style="background-image:url('${thumb}')">
        <div class="play-overlay">▶</div>
        <span class="week-badge">Sem. ${v.week}</span>
      </div>
      <div class="video-meta">
        <p class="video-title">${escapeHtml(title)}</p>
        ${isOwner ? `<button class="btn-delete-video" onclick="event.stopPropagation(); deleteMyVideo('${v.id}')">🗑</button>` : ''}
      </div>
    </div>
  `;
}

// Modal de reproducción
window.openVideoModal = (embedUrl) => {
  const modal = document.createElement('div');
  modal.className = 'video-modal';
  modal.innerHTML = `
    <div class="video-modal-backdrop" onclick="this.parentElement.remove()"></div>
    <div class="video-modal-content">
      <button class="modal-close" onclick="this.closest('.video-modal').remove()">✕</button>
      <div class="embed-wrapper">
        <iframe src="${embedUrl}?autoplay=1" frameborder="0" allowfullscreen allow="autoplay"></iframe>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

function skeletonGrid(n) {
  return Array.from({ length: n }, () => `
    <div class="video-card lb-skeleton">
      <div class="sk" style="height:120px;border-radius:12px 12px 0 0"></div>
      <div class="video-meta"><div class="sk sk-name"></div></div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}
