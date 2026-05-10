// src/pages/profile.js
// ─── Pantalla de Perfil y Progreso ───────────────────────────────────────────

import { auth } from '../firebase.js';
import { getUserProfile, updateUserProfile } from '../services/userService.js';
import { getWorkoutHistory } from '../services/workoutService.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';
import { signOut } from 'firebase/auth';

let cropState = null;

export async function renderProfile(container) {
  const user = auth.currentUser;
  
  container.innerHTML = `
    <div class="page profile-page">
      <div class="profile-hero">
        <label class="avatar-upload-wrapper" title="Cambiar foto de perfil">
          <input type="file" id="photo-input" accept="image/*" class="hidden">
          <div class="avatar-circle" id="profile-avatar">
            ${getInitials(user.displayName || 'U')}
          </div>
          <div class="avatar-upload-overlay">📷</div>
        </label>
        <h2 class="profile-name" id="profile-display-name">${user.displayName || 'Usuario'}</h2>
        <p class="profile-email">${user.email}</p>
      </div>

      <div id="profile-stats" class="profile-stats">
        <div class="loader-center"><div class="spinner"></div></div>
      </div>

      <div class="card">
        <h2 class="card-title">Editar perfil</h2>
        <div class="field-group">
          <label class="field-label">Nombre de usuario</label>
          <input type="text" id="edit-name" class="field-input" value="${user.displayName || ''}">
        </div>
        <div class="field-group">
          <label class="field-label">Peso corporal (kg)</label>
          <input type="number" id="edit-bw" class="field-input" step="0.5">
        </div>
        <button class="btn-primary" onclick="saveProfile()">Guardar cambios</button>
      </div>

      <div class="card">
        <h2 class="card-title">Historial reciente</h2>
        <div id="history-list">
          <div class="loader-center"><div class="spinner"></div></div>
        </div>
      </div>

      <button class="btn-logout" onclick="doLogout()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Cerrar sesión
      </button>
    </div>

    <!-- Modal de Recorte de Foto -->
    <div class="photo-editor-modal" id="photo-modal">
      <div class="photo-editor-content">
        <h3 class="photo-editor-title">Ajustar Foto</h3>
        <div class="crop-container-wrapper" id="crop-container">
          <!-- Canvas se inserta aquí -->
        </div>
        <div class="crop-hint" id="crop-hint" style="display:none;">Arrastrá para mover</div>
        <input type="range" class="zoom-slider" id="photo-zoom" min="100" max="300" value="100" style="display:none;">
        <div class="photo-actions">
          <button class="btn-secondary" onclick="closePhotoEditor()">Cancelar</button>
          <button class="btn-primary" id="btn-save-photo" onclick="savePhoto()">Aplicar</button>
        </div>
      </div>
    </div>
  `;

  // Cargar datos en paralelo
  const [profile, history] = await Promise.all([
    getUserProfile(user.uid).catch(() => null),
    getWorkoutHistory(user.uid, 10).catch(() => []),
  ]);

  // Actualizar avatar si hay foto
  if (profile?.photoURL) {
    document.getElementById('profile-avatar').innerHTML = `<img src="${profile.photoURL}" alt="Avatar">`;
  }

  // Stats
  renderStats(profile);
  if (profile?.bodyWeight) document.getElementById('edit-bw').value = profile.bodyWeight;

  // Historial
  renderHistory(history);

  // Manejar el upload y cropper
  setupCropper();

  // Guardar perfil
  window.saveProfile = async () => {
    const name = document.getElementById('edit-name').value.trim();
    const bw = parseFloat(document.getElementById('edit-bw').value);
    if (!name) { showToast('El nombre no puede estar vacío', 'error'); return; }
    try {
      await updateUserProfile(user.uid, { displayName: name, bodyWeight: bw });
      document.getElementById('profile-display-name').textContent = name;
      showToast('Perfil actualizado ✅', 'success');
    } catch (_) {
      showToast('Error al guardar', 'error');
    }
  };

  // Logout
  window.doLogout = async () => {
    await signOut(auth);
  };
}

function renderStats(profile) {
  const el = document.getElementById('profile-stats');
  if (!el) return;
  if (!profile) { el.innerHTML = ''; return; }

  const rm = profile.currentRM?.toFixed(1) || '–';
  const relRM = profile.relativeRM ? (profile.relativeRM * 100).toFixed(0) : '–';
  const week = profile.currentWeek || 1;
  const total = profile.totalWorkouts || 0;

  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">+${rm}<span>kg</span></div>
        <div class="stat-label">RM Lastre</div>
      </div>
      <div class="stat-card accent">
        <div class="stat-value">${relRM}<span>%</span></div>
        <div class="stat-label">RM Relativo</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${week}<span>/5</span></div>
        <div class="stat-label">Semana actual</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${total}</div>
        <div class="stat-label">Sesiones totales</div>
      </div>
    </div>
  `;
}

function renderHistory(sessions) {
  const el = document.getElementById('history-list');
  if (!el) return;
  if (sessions.length === 0) {
    el.innerHTML = `<p class="empty-hint">Todavía no completaste ninguna sesión.</p>`;
    return;
  }
  el.innerHTML = sessions.map(s => {
    const date = s.date?.toDate?.() ? s.date.toDate().toLocaleDateString('es-AR') : '–';
    return `
      <div class="history-item">
        <div class="history-info">
          <span class="history-label">Semana ${s.week} · Día ${s.day}</span>
          <span class="history-date">${date}</span>
        </div>
      </div>
    `;
  }).join('');
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Lógica del Cropper ──────────────────────────────────────────────────────

function setupCropper() {
  const photoInput = document.getElementById('photo-input');
  const photoModal = document.getElementById('photo-modal');
  const zoomSlider = document.getElementById('photo-zoom');

  if (photoInput) {
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        initCropper(event.target.result);
        photoModal.classList.add('active');
      };
      reader.readAsDataURL(file);
      e.target.value = ''; // Reset
    });
  }

  if (zoomSlider) {
    zoomSlider.addEventListener('input', (e) => {
      if (cropState) {
        cropState.scale = cropState.baseScale * (e.target.value / 100);
        renderCropCanvas();
      }
    });
  }

  window.closePhotoEditor = () => {
    photoModal.classList.remove('active');
    cropState = null;
  };

  window.savePhoto = async () => {
    const btn = document.getElementById('btn-save-photo');
    if (!cropState) return;

    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const photoDataUrl = getCroppedDataUrl();
    const uid = auth.currentUser.uid;

    try {
      await updateUserProfile(uid, { photoURL: photoDataUrl });
      document.getElementById('profile-avatar').innerHTML = `<img src="${photoDataUrl}" alt="Avatar">`;
      closePhotoEditor();
      showToast('Foto actualizada ✅', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar foto', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Aplicar';
    }
  };
}

function initCropper(imgSrc) {
  const hint = document.getElementById('crop-hint');
  const slider = document.getElementById('photo-zoom');
  const SIZE = 220; // Tamaño visual del crop container

  const img = new Image();
  img.onload = () => {
    const initialScale = Math.max(SIZE / img.width, SIZE / img.height);
    cropState = {
      img,
      offsetX: 0,
      offsetY: 0,
      scale: initialScale,
      baseScale: initialScale,
      dragging: false,
      startX: 0,
      startY: 0
    };

    slider.min = 100;
    slider.max = 300;
    slider.value = 100;
    slider.style.display = 'block';
    hint.style.display = 'block';
    renderCropCanvas();
  };
  img.src = imgSrc;
}

function renderCropCanvas() {
  if (!cropState) return;
  const SIZE = 220;
  const container = document.getElementById('crop-container');
  let canvas = container.querySelector('canvas');
  
  if (!canvas) {
    container.innerHTML = '';
    canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    canvas.style.width = SIZE + 'px';
    canvas.style.height = SIZE + 'px';
    canvas.style.cursor = 'grab';
    container.appendChild(canvas);
    attachCropEvents(canvas);
  }
  
  const ctx = canvas.getContext('2d');
  const { img, offsetX, offsetY, scale } = cropState;
  
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const x = (SIZE - drawW) / 2 + offsetX;
  const y = (SIZE - drawH) / 2 + offsetY;
  
  ctx.clearRect(0, 0, SIZE, SIZE);
  // Dibujar imagen
  ctx.drawImage(img, x, y, drawW, drawH);
}

function attachCropEvents(canvas) {
  const getPos = (e) => e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
  
  const startDrag = (e) => {
    cropState.dragging = true;
    const p = getPos(e);
    cropState.startX = p.x - cropState.offsetX;
    cropState.startY = p.y - cropState.offsetY;
    canvas.style.cursor = 'grabbing';
  };
  
  const onDrag = (e) => {
    if (!cropState || !cropState.dragging) return;
    if (e.touches) e.preventDefault();
    const p = getPos(e);
    cropState.offsetX = p.x - cropState.startX;
    cropState.offsetY = p.y - cropState.startY;
    renderCropCanvas();
  };
  
  const endDrag = () => {
    if (cropState) {
      cropState.dragging = false;
      canvas.style.cursor = 'grab';
    }
  };

  canvas.addEventListener('mousedown', startDrag);
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrag(e); }, { passive: false });
  
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('touchmove', onDrag, { passive: false });
  
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchend', endDrag);
}

function getCroppedDataUrl() {
  if (!cropState) return null;
  const SIZE = 250; // Calidad de exportación
  const DISPLAY = 220; // Tamaño en pantalla
  const ratio = SIZE / DISPLAY;
  
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  
  const { img, offsetX, offsetY, scale } = cropState;
  
  const drawW = img.width * scale * ratio;
  const drawH = img.height * scale * ratio;
  const x = (SIZE - drawW) / 2 + offsetX * ratio;
  const y = (SIZE - drawH) / 2 + offsetY * ratio;
  
  ctx.drawImage(img, x, y, drawW, drawH);
  return canvas.toDataURL('image/jpeg', 0.85); // Alta calidad, peso razonable
}
