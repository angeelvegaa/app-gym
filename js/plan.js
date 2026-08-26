// Registro de versiones del plan de entrenamiento.
//
// Cada versión queda congelada aquí para siempre: aunque cambies de rutina
// más adelante (añadir boxeo, cambiar un día...), las sesiones ya
// registradas siguen resolviendo sus ejercicios y días contra la versión
// con la que se guardaron (session.planVersion), así que su historial no
// se rompe ni hay que borrar ni migrar nada.
//
// Para cambiar de plan:
//   1. Añade una entrada nueva a PLANS con el siguiente número de versión.
//   2. Sube ACTIVE_PLAN_VERSION a ese número.
//   3. No toques ni borres las versiones anteriores.

const PLAN_V1 = {
  version: 1,
  days: [
    {
      id: 'push',
      name: 'Push',
      weekday: 1, // lunes
      warmup: [
        { id: 'six-way', name: 'Six Way de hombro', type: 'warmup' },
        { id: 'fondos-ligeros-push', name: 'Fondos en paralelas ligeros', type: 'warmup' }
      ],
      exercises: [
        { id: 'press-banca', name: 'Press banca', type: 'strength',
          sets: 4, repMin: 6, repMax: 10, rpe: 7, unit: 'kg', increment: 2.5 },
        { id: 'press-militar-pie', name: 'Press militar de pie', type: 'strength',
          sets: 3, repMin: 6, repMax: 10, rpe: 7, unit: 'kg', increment: 2.5 },
        { id: 'press-inclinado-mancuernas', name: 'Press inclinado con mancuernas', type: 'strength',
          sets: 3, repMin: 8, repMax: 12, rpe: 7.5, unit: 'kg', increment: 2 },
        { id: 'elevaciones-laterales', name: 'Elevaciones laterales', type: 'strength',
          sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 1 },
        { id: 'pajaro-rear-delt', name: 'Pájaro / rear delt fly', type: 'strength',
          sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 1 },
        { id: 'triceps-polea', name: 'Extensión de tríceps en polea', type: 'strength',
          sets: 3, repMin: 10, repMax: 15, rpe: 8, unit: 'kg', increment: 2.5 }
      ]
    },
    {
      id: 'pull',
      name: 'Pull',
      weekday: 2, // martes
      warmup: [],
      exercises: [
        { id: 'dominadas-jalon', name: 'Dominadas o jalón al pecho', type: 'strength',
          sets: 4, repMin: 6, repMax: 10, rpe: 7, unit: 'kg', increment: 2.5 },
        { id: 'remo-barra-mancuerna', name: 'Remo con barra o mancuerna', type: 'strength',
          sets: 4, repMin: 6, repMax: 10, rpe: 7, unit: 'kg', increment: 2.5 },
        { id: 'remo-polea-baja', name: 'Remo en polea baja (agarre neutro)', type: 'strength',
          sets: 3, repMin: 8, repMax: 12, rpe: 7.5, unit: 'kg', increment: 2.5 },
        { id: 'face-pull', name: 'Face pull', type: 'strength',
          sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 2.5 },
        { id: 'curl-biceps-pull', name: 'Curl de bíceps', type: 'strength',
          sets: 3, repMin: 10, repMax: 15, rpe: 8, unit: 'kg', increment: 1 }
      ]
    },
    {
      id: 'lower',
      name: 'Lower (ligero)',
      weekday: 3, // miércoles
      warmup: [
        { id: 'bici-suave-lower', name: 'Bici suave (5 min)', type: 'warmup' }
      ],
      exercises: [
        { id: 'extension-cuadriceps-lig', name: 'Extensión de cuádriceps ligera', type: 'strength',
          sets: 2, repMin: 15, repMax: 20, rpe: 4.5, unit: 'kg', increment: 2.5 },
        { id: 'prensa-goblet', name: 'Prensa o sentadilla goblet', type: 'strength',
          sets: 3, repMin: 10, repMax: 12, rpe: 6.5, unit: 'kg', increment: 5 },
        { id: 'peso-muerto-rumano-mancuernas', name: 'Peso muerto rumano con mancuernas', type: 'strength',
          sets: 3, repMin: 10, repMax: 12, rpe: 6.5, unit: 'kg', increment: 2.5 },
        { id: 'zancadas-stepup', name: 'Zancadas o step-up', type: 'strength', perSide: true,
          sets: 3, repMin: 10, repMax: 12, rpe: 6.5, unit: 'kg', increment: 2 },
        { id: 'gemelo-pie', name: 'Elevación de gemelo de pie', type: 'strength',
          sets: 3, repMin: 12, repMax: 15, rpe: 7, unit: 'kg', increment: 2.5 },
        { id: 'abs-lower', name: 'Mi rutina de abs (5 min)', type: 'checkbox' }
      ]
    },
    {
      id: 'upper',
      name: 'Upper',
      weekday: 4, // jueves
      warmup: [
        { id: 'six-way-upper', name: 'Six Way de hombro', type: 'warmup' },
        { id: 'fondos-ligeros-upper', name: 'Fondos en paralelas ligeros', type: 'warmup' }
      ],
      exercises: [
        { id: 'press-inclinado-barra-mancuerna', name: 'Press inclinado con barra o mancuerna', type: 'strength',
          sets: 4, repMin: 6, repMax: 10, rpe: 7, unit: 'kg', increment: 2.5 },
        { id: 'remo-maquina-neutro', name: 'Remo en máquina (agarre neutro)', type: 'strength',
          sets: 4, repMin: 8, repMax: 12, rpe: 7, unit: 'kg', increment: 2.5 },
        { id: 'press-militar-mancuernas-sentado', name: 'Press militar con mancuernas sentado', type: 'strength',
          sets: 3, repMin: 8, repMax: 12, rpe: 7.5, unit: 'kg', increment: 2 },
        { id: 'jalon-agarre-cerrado', name: 'Jalón al pecho agarre cerrado', type: 'strength',
          sets: 3, repMin: 10, repMax: 12, rpe: 7.5, unit: 'kg', increment: 2.5 },
        { id: 'aperturas-cruce-poleas', name: 'Aperturas en máquina o cruce de poleas', type: 'strength',
          sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 2.5 },
        { id: 'curl-biceps-superset', name: 'Curl de bíceps (superserie)', type: 'strength', superset: 'A',
          sets: 3, repMin: 10, repMax: 15, rpe: 8, unit: 'kg', increment: 1 },
        { id: 'triceps-extension-superset', name: 'Extensión de tríceps (superserie)', type: 'strength', superset: 'A',
          sets: 3, repMin: 10, repMax: 15, rpe: 8, unit: 'kg', increment: 2.5 }
      ]
    },
    {
      id: 'legs',
      name: 'Legs (pesado)',
      weekday: 6, // sábado
      warmup: [
        { id: 'bici-suave-legs', name: 'Bici suave (5 min)', type: 'warmup' }
      ],
      exercises: [
        { id: 'extension-cuadriceps-lig-legs', name: 'Extensión de cuádriceps ligera', type: 'strength',
          sets: 2, repMin: 15, repMax: 20, rpe: 4.5, unit: 'kg', increment: 2.5 },
        { id: 'curl-femoral-tumbado', name: 'Curl femoral tumbado', type: 'strength',
          sets: 3, repMin: 10, repMax: 12, rpe: 8, unit: 'kg', increment: 2.5 },
        { id: 'sentadilla-trasera', name: 'Sentadilla trasera', type: 'strength',
          sets: 4, repMin: 5, repMax: 8, rpe: 7.5, unit: 'kg', increment: 5 },
        { id: 'peso-muerto-rumano-barra', name: 'Peso muerto rumano con barra', type: 'strength',
          sets: 4, repMin: 6, repMax: 10, rpe: 7.5, unit: 'kg', increment: 5 },
        { id: 'zancada-bulgara', name: 'Zancada búlgara', type: 'strength', perSide: true,
          sets: 3, repMin: 8, repMax: 10, rpe: 8, unit: 'kg', increment: 2 },
        { id: 'gemelo-sentado', name: 'Elevación de gemelo sentado', type: 'strength',
          sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 2.5 },
        { id: 'farmers-walk', name: "Farmer's walk", type: 'strength', repUnit: 'm',
          sets: 3, repMin: 30, repMax: 40, rpe: 7, unit: 'kg', increment: 5 },
        { id: 'abs-legs', name: 'Mi rutina de abs (5 min)', type: 'checkbox' }
      ]
    }
  ]
};

export const PLANS = {
  1: PLAN_V1
};

// Versión vigente ahora mismo. Súbela al añadir un plan nuevo a PLANS.
export const ACTIVE_PLAN_VERSION = 1;

// El plan activo. Todo lo que crea datos nuevos (sesión de hoy, ajustes de
// días de la semana...) usa esto. Para leer un plan histórico usa getPlan().
export const PLAN = PLANS[ACTIVE_PLAN_VERSION];

export function getPlan(version = ACTIVE_PLAN_VERSION) {
  return PLANS[version] || PLANS[ACTIVE_PLAN_VERSION];
}

export function getDayById(dayId, version = ACTIVE_PLAN_VERSION) {
  return getPlan(version).days.find(d => d.id === dayId) || null;
}

// Todas las versiones de plan alguna vez usadas, de más reciente a más antigua.
export function getAllPlanVersions() {
  return Object.keys(PLANS).map(Number).sort((a, b) => b - a);
}

// Todos los ejercicios que hayan existido en cualquier versión del plan,
// para el selector de Progreso: así se puede seguir consultando el
// histórico de un ejercicio aunque ya no esté en la rutina activa. Si el
// mismo id aparece en varias versiones, se usa la definición más reciente.
export function getAllKnownExercises() {
  const map = new Map();
  getAllPlanVersions().slice().reverse().forEach(v => {
    getPlan(v).days.forEach(day => {
      day.exercises.forEach(ex => {
        map.set(ex.id, { ...ex, dayName: day.name, planVersion: v });
      });
    });
  });
  return [...map.values()];
}

export const PHASES = ['definicion', 'volumen', 'mantenimiento'];

export const PHASE_LABELS = {
  definicion: 'Definición',
  volumen: 'Volumen',
  mantenimiento: 'Mantenimiento'
};
