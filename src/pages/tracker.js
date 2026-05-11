// src/pages/tracker.js
// ─── Pantalla de Tracker (Ejecución del Plan de 5 Semanas) ───────────────────

import { auth } from '../firebase.js';
import { getUserProfile, updateUserProfile, getPlan } from '../services/userService.js';
import { saveWorkoutSession } from '../services/workoutService.js';
import { generateProgram, evaluateRIR, calcRM, calcRelativeRM, calcWeightFromRM } from '../utils/calculations.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';

export async function renderTracker(container) {
  container.innerHTML = `
    <div class="page tracker-page">
      <div class="page-header">
        <h1 class="page-title">📋 TRACKER</h1>
        <p class="page-subtitle">Ingresá tu RIR al terminar cada serie</p>
      </div>
      <div id="tracker-body">
        <div class="loader-center">
          <div class="spinner"></div>
          <p>Cargando tu programa...</p>
        </div>
      </div>
    </div>
  `;

  try {
    const uid = auth.currentUser.uid;
    const [profile, plan] = await Promise.all([
      getUserProfile(uid),
      getPlan(uid),
    ]);

    if (!profile?.programConfig || !plan) {
      document.getElementById('tracker-body').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚙️</div>
          <h3>Sin programa activo</h3>
          <p>Primero configurá tu programa en la pestaña "Programa"</p>
          <button class="btn-primary" onclick="window.__nav('workout')">Ir a Programa</button>
        </div>
      `;
      return;
    }
    renderPlan(plan, profile.currentWeek || 1, profile.programConfig);
  } catch (err) {
    console.error('Error al cargar tracker:', err);
    showToast('Error al cargar el tracker', 'error');
  }
}

function renderPlan(plan, currentWeek, config) {
  const body = document.getElementById('tracker-body');
  if (!body) return;
  window.__currentConfig = config;

  const html = plan.map(week => {
    const isPast = week.week < currentWeek;
    const isCurrent = week.week === currentWeek;
    const isRecord = week.week === 5;

    const weekClass = isRecord ? 'week-record' : isCurrent ? 'week-current' : isPast ? 'week-past' : 'week-future';
    const headerText = isRecord
      ? `🏆 SEMANA 5 — ¡SEMANA RÉCORD! (RIR: 0)`
      : `SEMANA ${week.week} — RIR Objetivo: ${week.targetRIR}`;

    const daysHtml = week.days.map(day => {
      const setsHtml = day.sets.map(set => {
        const weight = set.weight >= 0
          ? `+${set.weight.toFixed(1)} kg lastre`
          : `Asistido: ${Math.abs(set.weight).toFixed(1)} kg`;
        const id = `rir_w${week.week}_d${day.day}_s${set.setNumber}`;
        const isTest = set.isTest;

        return `
          <div class="set-row" id="row_${id}">
            <div class="set-info">
              <span class="set-reps">Serie ${set.setNumber}: ×${set.reps} ${isTest ? '<span class="badge-test">¡TEST!</span>' : ''}</span>
              <span class="set-weight">${weight}</span>
            </div>
            ${isCurrent
              ? `<input type="number" class="rir-input" id="${id}" placeholder="RIR" min="0" max="10"
                         oninput="onRIRInput(${week.week}, this.value, 'row_${id}')">`
              : isPast ? `<span class="rir-done">✓</span>` : ''
            }
          </div>
        `;
      }).join('');

      return `
        <div class="session-block">
          <div class="session-title">Día ${day.day}</div>
          ${setsHtml}
        </div>
      `;
    }).join('');

    return `
      <div class="week-block ${weekClass}">
        <div class="week-header">${headerText}</div>
        ${daysHtml}
        ${isCurrent ? `
          <div class="session-actions">
            <button class="btn-primary" id="btn-complete-${week.week}" onclick="confirmCompleteSession(${week.week})">
              ✅ Marcar Semana ${week.week} como completada
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  body.innerHTML = html;

  // ── RIR feedback visual
  window.onRIRInput = (week, val, rowId) => {
    if (val === '') return;
    const state = evaluateRIR(parseInt(val), week);
    const row = document.getElementById(rowId);
    if (!row) return;
    row.dataset.rir = state;
    const colors = { good: '#4caf50', warning: '#ffcc00', bad: '#ff4c4c' };
    row.style.borderLeftColor = colors[state] || '#444';
  };

  // ── Modal de confirmación antes de completar semana
  window.confirmCompleteSession = (week) => {
    const isRecord = week === 5;
    const config = window.__currentConfig;

    let contentHtml = '';
    if (isRecord && config) {
      const targetRM = calcRM(config.bodyWeight, config.addedWeight + config.jump, config.reps);
      const rmBallast = targetRM - config.bodyWeight;
      
      const target1 = calcWeightFromRM(config.bodyWeight, rmBallast, 1);
      const target4 = calcWeightFromRM(config.bodyWeight, rmBallast, 4);
      const target6 = calcWeightFromRM(config.bodyWeight, rmBallast, 6);
      const target8 = calcWeightFromRM(config.bodyWeight, rmBallast, 8);

      contentHtml = `
        <div class="test-suggestions" style="text-align: left; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; margin-bottom: 15px;">
          <h4 style="margin-top:0; margin-bottom: 8px; color:var(--primary); font-size: 0.9rem;">🎯 Marcas objetivo para romper tu récord:</h4>
          <ul style="margin:0; padding-left: 20px; font-size: 0.85rem; color:#ccc;">
            <li>1 Rep: +${(Math.round(target1 * 2) / 2).toFixed(1)} kg</li>
            <li>4 Reps: +${(Math.round(target4 * 2) / 2).toFixed(1)} kg</li>
            <li>6 Reps: +${(Math.round(target6 * 2) / 2).toFixed(1)} kg</li>
            <li>8 Reps: +${(Math.round(target8 * 2) / 2).toFixed(1)} kg</li>
          </ul>
        </div>
        <p class="confirm-msg" style="margin-bottom: 10px;">Ingresá tu récord final (Test Libre):</p>
        <div style="display:flex; gap: 10px; margin-bottom: 15px;">
          <input type="number" id="test-reps" placeholder="Reps logradas" min="1" class="rir-input" style="flex:1;">
          <input type="number" id="test-weight" placeholder="Lastre (kg)" step="0.5" class="rir-input" style="flex:1;">
        </div>
      `;
    } else {
      contentHtml = `
        <p class="confirm-msg">Avanzarás a la Semana ${week + 1}. Esta acción no se puede deshacer.</p>
      `;
    }

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-modal">
        <div class="confirm-icon">${isRecord ? '🏆' : '⚠️'}</div>
        <h3 class="confirm-title">${isRecord ? '¡Semana Récord!' : 'Completar Semana ' + week}</h3>
        ${contentHtml}
        <div class="confirm-actions">
          <button class="btn-secondary" onclick="this.closest('.confirm-overlay').remove()">Cancelar</button>
          <button class="btn-primary" id="btn-confirm-ok" onclick="confirmCompleteSession_do(${week}, this)">${isRecord ? '🏆 Guardar Récord' : '✅ Confirmar'}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  };

  // ── Ejecutar completado tras confirmación
  window.confirmCompleteSession_do = async (week, btn) => {
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    const overlay = btn.closest('.confirm-overlay');

    const uid = auth.currentUser.uid;
    try {
      const nextWeek = week < 5 ? week + 1 : 5;

      if (week === 5) {
        const repsInput = document.getElementById('test-reps')?.value;
        const weightInput = document.getElementById('test-weight')?.value;

        if (!repsInput || !weightInput) {
          showToast('Debes ingresar las repeticiones y el lastre de tu récord.', 'warning');
          btn.disabled = false;
          btn.textContent = '🏆 Guardar Récord';
          return;
        }

        const testReps = parseInt(repsInput, 10);
        const testWeight = parseFloat(weightInput);

        const profile = await getUserProfile(uid);
        const c = profile.programConfig;
        
        // Calcular el nuevo RM real en base a lo que el usuario logró en el Test Libre
        const newRM = calcRM(c.bodyWeight, testWeight, testReps);
        const rmBallast = newRM - c.bodyWeight;
        const relRM = calcRelativeRM(rmBallast, c.bodyWeight);

        await updateUserProfile(uid, {
          currentRM: parseFloat(rmBallast.toFixed(2)),
          relativeRM: parseFloat(relRM.toFixed(4)),
          totalWorkouts: (profile.totalWorkouts || 0) + 1,
          currentWeek: 5,
          lastWorkout: new Date().toISOString(),
        });
        overlay?.remove();
        showToast('¡NUEVO RÉCORD! 🏆 Tu RM fue actualizado en el ranking', 'success', 5000);
      } else {
        const profile = await getUserProfile(uid);
        await updateUserProfile(uid, {
          currentWeek: nextWeek,
          totalWorkouts: (profile.totalWorkouts || 0) + 1,
          lastWorkout: new Date().toISOString(),
        });
        overlay?.remove();
        showToast(`✅ Semana ${week} completada — ahora vas por la Semana ${nextWeek} 🔥`, 'success', 4000);
      }

      // Re-renderizar el tracker
      const appContainer = document.querySelector('.page-container') || document.getElementById('app');
      if (appContainer) await renderTracker(appContainer);

    } catch (err) {
      console.error('Error al completar semana:', err);
      btn.disabled = false;
      btn.textContent = '✅ Confirmar';
      showToast('Error al guardar. Intentá de nuevo.', 'error');
    }
  };
}
