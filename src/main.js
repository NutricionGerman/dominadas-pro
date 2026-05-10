// src/main.js
// ─── Punto de entrada de la aplicación ─────────────────────────────────────
// Maneja el ciclo de vida de auth y registra todas las rutas.

import './style.css';
import { auth } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { register, navigate } from './router.js';
import { renderNavbar } from './components/navbar.js';

// Páginas
import { renderAuth } from './pages/auth.js';
import { renderLeaderboard } from './pages/leaderboard.js';
import { renderWorkout } from './pages/workout.js';
import { renderTracker } from './pages/tracker.js';
import { renderVideos } from './pages/videos.js';
import { renderProfile } from './pages/profile.js';
import { renderCalculator } from './pages/calculator.js';

// ── Registrar rutas
register('auth', renderAuth);
register('leaderboard', renderLeaderboard);
register('workout', renderWorkout);
register('tracker', renderTracker);
register('videos', renderVideos);
register('profile', renderProfile);
register('calculator', renderCalculator);

// ── Escuchar cambios de autenticación (único punto de verdad)
onAuthStateChanged(auth, (user) => {
  const navbar = document.getElementById('navbar');

  if (user) {
    // Usuario autenticado → mostrar navbar y navegar al leaderboard
    navbar.classList.remove('hidden');
    renderNavbar();
    navigate('leaderboard');
  } else {
    // No autenticado → ocultar navbar, ir a auth
    navbar.classList.add('hidden');
    navigate('auth');
  }
});
