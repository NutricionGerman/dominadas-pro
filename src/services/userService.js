// src/services/userService.js
// ─── Operaciones de Firestore para usuarios ─────────────────────────────────

import { db } from '../firebase.js';
import {
  doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, orderBy, limit
} from 'firebase/firestore';

/**
 * Serializa de forma segura: elimina undefined, NaN, Infinity.
 */
function sanitize(obj) {
  return JSON.parse(JSON.stringify(obj, (_, v) => {
    if (typeof v === 'number' && !isFinite(v)) return 0;
    return v ?? null; // undefined → null
  }));
}

/**
 * Crea el documento de perfil al registrarse por primera vez.
 */
export async function createUserProfile(uid, data) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    displayName: data.displayName,
    bodyWeight: data.bodyWeight || 0,
    currentRM: 0,
    relativeRM: 0,
    currentWeek: 1,
    totalWorkouts: 0,
    programConfig: null,
    lastWorkout: null,
    createdAt: serverTimestamp(),
  });
}

/**
 * Devuelve el perfil del usuario.
 */
export async function getUserProfile(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Actualiza campos del perfil del usuario.
 * Usa setDoc con merge:true para que funcione tanto si el doc existe como si no.
 */
export async function updateUserProfile(uid, data) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, sanitize(data), { merge: true });
}

/**
 * Guarda el plan de 5 semanas en una subcolección separada.
 * Evita el límite de 1MB del documento y el error invalid-argument.
 */
export async function savePlan(uid, plan) {
  const ref = doc(db, 'users', uid, 'plans', 'current');
  await setDoc(ref, { weeks: sanitize(plan), savedAt: serverTimestamp() });
}

/**
 * Recupera el plan guardado.
 */
export async function getPlan(uid) {
  const ref = doc(db, 'users', uid, 'plans', 'current');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().weeks : null;
}

/**
 * Devuelve el top N usuarios para el leaderboard, ordenados por relativeRM.
 */
export async function getLeaderboard(topN = 50) {
  const q = query(
    collection(db, 'users'),
    orderBy('relativeRM', 'desc'),
    limit(topN)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d, idx) => ({ rank: idx + 1, id: d.id, ...d.data() }));
}
