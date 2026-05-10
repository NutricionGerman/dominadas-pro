// src/pages/videos.js
// ─── Pantalla de Galería de Videos (YouTube) ────────────────────────────────

import { auth } from '../firebase.js';
import { saveVideo, getUserVideos, deleteVideo, getPublicVideos, extractYoutubeId, getThumbnailUrl, getComments, addComment } from '../services/videoService.js';
import { getLeaderboard, getUserProfile } from '../services/userService.js';
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
      const userMap = {};
      users.forEach(u => userMap[u.id] = u);
      
      const uids = users.map(u => u.id);
      const videos = await getPublicVideos(uids);
      if (videos.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>La comunidad no ha subido videos todavía</p></div>`;
        return;
      }
      grid.innerHTML = videos.map(v => videoCard(v, false, userMap[v.userId])).join('');
    } catch (_) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>Error al cargar videos</p></div>`;
    }
  }
}

function videoCard(v, isOwner, ownerData = null) {
  const thumb = v.thumbnailUrl || getThumbnailUrl(v.videoId);
  const title = v.title || `Semana ${v.week}`;
  
  let ownerHtml = '';
  if (ownerData && !isOwner) {
    const avatarContent = ownerData.photoURL 
      ? `<img src="${ownerData.photoURL}" alt="Avatar" class="owner-avatar-img">` 
      : `<span class="owner-avatar-text">${(ownerData.displayName || 'U').charAt(0).toUpperCase()}</span>`;
    ownerHtml = `
      <div class="video-owner-badge">
        <div class="owner-avatar-circle">${avatarContent}</div>
        <span class="owner-name">${escapeHtml(ownerData.displayName || 'Usuario')}</span>
      </div>
    `;
  }
  
  const videoDataStr = encodeURIComponent(JSON.stringify(v));

  return `
    <div class="video-card" onclick="openVideoModal('${v.embedUrl || `https://www.youtube.com/embed/${v.videoId}`}', '${videoDataStr}')">
      <div class="video-thumb" style="background-image:url('${thumb}')">
        ${ownerHtml}
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

// Modal de reproducción con comentarios
window.openVideoModal = async (embedUrl, videoDataStr) => {
  const videoObj = videoDataStr ? JSON.parse(decodeURIComponent(videoDataStr)) : null;
  const modal = document.createElement('div');
  modal.className = 'video-modal';
  
  let commentsHtml = '';
  if (videoObj && videoObj.userId && videoObj.id) {
    commentsHtml = `
      <div class="comments-section">
        <h3>💬 Comentarios</h3>
        <div id="comments-list" class="comments-list">
          <p class="comments-loading">Cargando comentarios...</p>
        </div>
        <div class="comment-input-area">
          <input type="text" id="new-comment-text" placeholder="Escribe un comentario..." class="field-input" autocomplete="off">
          <button class="btn-primary" id="btn-send-comment">Enviar</button>
        </div>
      </div>
    `;
  }

  modal.innerHTML = `
    <div class="video-modal-backdrop" onclick="this.parentElement.remove()"></div>
    <div class="video-modal-content has-comments">
      <button class="modal-close" onclick="this.closest('.video-modal').remove()">✕</button>
      <div class="embed-wrapper">
        <iframe src="${embedUrl}?autoplay=1" frameborder="0" allowfullscreen allow="autoplay"></iframe>
      </div>
      ${commentsHtml}
    </div>
  `;
  document.body.appendChild(modal);

  if (videoObj && videoObj.userId && videoObj.id) {
    const commentsList = modal.querySelector('#comments-list');
    const loadVideoComments = async () => {
      try {
        const comments = await getComments(videoObj.userId, videoObj.id);
        if (comments.length === 0) {
          commentsList.innerHTML = '<p class="empty-comments">Aún no hay comentarios. ¡Sé el primero!</p>';
        } else {
          commentsList.innerHTML = comments.map(c => `
            <div class="comment-item">
              <div class="comment-avatar">
                ${c.photoURL ? `<img src="${c.photoURL}">` : `<span>${(c.displayName || 'U').charAt(0).toUpperCase()}</span>`}
              </div>
              <div class="comment-body">
                <strong>${escapeHtml(c.displayName || 'Usuario')}</strong>
                <p>${escapeHtml(c.text)}</p>
              </div>
            </div>
          `).join('');
        }
      } catch (e) {
        commentsList.innerHTML = '<p class="empty-comments">Error al cargar comentarios.</p>';
      }
    };
    
    await loadVideoComments();

    const btnSend = modal.querySelector('#btn-send-comment');
    const inputStr = modal.querySelector('#new-comment-text');
    
    btnSend.onclick = async () => {
      const text = inputStr.value.trim();
      if (!text) return;
      btnSend.disabled = true;
      try {
        const currentUid = auth.currentUser.uid;
        const profile = await getUserProfile(currentUid);
        await addComment(
          videoObj.userId, 
          videoObj.id, 
          currentUid, 
          text, 
          profile.displayName, 
          profile.photoURL
        );
        inputStr.value = '';
        await loadVideoComments();
      } catch (err) {
        showToast('Error al enviar comentario', 'error');
      } finally {
        btnSend.disabled = false;
      }
    };
  }
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
