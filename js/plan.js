// Definición estática del plan de entrenamiento.
// Añadir un día o un ejercicio nuevo = añadir una entrada aquí, sin tocar lógica.

export const PLAN = {
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

export function getDayById(dayId) {
  return PLAN.days.find(d => d.id === dayId) || null;
}

export function getDayByWeekday(weekday) {
  return PLAN.days.find(d => d.weekday === weekday) || null;
}

export function getAllExercises(day) {
  return day.exercises;
}

export const PHASES = ['definicion', 'volumen', 'mantenimiento'];

export const PHASE_LABELS = {
  definicion: 'Definición',
  volumen: 'Volumen',
  mantenimiento: 'Mantenimiento'
};
