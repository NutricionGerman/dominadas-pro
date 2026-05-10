// src/utils/calculations.js
// ─── Lógica matemática de progresiones ──────────────────────────────────────
// Toda la matemática de RM y carga migrada del appDominadas.html original.
// Estas funciones son puras (sin side-effects) → fáciles de testear.

const EPLEY_FACTOR = 0.0333;

/**
 * Calcula el 1RM Total (peso corporal + lastre) usando la fórmula de Epley.
 * @param {number} bodyWeight - Peso corporal en kg
 * @param {number} addedWeight - Lastre en kg
 * @param {number} reps - Repeticiones realizadas
 * @returns {number} RM total en kg
 */
export function calcRM(bodyWeight, addedWeight, reps) {
  const totalWeight = bodyWeight + addedWeight;
  const multiplier = 1 + (reps - 1) * EPLEY_FACTOR;
  return totalWeight * multiplier;
}

/**
 * Calcula el lastre óptimo para una serie específica, considerando fatiga acumulada.
 * @param {number} rmTotal - RM total (BW + lastre)
 * @param {number} bodyWeight - Peso corporal en kg
 * @param {number} targetReps - Repeticiones objetivo para esta serie
 * @param {number} setIndex - Índice de la serie (0-based)
 * @param {number} fatiguePercent - Porcentaje de fatiga por serie (ej: 3.0)
 * @returns {number} Lastre recomendado en kg (redondeado a 0.5 kg)
 */
export function getTargetWeight(rmTotal, bodyWeight, targetReps, setIndex, fatiguePercent) {
  const fatigueFactor = fatiguePercent / 100;
  const fatiguedRM = rmTotal * (1 - fatigueFactor * setIndex);
  const multiplier = 1 + (targetReps - 1) * EPLEY_FACTOR;
  const totalNeeded = fatiguedRM / multiplier;
  const ballast = totalNeeded - bodyWeight;
  return Math.round(ballast * 2) / 2; // redondeo a 0.5 kg
}

/**
 * Calcula las reps posibles dado un lastre y el RM actual.
 * @param {number} bodyWeight - Peso corporal en kg
 * @param {number} rmBallast - Lastre en el 1RM (kg)
 * @param {number} usedBallast - Lastre que se va a usar (kg)
 * @returns {number} Reps estimadas
 */
export function calcRepsFromRM(bodyWeight, rmBallast, usedBallast) {
  const rmTotal = bodyWeight + rmBallast;
  const usedTotal = bodyWeight + usedBallast;
  const reps = ((rmTotal / usedTotal - 1) / EPLEY_FACTOR) + 1;
  return Math.max(0, Math.round(reps));
}

/**
 * Calcula el lastre necesario para hacer X reps dado el RM actual.
 * @param {number} bodyWeight - Peso corporal en kg
 * @param {number} rmBallast - Lastre en el 1RM (kg)
 * @param {number} targetReps - Repeticiones objetivo
 * @returns {number} Lastre necesario en kg
 */
export function calcWeightFromRM(bodyWeight, rmBallast, targetReps) {
  const rmTotal = bodyWeight + rmBallast;
  const multiplier = 1 + (targetReps - 1) * EPLEY_FACTOR;
  const totalNeeded = rmTotal / multiplier;
  return totalNeeded - bodyWeight;
}

/**
 * Calcula el RM relativo (lastre / peso corporal) para el ranking.
 * Un RM relativo de 1.0 significa que levantás tu propio peso en lastre.
 * @param {number} rmBallast - Lastre del 1RM en kg
 * @param {number} bodyWeight - Peso corporal en kg
 * @returns {number} RM relativo
 */
export function calcRelativeRM(rmBallast, bodyWeight) {
  if (bodyWeight <= 0) return 0;
  return rmBallast / bodyWeight;
}

/**
 * Genera el plan completo de 5 semanas.
 * @param {object} config - { bodyWeight, addedWeight, reps, jump, fatigue, sessions[] }
 * @returns {Array} Plan de semanas con días y series
 */
export function generateProgram(config) {
  const { bodyWeight, addedWeight, reps, jump, fatigue, sessions } = config;
  const rmTotal = calcRM(bodyWeight, addedWeight, reps);
  const expectedRIR = [null, 3, 2, 2, 1, 0];
  const plan = [];

  for (let week = 1; week <= 5; week++) {
    const weekData = {
      week,
      isRecord: week === 5,
      targetRIR: expectedRIR[week],
      days: [],
    };

    sessions.forEach((sessionReps, dayIndex) => {
      if (sessionReps.length === 0) return;
      const dayData = { day: dayIndex + 1, sets: [] };

      sessionReps.forEach((targetReps, setIndex) => {
        const baseWeight = getTargetWeight(rmTotal, bodyWeight, targetReps, setIndex, fatigue);
        const weekModifier = (week - 4) * jump;
        const finalWeight = baseWeight + weekModifier;

        dayData.sets.push({
          setNumber: setIndex + 1,
          reps: targetReps,
          weight: finalWeight,
          isTest: week === 5 && setIndex === 0,
        });
      });

      weekData.days.push(dayData);
    });

    plan.push(weekData);
  }

  return plan;
}

/**
 * Evalúa si el RIR ingresado es correcto para la semana.
 * @param {number} inputRIR - RIR ingresado por el usuario
 * @param {number} week - Semana actual (1-5)
 * @returns {'good'|'warning'|'bad'} Estado de la evaluación
 */
export function evaluateRIR(inputRIR, week) {
  const expectedRIR = [null, 3, 2, 2, 1, 0][week];
  if (inputRIR >= expectedRIR) return 'good';
  if (inputRIR === expectedRIR - 1) return 'warning';
  return 'bad';
}
