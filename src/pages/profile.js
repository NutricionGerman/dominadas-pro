// src/pages/profile.js
// ─── Pantalla de Perfil y Progreso ───────────────────────────────────────────

import { auth } from '../firebase.js';
import { getUserProfile, updateUserProfile, getRMHistory } from '../services/userService.js';
import { getWorkoutHistory } from '../services/workoutService.js';
import Chart from 'chart.js/auto';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';
import { signOut } from 'firebase/auth';

let cropState = null;

export async function renderProfile(container, params = {}) {
  const targetUid = params.uid || auth.currentUser.uid;
  const isOwnProfile = targetUid === auth.currentUser.uid;

  container.innerHTML = `<div class="loader-center"><div class="spinner"></div></div>`;

  // Cargar datos en paralelo
  const [profile, history, rmHistory] = await Promise.all([
    getUserProfile(targetUid).catch(() => null),
    getWorkoutHistory(targetUid, 10).catch(() => []),
    getRMHistory(targetUid).catch(() => []),
  ]);

  if (!profile && !isOwnProfile) {
    container.innerHTML = `<div class="page profile-page"><div class="empty-state"><h3>Usuario no encontrado</h3><button class="btn-primary" onclick="window.__nav('leaderboard')">Volver al Ranking</button></div></div>`;
    return;
  }

  const displayName = profile?.displayName || (isOwnProfile ? auth.currentUser.displayName : 'Atleta');
  const emailHtml = isOwnProfile ? `<p class="profile-email">${auth.currentUser.email}</p>` : '';

  container.innerHTML = `
    <div class="page profile-page">
      ${!isOwnProfile ? `<button class="btn-secondary" onclick="window.__nav('leaderboard')" style="margin-bottom:15px;">← Volver al Ranking</button>` : ''}
      <div class="profile-hero">
        <label class="${isOwnProfile ? 'avatar-upload-wrapper' : 'avatar-static-wrapper'}" title="${isOwnProfile ? 'Cambiar foto de perfil' : ''}">
          ${isOwnProfile ? `<input type="file" id="photo-input" accept="image/*" class="hidden">` : ''}
          <div class="avatar-circle" id="profile-avatar">
            ${profile?.photoURL ? `<img src="${profile.photoURL}" alt="Avatar">` : getInitials(displayName)}
          </div>
          ${isOwnProfile ? `<div class="avatar-upload-overlay">📷</div>` : ''}
        </label>
        <h2 class="profile-name" id="profile-display-name">${displayName}</h2>
        ${emailHtml}
      </div>

      <div id="profile-stats" class="profile-stats">
        <!-- Renderizado dinámico de stats -->
      </div>

      <div class="card">
        <h2 class="card-title">Evolución de 1RM</h2>
        <div class="chart-container" style="position: relative; height: 200px; width: 100%;">
          <canvas id="rmChart"></canvas>
        </div>
      </div>

      ${isOwnProfile ? `
      <div class="card">
        <h2 class="card-title">Editar perfil</h2>
        <div class="field-group">
          <label class="field-label">Nombre de usuario</label>
          <input type="text" id="edit-name" class="field-input" value="${displayName}">
        </div>
        <div class="field-group">
          <label class="field-label">Peso corporal (kg)</label>
          <input type="number" id="edit-bw" class="field-input" step="0.5" value="${profile?.bodyWeight || ''}">
        </div>
        <button class="btn-primary" onclick="saveProfile()">Guardar cambios</button>
      </div>
      ` : ''}

      <div class="card">
        <h2 class="card-title">Historial reciente</h2>
        <div id="history-list">
          <div class="loader-center"><div class="spinner"></div></div>
        </div>
      </div>

      ${isOwnProfile ? `
      <button class="btn-logout" onclick="doLogout()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Cerrar sesión
      </button>
      ` : ''}
    </div>

    <!-- Modal de Recorte de Foto -->
    ${isOwnProfile ? `
    <div class="photo-editor-modal" id="photo-modal">
      <div class="photo-editor-content">
        <h3 class="photo-editor-title">Ajustar Foto</h3>
        <div class="crop-container-wrapper" id="crop-container"></div>
        <div class="crop-hint" id="crop-hint" style="display:none;">Arrastrá para mover</div>
        <input type="range" class="zoom-slider" id="photo-zoom" min="100" max="300" value="100" style="display:none;">
        <div class="photo-actions">
          <button class="btn-secondary" onclick="closePhotoEditor()">Cancelar</button>
          <button class="btn-primary" id="btn-save-photo" onclick="savePhoto()">Aplicar</button>
        </div>
      </div>
    </div>
    ` : ''}
  `;

  // Stats
  renderStats(profile);

  // Historial
  renderHistory(history);

  // Gráfico de RM
  renderRMChart(rmHistory, profile?.currentRM);

  if (isOwnProfile) {
    setupCropper();

    window.saveProfile = async () => {
      const name = document.getElementById('edit-name').value.trim();
      const bw = parseFloat(document.getElementById('edit-bw').value);
      if (!name) { showToast('El nombre no puede estar vacío', 'error'); return; }
      try {
        await updateUserProfile(targetUid, { displayName: name, bodyWeight: bw });
        document.getElementById('profile-display-name').textContent = name;
        showToast('Perfil actualizado ✅', 'success');
      } catch (_) {
        showToast('Error al guardar', 'error');
      }
    };

    window.doLogout = async () => {
      await signOut(auth);
    };
  }
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

function renderRMChart(rmHistory, currentRM) {
  const ctx = document.getElementById('rmChart');
  if (!ctx) return;

  if ((!rmHistory || rmHistory.length === 0) && (!currentRM || currentRM === 0)) {
    ctx.parentElement.innerHTML = '<p class="empty-hint">Aún no hay datos de 1RM.</p>';
    return;
  }

  let labels = [];
  let data = [];

  if (rmHistory && rmHistory.length > 0) {
    rmHistory.forEach(item => {
      labels.push(item.date?.toDate?.() ? item.date.toDate().toLocaleDateString('es-AR') : '–');
      data.push(item.rm);
    });
  } else if (currentRM) {
    labels = [new Date().toLocaleDateString('es-AR')];
    data = [currentRM];
  }

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'RM Lastre (kg)',
        data: data,
        borderColor: '#d4ff00',
        backgroundColor: 'rgba(212,255,0,0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#1a1a1a',
        pointBorderColor: '#d4ff00',
        pointBorderWidth: 2,
        pointRadius: 4,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#888' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#888' }
        }
      }
    }
  });
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
