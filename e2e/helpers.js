// Datos mínimos de plan/ajustes/sesiones para las pruebas e2e, escritos
// directamente en localStorage con el mismo formato que usa js/storage.js
// (evita depender del flujo de onboarding, que no es lo que se prueba aquí).

export const EXERCISE_ID = 'ex1';
export const DAY_ID = 'day1';

export function buildPlan() {
  return {
    schemaVersion: 1,
    plans: {
      1: {
        version: 1,
        name: 'Plan de prueba',
        days: [
          {
            id: DAY_ID,
            name: 'Día de prueba',
            weekday: 1, // lunes
            warmup: [],
            exercises: [
              { id: EXERCISE_ID, name: 'Press banca test', type: 'strength',
                sets: 3, repMin: 6, repMax: 10, rpe: 7, unit: 'kg', increment: 2.5 }
            ]
          }
        ]
      }
    },
    activeVersion: 1,
    nextVersion: 2
  };
}

export function buildSettings(blockStart) {
  return {
    schemaVersion: 1,
    phase: 'definicion',
    blockStart,
    weekdays: { [DAY_ID]: 1 }
  };
}

// Sesión "completada" del ejercicio de prueba, con un peso dado.
export function buildSession(dateStr, block, weekInBlock, weight) {
  const id = `${dateStr}_${DAY_ID}`;
  return [id, {
    id,
    date: dateStr,
    dayId: DAY_ID,
    planVersion: 1,
    block,
    weekInBlock,
    phase: 'definicion',
    status: 'completed',
    entries: {
      [EXERCISE_ID]: {
        sets: [
          { status: 'done', weight, reps: 8 },
          { status: 'done', weight, reps: 8 }
        ],
        rpe: 7
      }
    },
    reason: null
  }];
}

// Escribe plan + ajustes (+ sesiones opcionales) en localStorage antes de la
// primera navegación, para que app.js arranque ya con ese estado.
export async function seedApp(page, { blockStart, sessions = [] }) {
  const plans = buildPlan();
  const settings = buildSettings(blockStart);
  const sessionsMap = Object.fromEntries(sessions);

  await page.addInitScript(([plansData, settingsData, sessionsData]) => {
    localStorage.setItem('gym.plans', JSON.stringify(plansData));
    localStorage.setItem('gym.settings', JSON.stringify(settingsData));
    localStorage.setItem('gym.sessions', JSON.stringify({ schemaVersion: 1, sessions: sessionsData }));
  }, [plans, settings, sessionsMap]);
}

// 'YYYY-MM-DD' -> Date a mediodía local, para fijar el reloj de Playwright
// sin sorpresas de huso horario cerca de medianoche.
export function atNoon(dateStr) {
  return new Date(`${dateStr}T12:00:00`);
}

// Añade `days` días a una fecha 'YYYY-MM-DD' (aritmética simple, sin líos de
// zona horaria: se opera en UTC puro sobre el propio string).
export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
