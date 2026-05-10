// src/pages/auth.js
// ─── Pantalla de Login y Registro ────────────────────────────────────────────

import { auth, db } from '../firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { createUserProfile } from '../services/userService.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';

export function renderAuth(container) {
  container.innerHTML = `
    <div class="auth-screen">
      <div class="auth-hero">
        <div class="auth-logo">
          <svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#d4ff00"/><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" font-size="20" font-weight="900" fill="#000">💪</text></svg>
        </div>
        <h1 class="auth-title">DOMINADAS<br><span>PRO</span></h1>
        <p class="auth-subtitle">Rastrea tu progreso. Domina el ranking.</p>
      </div>

      <div class="auth-card">
        <div class="auth-tabs">
          <button class="auth-tab active" id="tab-login-btn" onclick="switchAuthTab('login')">Entrar</button>
          <button class="auth-tab" id="tab-register-btn" onclick="switchAuthTab('register')">Crear cuenta</button>
        </div>

        <!-- LOGIN -->
        <form id="login-form" class="auth-form active" onsubmit="handleLogin(event)">
          <div class="field-group">
            <label class="field-label">Email</label>
            <input type="email" id="login-email" class="field-input" placeholder="tu@email.com" required autocomplete="email">
          </div>
          <div class="field-group">
            <label class="field-label">Contraseña</label>
            <input type="password" id="login-pass" class="field-input" placeholder="••••••••" required autocomplete="current-password">
          </div>
          <button type="submit" class="btn-primary" id="login-submit-btn">
            <span id="login-btn-text">Iniciar sesión</span>
            <span id="login-spinner" class="btn-spinner hidden">⟳</span>
          </button>
        </form>

        <!-- REGISTER -->
        <form id="register-form" class="auth-form" onsubmit="handleRegister(event)">
          <div class="field-group">
            <label class="field-label">Nombre de usuario</label>
            <input type="text" id="reg-name" class="field-input" placeholder="El Maestro" required autocomplete="nickname">
          </div>
          <div class="field-group">
            <label class="field-label">Peso corporal (kg)</label>
            <input type="number" id="reg-bw" class="field-input" placeholder="78" step="0.5" min="30" max="200" required>
          </div>
          <div class="field-group">
            <label class="field-label">Email</label>
            <input type="email" id="reg-email" class="field-input" placeholder="tu@email.com" required autocomplete="email">
          </div>
          <div class="field-group">
            <label class="field-label">Contraseña</label>
            <input type="password" id="reg-pass" class="field-input" placeholder="Mínimo 6 caracteres" required minlength="6" autocomplete="new-password">
          </div>
          <button type="submit" class="btn-primary" id="register-submit-btn">
            <span id="reg-btn-text">Crear cuenta</span>
            <span id="reg-spinner" class="btn-spinner hidden">⟳</span>
          </button>
        </form>
      </div>
    </div>
  `;

  // ── Manejo de tabs
  window.switchAuthTab = (tab) => {
    const isLogin = tab === 'login';
    document.getElementById('login-form').classList.toggle('active', isLogin);
    document.getElementById('register-form').classList.toggle('active', !isLogin);
    document.getElementById('tab-login-btn').classList.toggle('active', isLogin);
    document.getElementById('tab-register-btn').classList.toggle('active', !isLogin);
  };

  // ── Login
  window.handleLogin = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    setLoading('login', true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged en main.js maneja la navegación
    } catch (err) {
      showToast(getAuthError(err.code), 'error');
      setLoading('login', false);
    }
  };

  // ── Registro
  window.handleRegister = async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const bw = parseFloat(document.getElementById('reg-bw').value);
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;
    setLoading('register', true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
      await createUserProfile(cred.user.uid, { displayName: name, bodyWeight: bw });
      // onAuthStateChanged maneja la navegación
    } catch (err) {
      showToast(getAuthError(err.code), 'error');
      setLoading('register', false);
    }
  };
}

function setLoading(form, loading) {
  const btn = document.getElementById(`${form === 'login' ? 'login' : 'register'}-submit-btn`);
  const text = document.getElementById(`${form === 'login' ? 'login' : 'reg'}-btn-text`);
  const spinner = document.getElementById(`${form === 'login' ? 'login' : 'reg'}-spinner`);
  if (btn) btn.disabled = loading;
  if (text) text.classList.toggle('hidden', loading);
  if (spinner) spinner.classList.toggle('hidden', !loading);
}

function getAuthError(code) {
  const errors = {
    'auth/invalid-email': 'Email inválido.',
    'auth/user-not-found': 'No existe una cuenta con ese email.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-credential': 'Email o contraseña incorrectos.',
    'auth/too-many-requests': 'Demasiados intentos. Esperá unos minutos.',
  };
  return errors[code] || 'Error al autenticar. Intentá de nuevo.';
}
