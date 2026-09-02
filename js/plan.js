// Catálogo de rutinas de ejemplo (semillas) + la rutina fija que usaba la
// app antes de guardar rutinas por dispositivo.
//
// Las rutinas de verdad ya NO viven aquí: cada dispositivo guarda las
// suyas en localStorage (ver state.js: createPlan/updatePlan/getPlan...),
// creadas a mano desde el editor de Ajustes o copiadas de una de estas
// semillas al configurar la app por primera vez. Este archivo solo aporta
// el contenido de partida — no hay ninguna rutina "hardcodeada" que se use
// automáticamente para todo el mundo.

const PLAN_PPL_DAYS = [
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
];

// Bloque de rehabilitación de codo, compartido tal cual por los días que lo
// llevan (mismo id => mismo histórico de progreso en los tres días).
const ELBOW_REHAB_BLOCK = [
  { id: 'rehab-isometrico-muneca', name: 'Rehab codo: isométrico de extensión de muñeca', type: 'strength',
    sets: 3, repMin: 20, repMax: 30, repUnit: 's', rpe: 4, unit: 'kg', increment: 1 },
  { id: 'rehab-excentrico-extensores', name: 'Rehab codo: excéntrico de extensores de muñeca (bajada 3-4s, carga muy ligera)', type: 'strength',
    sets: 3, repMin: 10, repMax: 15, rpe: 4, unit: 'kg', increment: 1 },
  { id: 'rehab-pronosupinacion', name: 'Rehab codo: pronación/supinación de antebrazo, carga ligera', type: 'strength',
    sets: 3, repMin: 10, repMax: 12, rpe: 4, unit: 'kg', increment: 1 },
  { id: 'rehab-estiramiento-extensores', name: 'Rehab codo: estiramiento suave de extensores de muñeca', type: 'strength',
    sets: 2, repMin: 20, repMax: 30, repUnit: 's', rpe: 3, unit: 'kg', increment: 1 }
];

const PLAN_ELBOW_DAYS = [
  {
    id: 'push-codo',
    name: 'Push (elbow-safe)',
    weekday: 1, // lunes
    warmup: [],
    exercises: [
      { id: 'press-pecho-maquina-codo', name: 'Press de pecho en máquina o mancuernas agarre neutro', type: 'strength',
        sets: 4, repMin: 8, repMax: 12, rpe: 7, unit: 'kg', increment: 2.5 },
      { id: 'press-militar-maquina-codo', name: 'Press militar en máquina o mancuernas sentado', type: 'strength',
        sets: 3, repMin: 8, repMax: 12, rpe: 7, unit: 'kg', increment: 2.5 },
      { id: 'elevaciones-laterales-codo', name: 'Elevaciones laterales', type: 'strength',
        sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 1 },
      { id: 'triceps-polea-cuerda-codo', name: 'Extensión de tríceps en polea con cuerda (codo pegado al cuerpo)', type: 'strength',
        sets: 3, repMin: 10, repMax: 15, rpe: 6.5, unit: 'kg', increment: 2.5 },
      { id: 'press-pecho-agarre-cerrado-codo', name: 'Press de pecho en máquina, agarre cerrado', type: 'strength',
        sets: 2, repMin: 12, repMax: 15, rpe: 7, unit: 'kg', increment: 2.5 },
      ...ELBOW_REHAB_BLOCK
    ]
  },
  {
    id: 'pull-codo',
    name: 'Pull (elbow-safe)',
    weekday: 2, // martes
    warmup: [],
    exercises: [
      { id: 'jalon-neutro-cerrado-codo', name: 'Jalón al pecho, agarre neutro o cerrado', type: 'strength',
        sets: 4, repMin: 8, repMax: 12, rpe: 7, unit: 'kg', increment: 2.5 },
      { id: 'remo-maquina-neutro-codo', name: 'Remo en máquina, agarre neutro', type: 'strength',
        sets: 4, repMin: 8, repMax: 12, rpe: 7, unit: 'kg', increment: 2.5 },
      { id: 'remo-polea-baja-v-codo', name: 'Remo en polea baja, agarre en V', type: 'strength',
        sets: 3, repMin: 10, repMax: 12, rpe: 7.5, unit: 'kg', increment: 2.5 },
      { id: 'face-pull-codo', name: 'Face pull', type: 'strength',
        sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 2.5 },
      { id: 'curl-martillo-codo', name: 'Curl martillo, carga ligera-moderada', type: 'strength',
        sets: 3, repMin: 10, repMax: 15, rpe: 6.5, unit: 'kg', increment: 1 },
      ...ELBOW_REHAB_BLOCK
    ]
  },
  {
    id: 'legs-a-codo',
    name: 'Legs A (sin restricción)',
    weekday: 3, // miércoles
    warmup: [],
    exercises: [
      { id: 'sentadilla-trasera-codo', name: 'Sentadilla trasera', type: 'strength',
        sets: 4, repMin: 6, repMax: 10, rpe: 7.5, unit: 'kg', increment: 5 },
      { id: 'prensa-codo', name: 'Prensa', type: 'strength',
        sets: 3, repMin: 10, repMax: 12, rpe: 7.5, unit: 'kg', increment: 5 },
      { id: 'zancadas-stepup-codo', name: 'Zancadas o step-up', type: 'strength', perSide: true,
        sets: 3, repMin: 10, repMax: 12, rpe: 7, unit: 'kg', increment: 2 },
      { id: 'curl-femoral-maquina-codo', name: 'Curl femoral en máquina', type: 'strength',
        sets: 3, repMin: 10, repMax: 12, rpe: 7.5, unit: 'kg', increment: 2.5 },
      { id: 'gemelo-codo', name: 'Elevación de gemelo', type: 'strength',
        sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 2.5 },
      { id: 'plancha-core-codo', name: 'Plancha / core', type: 'strength', repUnit: 's',
        sets: 3, repMin: 30, repMax: 45, rpe: 7, unit: 'kg', increment: 2.5 }
    ]
  },
  {
    id: 'upper-mixto-codo',
    name: 'Upper mixto (elbow-safe)',
    weekday: 4, // jueves
    warmup: [],
    exercises: [
      { id: 'press-inclinado-mancuernas-neutro-codo', name: 'Press inclinado con mancuernas, agarre neutro si es posible', type: 'strength',
        sets: 4, repMin: 8, repMax: 12, rpe: 7, unit: 'kg', increment: 2 },
      // Mismo id que en Pull (elbow-safe): mismo ejercicio repetido en dos
      // días, para que Progreso junte el histórico de ambos en vez de
      // partirlo en dos.
      { id: 'remo-maquina-neutro-codo', name: 'Remo en máquina, agarre neutro', type: 'strength',
        sets: 4, repMin: 8, repMax: 12, rpe: 7, unit: 'kg', increment: 2.5 },
      { id: 'press-hombro-maquina-codo', name: 'Press de hombro en máquina', type: 'strength',
        sets: 3, repMin: 8, repMax: 12, rpe: 7.5, unit: 'kg', increment: 2.5 },
      { id: 'jalon-cerrado-upper-codo', name: 'Jalón al pecho, agarre cerrado', type: 'strength',
        sets: 3, repMin: 10, repMax: 12, rpe: 7.5, unit: 'kg', increment: 2.5 },
      { id: 'aperturas-pec-deck-codo', name: 'Aperturas en máquina (pec deck)', type: 'strength',
        sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 2.5 },
      ...ELBOW_REHAB_BLOCK
    ]
  },
  {
    id: 'legs-b-codo',
    name: 'Legs B, pesado (sin restricción)',
    weekday: 6, // sábado
    warmup: [],
    exercises: [
      { id: 'peso-muerto-rumano-codo', name: 'Peso muerto rumano', type: 'strength',
        sets: 4, repMin: 6, repMax: 10, rpe: 7.5, unit: 'kg', increment: 5 },
      { id: 'sentadilla-frontal-hack-codo', name: 'Sentadilla frontal o hack squat', type: 'strength',
        sets: 4, repMin: 6, repMax: 10, rpe: 7.5, unit: 'kg', increment: 5 },
      { id: 'zancada-bulgara-codo', name: 'Zancada búlgara', type: 'strength', perSide: true,
        sets: 3, repMin: 8, repMax: 10, rpe: 8, unit: 'kg', increment: 2 },
      { id: 'curl-femoral-tumbado-codo', name: 'Curl femoral tumbado', type: 'strength',
        sets: 3, repMin: 10, repMax: 12, rpe: 8, unit: 'kg', increment: 2.5 },
      { id: 'gemelo-sentado-codo', name: 'Elevación de gemelo sentado', type: 'strength',
        sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 2.5 },
      { id: 'farmers-walk-codo', name: "Farmer's walk con agarre grueso o straps", type: 'strength', repUnit: 'm',
        sets: 3, repMin: 30, repMax: 40, rpe: 7, unit: 'kg', increment: 5 }
    ]
  }
];

const PLAN_LEG_FOCUS_DAYS = [
  {
    id: 'pierna-cuadriceps-gluteo',
    name: 'Pierna (cuádriceps y glúteo)',
    weekday: 1, // lunes
    warmup: [],
    exercises: [
      { id: 'sentadilla-trasera-goblet', name: 'Sentadilla trasera o goblet', type: 'strength',
        sets: 4, repMin: 8, repMax: 10, rpe: 7.5, unit: 'kg', increment: 5 },
      { id: 'prensa-pies-bajos', name: 'Prensa de piernas, pies bajos', type: 'strength',
        sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 2.5 },
      { id: 'zancadas-caminando-mancuernas', name: 'Zancadas caminando con mancuernas', type: 'strength', perSide: true,
        sets: 3, repMin: 10, repMax: 12, rpe: 8, unit: 'kg', increment: 2 },
      { id: 'extension-cuadriceps-maquina', name: 'Extensión de cuádriceps en máquina', type: 'strength',
        sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 2.5 },
      // Mismo id que en "Pierna (glúteo específico y accesorios)": mismo
      // ejercicio repetido, para que Progreso junte el histórico de ambos
      // días en vez de partirlo en dos.
      { id: 'hip-thrust-barra', name: 'Hip thrust con barra', type: 'strength',
        sets: 3, repMin: 10, repMax: 12, rpe: 7.5, unit: 'kg', increment: 5 },
      { id: 'plancha-toque-hombro', name: 'Plancha con toque de hombro', type: 'strength', repUnit: 's',
        sets: 3, repMin: 30, repMax: 40, rpe: 7, unit: 'kg', increment: 2.5 }
    ]
  },
  {
    id: 'full-body-superior-core-1',
    name: 'Full body superior + core',
    weekday: 2, // martes
    warmup: [],
    exercises: [
      { id: 'press-banca-mancuernas', name: 'Press banca o press con mancuernas', type: 'strength',
        sets: 4, repMin: 8, repMax: 10, rpe: 7.5, unit: 'kg', increment: 2.5 },
      { id: 'remo-barra-maquina', name: 'Remo con barra o en máquina', type: 'strength',
        sets: 4, repMin: 10, repMax: 12, rpe: 7.5, unit: 'kg', increment: 2.5 },
      { id: 'press-militar-mancuernas-fb', name: 'Press militar con mancuernas', type: 'strength',
        sets: 3, repMin: 10, repMax: 12, rpe: 7.5, unit: 'kg', increment: 2 },
      { id: 'jalon-dominadas-asistidas', name: 'Jalón al pecho o dominadas asistidas', type: 'strength',
        sets: 3, repMin: 10, repMax: 12, rpe: 7.5, unit: 'kg', increment: 2.5 },
      // Mismo id que en el día "Full body superior + core (sin espalda)":
      // mismo ejercicio repetido, para que Progreso junte el histórico de
      // ambos días en vez de partirlo en dos.
      { id: 'elevaciones-laterales-fb', name: 'Elevaciones laterales', type: 'strength',
        sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 1 },
      { id: 'pallof-press', name: 'Pallof press', type: 'strength', perSide: true,
        sets: 3, repMin: 10, repMax: 12, rpe: 7, unit: 'kg', increment: 2 }
    ]
  },
  {
    id: 'pierna-cadera-femoral',
    name: 'Pierna (cadera y femoral)',
    weekday: 3, // miércoles
    warmup: [],
    exercises: [
      { id: 'peso-muerto-rumano-barra-fb', name: 'Peso muerto rumano con barra', type: 'strength',
        sets: 4, repMin: 8, repMax: 10, rpe: 7.5, unit: 'kg', increment: 5 },
      { id: 'curl-femoral-tumbado-sentado', name: 'Curl femoral tumbado o sentado', type: 'strength',
        sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 2.5 },
      { id: 'sentadilla-bulgara-mancuernas-fb', name: 'Sentadilla búlgara con mancuernas', type: 'strength', perSide: true,
        sets: 3, repMin: 10, repMax: 12, rpe: 8, unit: 'kg', increment: 2 },
      { id: 'hip-thrust-una-pierna-banda', name: 'Hip thrust a una pierna o con banda', type: 'strength', perSide: true,
        sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 2 },
      { id: 'abduccion-cadera-maquina-banda', name: 'Abducción de cadera en máquina o banda', type: 'strength',
        sets: 3, repMin: 15, repMax: 20, rpe: 8, unit: 'kg', increment: 2.5 },
      { id: 'elevacion-piernas-banco-suelo', name: 'Elevación de piernas en banco/suelo', type: 'strength',
        sets: 3, repMin: 12, repMax: 15, rpe: 7, unit: 'kg', increment: 2.5 }
    ]
  },
  {
    id: 'full-body-superior-core-2',
    name: 'Full body superior + core (sin espalda)',
    weekday: 4, // jueves
    warmup: [],
    exercises: [
      { id: 'press-inclinado-mancuernas-fb', name: 'Press inclinado con mancuernas', type: 'strength',
        sets: 4, repMin: 10, repMax: 12, rpe: 7.5, unit: 'kg', increment: 2 },
      { id: 'press-hombro-maquina-fb', name: 'Press de hombro en máquina', type: 'strength',
        sets: 4, repMin: 10, repMax: 12, rpe: 7.5, unit: 'kg', increment: 2.5 },
      { id: 'elevaciones-laterales-fb', name: 'Elevaciones laterales', type: 'strength',
        sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 1 },
      { id: 'aperturas-cruce-poleas-fb', name: 'Aperturas en máquina o cruce de poleas', type: 'strength',
        sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 2.5 },
      // Superserie (mismo patrón que Upper de PPL): dos ejercicios enlazados
      // con el mismo grupo, no un único ejercicio de nombre compuesto.
      { id: 'curl-biceps-superset-fb', name: 'Curl de bíceps (superserie)', type: 'strength', superset: 'A',
        sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 1 },
      { id: 'triceps-extension-superset-fb', name: 'Extensión de tríceps (superserie)', type: 'strength', superset: 'A',
        sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 2.5 },
      { id: 'plancha-lateral', name: 'Plancha lateral', type: 'strength', perSide: true, repUnit: 's',
        sets: 3, repMin: 30, repMax: 40, rpe: 7, unit: 'kg', increment: 2.5 }
    ]
  },
  {
    id: 'pierna-gluteo-especifico',
    name: 'Pierna (glúteo específico y accesorios)',
    weekday: 6, // sábado
    warmup: [],
    exercises: [
      { id: 'hip-thrust-barra', name: 'Hip thrust con barra', type: 'strength',
        sets: 4, repMin: 8, repMax: 10, rpe: 8, unit: 'kg', increment: 5 },
      { id: 'sentadilla-sumo-mancuerna-barra', name: 'Sentadilla sumo con mancuerna o barra', type: 'strength',
        sets: 3, repMin: 10, repMax: 12, rpe: 7.5, unit: 'kg', increment: 2.5 },
      { id: 'patada-gluteo-polea-maquina', name: 'Patada de glúteo en polea o máquina', type: 'strength', perSide: true,
        sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 2.5 },
      { id: 'step-up-mancuernas', name: 'Step-up con mancuernas', type: 'strength', perSide: true,
        sets: 3, repMin: 10, repMax: 12, rpe: 8, unit: 'kg', increment: 2 },
      { id: 'puente-gluteo-una-pierna', name: 'Puente de glúteo a una pierna', type: 'strength', perSide: true,
        sets: 3, repMin: 12, repMax: 15, rpe: 8, unit: 'kg', increment: 2 },
      { id: 'rueda-abdominal-crunch-polea', name: 'Rueda abdominal o crunch en polea', type: 'strength',
        sets: 3, repMin: 10, repMax: 15, rpe: 7.5, unit: 'kg', increment: 2.5 }
    ]
  }
];

// Usado únicamente para migrar dispositivos que ya tenían historial guardado
// con la única rutina fija de antes de este cambio (ver state.js). Su forma
// (version, days, ids) debe quedarse igual para siempre, aunque el catálogo
// de semillas de abajo cambie.
export const LEGACY_MIGRATION_PLAN = { version: 1, name: 'PPL + Upper/Lower', days: PLAN_PPL_DAYS };

// Copia de PLAN_PPL_DAYS para el catálogo de plantillas, con los ids de los
// ejercicios que se repetían en más de un día unificados: "Extensión de
// cuádriceps ligera" y "Mi rutina de abs (5 min)" estaban en Lower y en
// Legs con ids distintos, así que Progreso los trataba como dos ejercicios
// separados en vez de uno con todo su histórico junto (mismo patrón que
// ELBOW_REHAB_BLOCK: mismo id => mismo histórico). No se toca
// PLAN_PPL_DAYS directamente: LEGACY_MIGRATION_PLAN necesita que sus ids
// se queden exactamente iguales para siempre (ver arriba).
const SEED_PPL_DAYS = JSON.parse(JSON.stringify(PLAN_PPL_DAYS));
SEED_PPL_DAYS.find(d => d.id === 'legs').exercises.find(e => e.id === 'extension-cuadriceps-lig-legs').id = 'extension-cuadriceps-lig';
SEED_PPL_DAYS.find(d => d.id === 'legs').exercises.find(e => e.id === 'abs-legs').id = 'abs-lower';

// Rutinas de ejemplo que se ofrecen al configurar la app por primera vez en
// un dispositivo nuevo, o para crear una rutina copiando una de estas como
// punto de partida. Sin version: se asigna al copiarla a un dispositivo.
export const SEED_PLANS = [
  {
    name: 'PPL + Upper/Lower',
    days: SEED_PPL_DAYS
  },
  {
    name: 'Fuerza 5 días — adaptado codo',
    description: 'Punto de partida orientativo para entrenar con tendinitis de codo, no es indicación médica. Ajusta carga y ejercicios según tu evolución; si el dolor persiste, consulta con tu fisioterapeuta o médico.',
    days: PLAN_ELBOW_DAYS
  },
  {
    name: 'Full body — énfasis pierna',
    days: PLAN_LEG_FOCUS_DAYS
  }
];

export const PHASES = ['definicion', 'volumen', 'mantenimiento'];

export const PHASE_LABELS = {
  definicion: 'Definición',
  volumen: 'Volumen',
  mantenimiento: 'Mantenimiento'
};
