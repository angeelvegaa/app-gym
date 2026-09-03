// Motor de reglas sobre el historial de un ejercicio. Función pura, sin IA:
// solo condiciones sobre los datos que el usuario ya registró.

function maxWeightInSession(entry) {
  const done = entry.sets.filter(s => s.status === 'done' && s.weight != null);
  if (!done.length) return null;
  return Math.max(...done.map(s => s.weight));
}

function allSetsDone(entry) {
  return entry.sets.length > 0 && entry.sets.every(s => s.status === 'done');
}

function skippedCount(entry) {
  return entry.sets.filter(s => s.status === 'skipped').length;
}

function maxRepsAtMaxWeight(entry, weight) {
  const atWeight = entry.sets.filter(s => s.status === 'done' && s.weight === weight);
  if (!atWeight.length) return 0;
  return Math.max(...atWeight.map(s => s.reps || 0));
}

function confidenceFor(n) {
  if (n >= 5) return 'alta';
  if (n >= 3) return 'media';
  return 'baja';
}

// Umbrales de las reglas 1 y 2, ajustados por fase.
const PHASE_RULES = {
  definicion: { rule1MaxRpeSlack: 1, rule2StreakNeeded: 4 },
  volumen: { rule1MaxRpeSlack: 0, rule2StreakNeeded: 2 },
  mantenimiento: { rule1MaxRpeSlack: 1, rule2StreakNeeded: 3 }
};

// history: array de getExerciseHistory(exerciseId), ascendente por fecha.
// Puede incluir entradas con `skipped: true` (días marcados como no
// entrenado, sin datos de series) o `partial: true` (sí entrenó, pero no
// siguió el plan al 100% — datos reales pero de baja fiabilidad para estas
// reglas).
// exercise: definición del ejercicio (repMin, repMax, rpe, increment...).
// phase: 'definicion' | 'volumen' | 'mantenimiento'.
export function getSuggestions(history, exercise, phase, targetRpe) {
  // Sin RPE objetivo todavía (ejercicio recién añadido, sin sesiones de
  // referencia) ninguna de las reglas de abajo tiene con qué comparar.
  if (targetRpe == null) return [];
  // De peso corporal: todas las reglas de abajo razonan sobre progresión de
  // peso (subir Nkg, bajar un 5-10%...), que no tiene sentido aquí.
  if (exercise.bodyweight) return [];

  // Un bloque saltado (viaje, lesión...) o un día no seguido al 100% corta
  // cualquier racha: las reglas de estancamiento/progreso solo miran
  // sesiones reales y de confianza desde el último de estos huecos, para no
  // comparar la sesión de antes con la de después como si fueran
  // consecutivas.
  const lastGapIdx = history.reduce((acc, h, i) => (h.skipped || h.partial ? i : acc), -1);
  const trained = history.slice(lastGapIdx + 1).filter(h => !h.skipped && !h.partial);

  if (!trained.length) return [];
  const rules = PHASE_RULES[phase] || PHASE_RULES.definicion;
  const windowSize = Math.min(6, trained.length);
  const recent = trained.slice(-windowSize);

  if (recent.length < 2) {
    return [{
      id: 'not-enough-data',
      priority: 0,
      confidence: 'baja',
      text: 'Registra 2 sesiones para recibir sugerencias en este ejercicio.'
    }];
  }

  const suggestions = [];
  const confidence = confidenceFor(recent.length);

  // Regla 1: subir peso.
  const last2 = recent.slice(-2);
  const rule1Ok = last2.length === 2 && last2.every(e => {
    if (!allSetsDone(e) || e.rpe == null) return false;
    const w = maxWeightInSession(e);
    const maxReps = maxRepsAtMaxWeight(e, w);
    const rpeLimit = rules.rule1MaxRpeSlack === 0 ? targetRpe : targetRpe - 1;
    return maxReps >= exercise.repMax && e.rpe <= rpeLimit;
  });
  if (rule1Ok) {
    const currentWeight = maxWeightInSession(last2[last2.length - 1]) || 0;
    const nextWeight = currentWeight + exercise.increment;
    suggestions.push({
      id: 'progress',
      priority: 3,
      confidence,
      text: `Sube a ${nextWeight}${exercise.unit} en ${exercise.name}.`
    });
  }

  // Regla 2: estancamiento.
  const streakNeeded = rules.rule2StreakNeeded;
  if (recent.length >= streakNeeded) {
    const lastN = recent.slice(-streakNeeded);
    const weights = lastN.map(maxWeightInSession);
    const sameWeight = weights.every(w => w != null && w === weights[0]);
    const repsProgressed = (() => {
      for (let i = 1; i < lastN.length; i++) {
        const prevMax = maxRepsAtMaxWeight(lastN[i - 1], weights[i - 1]);
        const curMax = maxRepsAtMaxWeight(lastN[i], weights[i]);
        if (curMax > prevMax) return true;
      }
      return false;
    })();
    if (sameWeight && !repsProgressed) {
      if (phase === 'definicion') {
        suggestions.push({
          id: 'plateau-def',
          priority: 1,
          confidence,
          text: `${streakNeeded} sesiones igual en ${exercise.name}. Mantener carga en definición ya es progreso; si quieres, prueba +1 rep.`
        });
      } else {
        suggestions.push({
          id: 'plateau',
          priority: 2,
          confidence,
          text: `${streakNeeded} sesiones igual en ${exercise.name}, prueba +${exercise.increment}${exercise.unit} o +1 rep.`
        });
      }
    }
  }

  // Regla 3: retroceso.
  if (last2.length === 2) {
    const rule3 = last2.every(e => e.rpe != null && e.rpe >= targetRpe + 1 && (() => {
      const w = maxWeightInSession(e);
      const maxReps = maxRepsAtMaxWeight(e, w);
      return maxReps < exercise.repMin;
    })());
    if (rule3) {
      const text = phase === 'definicion'
        ? `RPE alta y reps bajas en ${exercise.name}. Normal en definición: ajusta expectativas o baja un 5-10%.`
        : `Baja un 5-10% en ${exercise.name} o revisa descanso y sueño.`;
      suggestions.push({ id: 'regression', priority: phase === 'definicion' ? 1 : 3, confidence, text });
    }
  }

  // Regla 4: series saltadas.
  const skippedLast2 = last2.reduce((sum, e) => sum + skippedCount(e), 0);
  if (skippedLast2 >= 2) {
    suggestions.push({
      id: 'skipped-sets',
      priority: 2,
      confidence,
      text: `Llevas varias series sin completar en ${exercise.name}: ¿demasiado volumen o poco descanso?`
    });
  }

  // Regla 5: RPE objetivo bajo (solo si no saltó ya la regla 1).
  if (!rule1Ok) {
    const belowTarget = recent.every(e => e.rpe != null && e.rpe <= targetRpe - 1 && allSetsDone(e));
    if (belowTarget && recent.length >= 2 && (phase === 'volumen' || phase === 'definicion')) {
      suggestions.push({
        id: 'rpe-low',
        priority: 1,
        confidence,
        text: `Podrías subir la RPE objetivo de ${targetRpe} a ${targetRpe + 1} en ${exercise.name}.`
      });
    }
  }

  // Mantenimiento: solo mostramos retroceso y series saltadas.
  const filtered = phase === 'mantenimiento'
    ? suggestions.filter(s => ['regression', 'skipped-sets', 'not-enough-data'].includes(s.id))
    : suggestions;

  return filtered.sort((a, b) => b.priority - a.priority);
}
