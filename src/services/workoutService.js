// src/services/workoutService.js
// ─── Operaciones de Firestore para entrenamientos ────────────────────────────

import { db } from '../firebase.js';
import {
  collection, addDoc, getDocs, query, orderBy, serverTimestamp, updateDoc, doc, limit
} from 'firebase/firestore';

/**
 * Guarda una sesión de entrenamiento completada.
 */
export async function saveWorkoutSession(uid, sessionData) {
  const ref = collection(db, 'workouts', uid, 'sessions');
  const docRef = await addDoc(ref, {
    week: sessionData.week,
    day: sessionData.day,
    sets: sessionData.sets,
    notes: sessionData.notes || '',
    youtubeUrl: sessionData.youtubeUrl || null,
    date: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Devuelve el historial de sesiones de un usuario.
 */
export async function getWorkoutHistory(uid, maxSessions = 30) {
  const q = query(
    collection(db, 'workouts', uid, 'sessions'),
    orderBy('date', 'desc'),
    limit(maxSessions)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
