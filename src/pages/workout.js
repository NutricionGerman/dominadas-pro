// src/pages/workout.js
// ─── Pantalla de Setup del Programa ─────────────────────────────────────────
// Pasos 1 y 2: configuración de RM + construcción de rutina semanal.

import { auth } from '../firebase.js';
import { getUserProfile, updateUserProfile, savePlan } from '../services/userService.js';
import { generateProgram, calcRM, calcRelativeRM } from '../utils/calculations.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';

// Estado local del builder (no hace falta guardarlo en Firebase hasta que genere)
let builderState = {
  freq: 3,
  currentDayEdit: 0,
  sessions: [[], [], []],
};

export async function renderWorkout(container) {
  const user = auth.currentUser;
  let profile = null;
  try { profile = await getUserProfile(user.uid); } catch (_) {}

  const bw = profile?.bodyWeight || 78;
  const lastConfig = profile?.programConfig;

  container.innerHTML = `
    <div class="page workout-page">
      <div class="page-header">
        <h1 class="page-title">💪 MI PROGRAMA</h1>
        <p class="page-subtitle">Configurá tu progresión de 5 semanas</p>
      </div>

      <!-- PASO 1: TEST DE RENDIMIENTO -->
      <div class="setup-step" id="step-1">
        <div class="step-badge">Paso 1 de 2</div>
        <div class="card">
          <h2 class="card-title">Test de rendimiento</h2>
          <div class="field-group">
            <label class="field-label">Tu peso corporal (kg)</label>
            <input type="number" id="setup-bw" class="field-input" value="${bw}" step="0.5" min="30" max="250">
          </div>
          <div class="field-group">
            <label class="field-label">Lastre usado (kg)</label>
            <input type="number" id="setup-added" class="field-input" value="${lastConfig?.addedWeight || 30}" step="0.5">
          </div>
          <div class="field-group">
            <label class="field-label">Repeticiones realizadas</label>
            <input type="number" id="setup-reps" class="field-input" value="${lastConfig?.reps || 8}" min="1" max="30">
          </div>
          <div class="rm-preview" id="rm-preview">
            <span class="rm-label">RM estimado (lastre)</span>
            <span class="rm-value" id="rm-value">–</span>
          </div>
        </div>

        <div class="card">
          <h2 class="card-title">Personalización de carga</h2>
          <div class="field-group">
            <label class="field-label">Salto semanal esperado (kg)</label>
            <input type="number" id="setup-jump" class="field-input" value="${lastConfig?.jump || 2.5}" step="0.5">
            <p class="field-hint">Peso extra que buscarás en la Semana 5</p>
          </div>
          <div class="field-group">
            <label class="field-label">Fatiga por serie (%)</label>
            <input type="number" id="setup-fatigue" class="field-input" value="${lastConfig?.fatigue || 3.0}" step="0.5" min="0" max="15">
            <p class="field-hint">Recomendado: 2% – 5%</p>
          </div>
        </div>
        <button class="btn-primary" onclick="goToStep2()">Siguiente → Estructura de sesión</button>
      </div>

      <!-- PASO 2: BUILDER DE RUTINA -->
      <div class="setup-step hidden" id="step-2">
        <div class="step-badge">Paso 2 de 2</div>
        <div class="card">
          <h2 class="card-title">Frecuencia semanal</h2>
          <div class="freq-control">
            <button class="circle-btn" onclick="changeFreq(-1)">−</button>
            <div class="freq-display"><span id="freq-val">${builderState.freq}</span><small>días/sem</small></div>
            <button class="circle-btn" onclick="changeFreq(1)">+</button>
          </div>
        </div>

        <div class="card">
          <h2 class="card-title">Estructura de la sesión</h2>
          <div class="day-tabs" id="day-tabs"></div>
          <div class="selected-sets" id="selected-sets"></div>
          <p class="field-hint" style="text-align:center;">AGREGAR SERIE (REPETICIONES):</p>
          <div class="rep-grid" id="rep-grid"></div>
        </div>

        <button class="btn-secondary" style="margin-bottom:10px" onclick="goToStep1()">← Volver</button>
        <button class="btn-primary" id="btn-generate" onclick="buildAndSaveProgram()">🚀 Generar programa de 5 semanas</button>
      </div>
    </div>
  `;

  // Inicializar
  initBuilderFromState(lastConfig);
  updateRMPreview();
  renderDayTabs();
  renderRepGrid();

  // ── Actualizar preview del RM en tiempo real
  ['setup-bw', 'setup-added', 'setup-reps'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateRMPreview);
  });

  // ── Navegación entre pasos
  window.goToStep2 = () => {
    document.getElementById('step-1').classList.add('hidden');
    document.getElementById('step-2').classList.remove('hidden');
    window.scrollTo(0, 0);
  };
  window.goToStep1 = () => {
    document.getElementById('step-2').classList.add('hidden');
    document.getElementById('step-1').classList.remove('hidden');
    window.scrollTo(0, 0);
  };

  // ── Frecuencia
  window.changeFreq = (val) => {
    let newFreq = Math.max(1, Math.min(7, builderState.freq + val));
    builderState.freq = newFreq;
    while (builderState.sessions.length < newFreq) builderState.sessions.push([]);
    while (builderState.sessions.length > newFreq) builderState.sessions.pop();
    if (builderState.currentDayEdit >= newFreq) builderState.currentDayEdit = newFreq - 1;
    document.getElementById('freq-val').textContent = newFreq;
    renderDayTabs();
  };

  window.selectDay = (idx) => {
    builderState.currentDayEdit = idx;
    renderDayTabs();
  };

  window.addSet = (reps) => {
    builderState.sessions[builderState.currentDayEdit].push(reps);
    renderSelectedSets();
  };

  window.removeSet = (dayIdx, setIdx) => {
    builderState.sessions[dayIdx].splice(setIdx, 1);
    renderSelectedSets();
  };

  // ── Generar y guardar
  window.buildAndSaveProgram = async () => {
    const bw     = parseFloat(document.getElementById('setup-bw').value);
    const added  = parseFloat(document.getElementById('setup-added').value);
    const reps   = parseFloat(document.getElementById('setup-reps').value);
    const jump   = parseFloat(document.getElementById('setup-jump').value);
    const fatigue = parseFloat(document.getElementById('setup-fatigue').value);

    // ── Validar que no haya NaN (campo vacío o inválido)
    if ([bw, added, reps, jump, fatigue].some(v => isNaN(v) || v === null)) {
      showToast('Completá todos los campos numéricos', 'error');
      return;
    }
    if (bw <= 0 || reps < 1) {
      showToast('El peso corporal y las repeticiones deben ser mayores a 0', 'error');
      return;
    }

    const hasSessions = builderState.sessions.some(s => s.length > 0);
    if (!hasSessions) {
      showToast('Agregá al menos una serie en algún día', 'error');
      return;
    }

    const config = { bodyWeight: bw, addedWeight: added, reps, jump, fatigue, sessions: builderState.sessions };
    const plan = generateProgram(config);
    const rmTotal = calcRM(bw, added, reps);
    const rmBallast = rmTotal - bw;
    const relRM = calcRelativeRM(rmBallast, bw);

    // ── Sanitizar plan (array de objetos → compatible con Firestore)
    const safePlan = JSON.parse(JSON.stringify(plan));

    // ── Firestore NO soporta arrays anidados ([[4,6],[5,8]] falla).
    // Convertir sessions a array de objetos: [{day:1, reps:[4,6]}, ...]
    const sessionsForFirestore = builderState.sessions.map((repsArr, i) => ({
      day: i + 1,
      reps: repsArr,
    }));
    const safeConfig = {
      bodyWeight: bw,
      addedWeight: added,
      reps,
      jump,
      fatigue,
      sessions: sessionsForFirestore,  // ← objetos, no arrays anidados
    };

    const rmBallastSafe = isNaN(rmBallast) ? 0 : parseFloat(rmBallast.toFixed(2));
    const relRMSafe     = isNaN(relRM)     ? 0 : parseFloat(relRM.toFixed(4));

    // ── Estado de carga en el botón
    const btn = document.getElementById('btn-generate');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Generando programa...'; }

    try {
      // 1️⃣ Guardar el perfil/métricas (sin el plan pesado)
      await updateUserProfile(auth.currentUser.uid, {
        displayName: auth.currentUser.displayName || 'Usuario',
        bodyWeight: bw,
        currentRM: rmBallastSafe,
        relativeRM: relRMSafe,
        currentWeek: 1,
        programConfig: safeConfig,
      });
      // 2️⃣ Guardar el plan en una subcolección separada (evita invalid-argument)
      await savePlan(auth.currentUser.uid, safePlan);

      // ── Pantalla de éxito con CTA claro
      const step2 = document.getElementById('step-2');
      if (step2) {
        step2.innerHTML = `
          <div class="success-screen">
            <div class="success-icon">🚀</div>
            <h2 class="success-title">¡Programa generado!</h2>
            <p class="success-msg">Tu plan de 5 semanas está listo.<br>Ahora ejecutalo en el Tracker.</p>
            <button class="btn-primary btn-large" onclick="window.__nav('tracker')">
              📋 Ir al Tracker →
            </button>
          </div>
        `;
      }
    } catch (err) {
      console.error('Error al guardar el programa:', err.code, err.message, err);
      if (btn) { btn.disabled = false; btn.textContent = '🚀 Generar programa de 5 semanas'; }
      showToast(`Error al guardar: ${err.code || err.message}`, 'error', 5000);
    }
  };
}

function initBuilderFromState(lastConfig) {
  if (lastConfig?.sessions) {
    builderState.freq = lastConfig.sessions.length;
    builderState.sessions = lastConfig.sessions.map(s => [...s]);
    builderState.currentDayEdit = 0;
  }
}

function updateRMPreview() {
  const bw = parseFloat(document.getElementById('setup-bw')?.value) || 0;
  const added = parseFloat(document.getElementById('setup-added')?.value) || 0;
  const reps = parseFloat(document.getElementById('setup-reps')?.value) || 1;
  if (bw > 0 && reps > 0) {
    const { calcRM } = window.__calc || {};
    const rmTotal = (bw + added) * (1 + (reps - 1) * 0.0333);
    const rmBallast = rmTotal - bw;
    const el = document.getElementById('rm-value');
    if (el) el.textContent = `+${rmBallast.toFixed(1)} kg lastre`;
  }
}

function renderDayTabs() {
  const tabs = document.getElementById('day-tabs');
  if (!tabs) return;
  tabs.innerHTML = Array.from({ length: builderState.freq }, (_, i) => `
    <button class="day-tab ${i === builderState.currentDayEdit ? 'active' : ''}" onclick="selectDay(${i})">Día ${i + 1}</button>
  `).join('');
  renderSelectedSets();
}

function renderSelectedSets() {
  const el = document.getElementById('selected-sets');
  if (!el) return;
  const sets = builderState.sessions[builderState.currentDayEdit];
  if (sets.length === 0) {
    el.innerHTML = `<span class="empty-sets-hint">Seleccioná repeticiones abajo...</span>`;
  } else {
    el.innerHTML = sets.map((reps, i) => `
      <div class="set-chip">
        <span>×${reps}</span>
        <button class="chip-remove" onclick="removeSet(${builderState.currentDayEdit}, ${i})">✕</button>
      </div>
    `).join('');
  }
}

function renderRepGrid() {
  const grid = document.getElementById('rep-grid');
  if (!grid) return;
  grid.innerHTML = Array.from({ length: 12 }, (_, i) => `
    <button class="rep-btn" onclick="addSet(${i + 1})">×${i + 1}</button>
  `).join('');
}
