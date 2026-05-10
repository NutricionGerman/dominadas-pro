// src/services/videoService.js
// ─── Operaciones de Firestore para videos de YouTube ────────────────────────

import { db } from '../firebase.js';
import {
  collection, addDoc, getDocs, query, orderBy, serverTimestamp, limit, doc, updateDoc, deleteDoc
} from 'firebase/firestore';

/**
 * Extrae el ID de video de YouTube de una URL.
 * Acepta formatos: youtu.be/ID, youtube.com/watch?v=ID, youtube.com/shorts/ID
 */
export function extractYoutubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Genera URL de embed de YouTube.
 */
export function getEmbedUrl(videoId) {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Genera URL de thumbnail de YouTube.
 */
export function getThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * Guarda un video de YouTube en Firestore.
 */
export async function saveVideo(uid, data) {
  const videoId = extractYoutubeId(data.youtubeUrl);
  if (!videoId) throw new Error('URL de YouTube inválida');

  const ref = collection(db, 'videos', uid, 'uploads');
  const docRef = await addDoc(ref, {
    youtubeUrl: data.youtubeUrl,
    videoId,
    embedUrl: getEmbedUrl(videoId),
    thumbnailUrl: getThumbnailUrl(videoId),
    title: data.title || '',
    week: data.week || 1,
    description: data.description || '',
    uploadedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Devuelve todos los videos de un usuario.
 */
export async function getUserVideos(uid, maxVideos = 20) {
  const q = query(
    collection(db, 'videos', uid, 'uploads'),
    orderBy('uploadedAt', 'desc'),
    limit(maxVideos)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Devuelve videos de múltiples usuarios para la galería global.
 */
export async function getPublicVideos(userIds, maxPerUser = 3) {
  const allVideos = [];
  for (const uid of userIds.slice(0, 20)) {
    const videos = await getUserVideos(uid, maxPerUser);
    allVideos.push(...videos.map(v => ({ ...v, userId: uid })));
  }
  return allVideos.sort((a, b) => {
    const ta = a.uploadedAt?.seconds || 0;
    const tb = b.uploadedAt?.seconds || 0;
    return tb - ta;
  });
}

/**
 * Elimina un video del usuario.
 */
export async function deleteVideo(uid, videoId) {
  const ref = doc(db, 'videos', uid, 'uploads', videoId);
  await deleteDoc(ref);
}

/**
 * Agrega un comentario a un video
 */
export async function addComment(videoOwnerId, videoId, uid, text, displayName, photoURL) {
  const ref = collection(db, 'videos', videoOwnerId, 'uploads', videoId, 'comments');
  await addDoc(ref, {
    uid,
    text,
    displayName,
    photoURL: photoURL || null,
    createdAt: serverTimestamp()
  });
}

/**
 * Obtiene los comentarios de un video
 */
export async function getComments(videoOwnerId, videoId) {
  const q = query(
    collection(db, 'videos', videoOwnerId, 'uploads', videoId, 'comments'),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
