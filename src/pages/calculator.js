// src/pages/calculator.js
// ─── Calculadoras de RM ─────────────────────────────────────────────────────

import { auth } from '../firebase.js';
import { getUserProfile } from '../services/userService.js';
import { calcRM, calcRepsFromRM, calcWeightFromRM } from '../utils/calculations.js';

export async function renderCalculator(container) {
  let profile = null;
  try {
    const user = auth.currentUser;
    if (user) profile = await getUserProfile(user.uid);
  } catch (_) {}

  const bw = profile?.bodyWeight || 78;
  const currentRM = profile?.currentRM || 50;

  container.innerHTML = `
    <div class="page calculator-page">
      <div class="page-header">
        <h1 class="page-title">🧮 CALCULADORA</h1>
        <p class="page-subtitle">Herramientas rápidas para consultar tus pesos</p>
      </div>

      <!-- MODO 1: REPS A RM -->
      <div class="card">
        <h2 class="card-title">Reps a RM (1RM)</h2>
        <div class="field-group">
          <label class="field-label">Peso Corporal (kg)</label>
          <input type="number" id="c1-bw" class="field-input" value="${bw}" step="0.5">
        </div>
        <div class="field-group">
          <label class="field-label">Lastre Levantado (kg)</label>
          <input type="number" id="c1-aw" class="field-input" value="30" step="0.5">
        </div>
        <div class="field-group">
          <label class="field-label">Repeticiones Logradas</label>
          <input type="number" id="c1-reps" class="field-input" value="8" min="1">
        </div>
        <button class="btn-secondary" onclick="doCalc1RM()">Calcular RM</button>
        <div class="calc-result" id="res1">-</div>
      </div>

      <!-- MODO 2: RM A REPS -->
      <div class="card">
        <h2 class="card-title">RM a Reps</h2>
        <div class="field-group">
          <label class="field-label">Peso Corporal (kg)</label>
          <input type="number" id="c2-bw" class="field-input" value="${bw}" step="0.5">
        </div>
        <div class="field-group">
          <label class="field-label">Tu RM Actual (Solo lastre, kg)</label>
          <input type="number" id="c2-rm" class="field-input" value="${currentRM.toFixed(1)}" step="0.5">
        </div>
        <div class="field-group">
          <label class="field-label">Lastre que vas a usar (kg)</label>
          <input type="number" id="c2-aw" class="field-input" value="${(currentRM * 0.75).toFixed(1)}" step="0.5">
        </div>
        <button class="btn-secondary" onclick="doCalcReps()">Calcular Reps</button>
        <div class="calc-result" id="res2">-</div>
      </div>

      <!-- MODO 3: RM A PESO -->
      <div class="card" style="margin-bottom: 80px;">
        <h2 class="card-title">RM a Peso</h2>
        <div class="field-group">
          <label class="field-label">Peso Corporal (kg)</label>
          <input type="number" id="c3-bw" class="field-input" value="${bw}" step="0.5">
        </div>
        <div class="field-group">
          <label class="field-label">Tu RM Actual (Solo lastre, kg)</label>
          <input type="number" id="c3-rm" class="field-input" value="${currentRM.toFixed(1)}" step="0.5">
        </div>
        <div class="field-group">
          <label class="field-label">Repeticiones que quieres hacer</label>
          <input type="number" id="c3-reps" class="field-input" value="8" min="1">
        </div>
        <button class="btn-secondary" onclick="doCalcPeso()">Calcular Lastre</button>
        <div class="calc-result" id="res3">-</div>
      </div>
    </div>
  `;

  // Funciones globales para la calculadora
  window.doCalc1RM = () => {
    const bw = parseFloat(document.getElementById('c1-bw').value) || 0;
    const aw = parseFloat(document.getElementById('c1-aw').value) || 0;
    const reps = parseFloat(document.getElementById('c1-reps').value) || 1;
    
    // (bodyWeight, addedWeight, reps)
    const rmTotal = calcRM(bw, aw, reps);
    const rmLastre = rmTotal - bw;
    
    const el = document.getElementById('res1');
    el.innerHTML = `Tu RM Máximo:<br><span class="accent-text">+${rmLastre.toFixed(1)} kg</span>`;
  };

  window.doCalcReps = () => {
    const bw = parseFloat(document.getElementById('c2-bw').value) || 0;
    const rmLastre = parseFloat(document.getElementById('c2-rm').value) || 0;
    const aw = parseFloat(document.getElementById('c2-aw').value) || 0;
    
    const reps = calcRepsFromRM(bw, rmLastre, aw);
    
    const el = document.getElementById('res2');
    el.innerHTML = `Podrás hacer aprox:<br><span class="accent-text">${reps} reps</span>`;
  };

  window.doCalcPeso = () => {
    const bw = parseFloat(document.getElementById('c3-bw').value) || 0;
    const rmLastre = parseFloat(document.getElementById('c3-rm').value) || 0;
    const reps = parseFloat(document.getElementById('c3-reps').value) || 1;
    
    const aw = calcWeightFromRM(bw, rmLastre, reps);
    
    const el = document.getElementById('res3');
    el.innerHTML = `Debes usar lastre de:<br><span class="accent-text">+${aw.toFixed(1)} kg</span>`;
  };
}
