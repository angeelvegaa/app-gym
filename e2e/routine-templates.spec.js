// Catálogo de rutinas de ejemplo: que la nueva "Full body — énfasis pierna"
// aparezca tanto en el onboarding de dispositivo nuevo como en el selector
// de plantillas de Ajustes (con una rutina ya activa), que activar una
// plantilla desde Ajustes no borre el historial de la rutina anterior, y
// que el contenido de los 5 días coincida exactamente con lo especificado.
import { test, expect } from '@playwright/test';
import { DAY_ID, buildSettings, buildSession, seedApp } from './helpers.js';

const LEG_FOCUS_NAME = 'Full body — énfasis pierna';

// Nombre de cada día en el orden en que deben listarse (por día de la
// semana: lunes, martes, miércoles, jueves, sábado) junto con el nombre y
// el detalle ("N series[ por lado] · min-maxUNIDAD · RPE r") exactos de
// cada ejercicio, tal y como los renderiza js/ui/routine.js.
const LEG_FOCUS_DAYS = [
  {
    weekday: 'Lunes',
    name: 'Pierna (cuádriceps y glúteo)',
    exercises: [
      ['Sentadilla trasera o goblet', '4 series · 8-10 · RPE 7.5'],
      ['Prensa de piernas, pies bajos', '3 series · 12-15 · RPE 8'],
      ['Zancadas caminando con mancuernas', '3 series por lado · 10-12 · RPE 8'],
      ['Extensión de cuádriceps en máquina', '3 series · 12-15 · RPE 8'],
      ['Hip thrust con barra', '3 series · 10-12 · RPE 7.5'],
      ['Plancha con toque de hombro', '3 series · 30-40s · RPE 7']
    ]
  },
  {
    weekday: 'Martes',
    name: 'Full body superior + core',
    exercises: [
      ['Press banca o press con mancuernas', '4 series · 8-10 · RPE 7.5'],
      ['Remo con barra o en máquina', '4 series · 10-12 · RPE 7.5'],
      ['Press militar con mancuernas', '3 series · 10-12 · RPE 7.5'],
      ['Jalón al pecho o dominadas asistidas', '3 series · 10-12 · RPE 7.5'],
      ['Elevaciones laterales', '3 series · 12-15 · RPE 8'],
      ['Pallof press', '3 series por lado · 10-12 · RPE 7']
    ]
  },
  {
    weekday: 'Miércoles',
    name: 'Pierna (cadera y femoral)',
    exercises: [
      ['Peso muerto rumano con barra', '4 series · 8-10 · RPE 7.5'],
      ['Curl femoral tumbado o sentado', '3 series · 12-15 · RPE 8'],
      ['Sentadilla búlgara con mancuernas', '3 series por lado · 10-12 · RPE 8'],
      ['Hip thrust a una pierna o con banda', '3 series por lado · 12-15 · RPE 8'],
      ['Abducción de cadera en máquina o banda', '3 series · 15-20 · RPE 8'],
      ['Elevación de piernas en banco/suelo', '3 series · 12-15 · RPE 7']
    ]
  },
  {
    weekday: 'Jueves',
    name: 'Full body superior + core (sin espalda)',
    exercises: [
      ['Press inclinado con mancuernas', '4 series · 10-12 · RPE 7.5'],
      ['Press de hombro en máquina', '4 series · 10-12 · RPE 7.5'],
      ['Elevaciones laterales', '3 series · 12-15 · RPE 8'],
      ['Aperturas en máquina o cruce de poleas', '3 series · 12-15 · RPE 8'],
      // Especificado como una superserie de dos ejercicios; modelada como
      // dos entradas enlazadas (mismo patrón que el resto del catálogo),
      // no como una sola fila con el nombre compuesto.
      ['Curl de bíceps (superserie)', '3 series · 12-15 · RPE 8'],
      ['Extensión de tríceps (superserie)', '3 series · 12-15 · RPE 8'],
      ['Plancha lateral', '3 series por lado · 30-40s · RPE 7']
    ]
  },
  {
    weekday: 'Sábado',
    name: 'Pierna (glúteo específico y accesorios)',
    exercises: [
      ['Hip thrust con barra', '4 series · 8-10 · RPE 8'],
      ['Sentadilla sumo con mancuerna o barra', '3 series · 10-12 · RPE 7.5'],
      ['Patada de glúteo en polea o máquina', '3 series por lado · 12-15 · RPE 8'],
      ['Step-up con mancuernas', '3 series por lado · 10-12 · RPE 8'],
      ['Puente de glúteo a una pierna', '3 series por lado · 12-15 · RPE 8'],
      ['Rueda abdominal o crunch en polea', '3 series · 10-15 · RPE 7.5']
    ]
  }
];

// Recorre las 5 pantallas de detalle de día de la rutina ACTIVA y compara
// nombre + detalle de cada ejercicio, en orden, con lo especificado.
async function verifyLegFocusContent(page) {
  await page.goto('/#/routine');
  for (const day of LEG_FOCUS_DAYS) {
    await page.getByRole('button', { name: `${day.weekday} — ${day.name}` }).click();
    await expect(page.locator('h2')).toHaveText(day.name);
    const rows = page.locator('.routine-item');
    await expect(rows).toHaveCount(day.exercises.length);
    for (let i = 0; i < day.exercises.length; i++) {
      const [name, detail] = day.exercises[i];
      await expect(rows.nth(i).locator('.routine-ex-name')).toHaveText(name);
      await expect(rows.nth(i).locator('.routine-ex-detail')).toHaveText(detail);
    }
    await page.getByRole('button', { name: '← Mi rutina' }).click();
  }
}

test('la nueva rutina aparece en el onboarding de un dispositivo nuevo y su contenido es exacto', async ({ page }) => {
  // Dispositivo sin ninguna rutina guardada: fuerza el onboarding.
  await page.goto('/');

  await expect(page.getByRole('heading', { name: LEG_FOCUS_NAME })).toBeVisible();
  const card = page.locator('.card', { has: page.getByRole('heading', { name: LEG_FOCUS_NAME }) });
  await expect(card).toContainText('5 días');
  await card.getByRole('button', { name: 'Usar esta rutina' }).click();

  await expect(page).toHaveURL(/#\/today$/);
  await verifyLegFocusContent(page);
});

test('con una rutina ya activa, se puede elegir la nueva desde las plantillas de Ajustes sin perder el historial anterior', async ({ page }) => {
  const oldSessionDate = '2026-01-05';
  await seedApp(page, {
    blockStart: '2026-01-05',
    sessions: [buildSession(oldSessionDate, 1, 1, 60)]
  });
  await page.goto('/#/settings');

  await page.getByRole('button', { name: 'Elegir de las plantillas' }).click();
  const card = page.locator('.card', { has: page.getByRole('heading', { name: LEG_FOCUS_NAME }) });
  await expect(card).toBeVisible();

  page.once('dialog', dialog => dialog.accept());
  await card.getByRole('button', { name: 'Usar esta plantilla' }).click();

  // La rutina anterior sigue listada (con su historial intacto) y ya no es
  // la activa; la nueva pasa a ser la activa.
  await expect(page.locator('.plan-row', { hasText: 'Plan de prueba' })).toContainText('1 días');
  await expect(page.locator('.plan-row', { hasText: LEG_FOCUS_NAME })).toContainText('Activa');

  await page.goto('/#/history');
  await page.getByRole('button', { name: /enero 2026/i }).click();
  await page.getByRole('button', { name: /semana 1 de 4/i }).click();
  await expect(page.getByText(oldSessionDate)).toBeVisible();

  await verifyLegFocusContent(page);
});

test('una plantilla ya copiada exactamente igual no se vuelve a ofrecer', async ({ page }) => {
  await page.addInitScript(([plansData, settingsData]) => {
    localStorage.setItem('gym.plans', JSON.stringify(plansData));
    localStorage.setItem('gym.settings', JSON.stringify(settingsData));
  }, [
    {
      schemaVersion: 1,
      plans: { 1: { version: 1, name: 'PPL + Upper/Lower', days: [{ id: DAY_ID, name: 'Dia', weekday: 1, warmup: [], exercises: [] }] } },
      activeVersion: 1,
      nextVersion: 2
    },
    buildSettings('2026-01-05')
  ]);
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Elegir de las plantillas' }).click();

  await expect(page.getByRole('heading', { name: 'PPL + Upper/Lower' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Fuerza 5 días — adaptado codo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: LEG_FOCUS_NAME })).toBeVisible();
});
