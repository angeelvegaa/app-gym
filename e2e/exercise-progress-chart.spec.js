import { test, expect } from '@playwright/test';
import { seedApp, buildSession, addDays, EXERCISE_ID } from './helpers.js';

const BLOCK_START = '2026-01-05'; // lunes

// 4 bloques de 4 semanas cada uno, con la semana 4 de cada bloque como
// deload (peso más bajo), simulando ~16 semanas de historial real.
function mondayFor(blockIndex, weekInBlock) {
  return addDays(BLOCK_START, blockIndex * 28 + (weekInBlock - 1) * 7);
}

function seedFourBlocksHistory() {
  const sessions = [];
  for (let blockIndex = 0; blockIndex < 4; blockIndex++) {
    const block = blockIndex + 1;
    for (let weekInBlock = 1; weekInBlock <= 4; weekInBlock++) {
      const date = mondayFor(blockIndex, weekInBlock);
      const isDeload = weekInBlock === 4;
      const weight = 40 + blockIndex * 10 + (weekInBlock - 1) * 2 - (isDeload ? 6 : 0);
      sessions.push(buildSession(date, block, weekInBlock, weight));
    }
  }
  return sessions;
}

async function gotoExerciseDetail(page) {
  await seedApp(page, { blockStart: BLOCK_START, sessions: seedFourBlocksHistory() });
  await page.goto(`/#/exercise/${EXERCISE_ID}`);
}

test('el gráfico extendido muestra los 4 bloques con sus deloads marcados', async ({ page }) => {
  await gotoExerciseDetail(page);

  await expect(page.getByRole('heading', { name: 'Progresión' })).toBeVisible();

  // Por defecto se ve todo el historial: las 16 sesiones, 3 líneas de
  // cambio de bloque (entre los 4 bloques) y 4 puntos de deload (uno por bloque).
  const chart = page.locator('svg.progress-chart');
  await expect(chart).toBeVisible();
  await expect(chart.locator('circle.progress-chart-point')).toHaveCount(16);
  await expect(chart.locator('line.progress-chart-block-line')).toHaveCount(3);
  await expect(chart.locator('circle.progress-chart-point--deload')).toHaveCount(4);
  await expect(chart.locator('text.progress-chart-block-label')).toHaveText(['B2', 'B3', 'B4']);
});

test('el selector de rango cambia lo que se ve en el gráfico', async ({ page }) => {
  await gotoExerciseDetail(page);

  const chart = page.locator('svg.progress-chart');
  const allChip = page.getByRole('button', { name: 'Todo el historial', exact: true });
  const blockChip = page.getByRole('button', { name: 'Este bloque', exact: true });
  const last3Chip = page.getByRole('button', { name: 'Últimos 3 bloques', exact: true });

  // Por defecto, "Todo el historial" está activo.
  await expect(allChip).toHaveClass(/chip--active/);

  // "Este bloque": solo el bloque 4 (el más reciente), sin líneas de cambio de bloque.
  await blockChip.click();
  await expect(blockChip).toHaveClass(/chip--active/);
  await expect(allChip).not.toHaveClass(/chip--active/);
  await expect(chart.locator('circle.progress-chart-point')).toHaveCount(4);
  await expect(chart.locator('line.progress-chart-block-line')).toHaveCount(0);
  await expect(chart.locator('circle.progress-chart-point--deload')).toHaveCount(1);

  // "Últimos 3 bloques": bloques 2, 3 y 4 -> 12 puntos, 2 cambios de bloque.
  await last3Chip.click();
  await expect(last3Chip).toHaveClass(/chip--active/);
  await expect(blockChip).not.toHaveClass(/chip--active/);
  await expect(chart.locator('circle.progress-chart-point')).toHaveCount(12);
  await expect(chart.locator('line.progress-chart-block-line')).toHaveCount(2);
  await expect(chart.locator('circle.progress-chart-point--deload')).toHaveCount(3);

  // Volver a "Todo el historial" recupera los 4 bloques completos.
  await allChip.click();
  await expect(chart.locator('circle.progress-chart-point')).toHaveCount(16);
  await expect(chart.locator('line.progress-chart-block-line')).toHaveCount(3);
});

test('un ejercicio con datos en un único bloque no muestra líneas de cambio de bloque', async ({ page }) => {
  await seedApp(page, {
    blockStart: BLOCK_START,
    sessions: [1, 2, 3, 4].map(week => buildSession(mondayFor(0, week), 1, week, 50 + week))
  });
  await page.goto(`/#/exercise/${EXERCISE_ID}`);

  const chart = page.locator('svg.progress-chart');
  await expect(chart.locator('circle.progress-chart-point')).toHaveCount(4);
  await expect(chart.locator('line.progress-chart-block-line')).toHaveCount(0);
  await expect(chart.locator('circle.progress-chart-point--deload')).toHaveCount(1);
});

// Reproduce aquí la misma fórmula de pesos de seedFourBlocksHistory() para
// no adivinar dónde caen el mínimo y el máximo del historial completo.
function fourBlocksWeights() {
  const weights = [];
  for (let blockIndex = 0; blockIndex < 4; blockIndex++) {
    for (let weekInBlock = 1; weekInBlock <= 4; weekInBlock++) {
      const isDeload = weekInBlock === 4;
      weights.push(40 + blockIndex * 10 + (weekInBlock - 1) * 2 - (isDeload ? 6 : 0));
    }
  }
  return weights;
}

test('el gráfico con muchos puntos rellena el área y solo etiqueta los hitos', async ({ page }) => {
  await gotoExerciseDetail(page);

  const chart = page.locator('svg.progress-chart');
  await expect(chart).toBeVisible();

  // Área rellena: un único path.progress-chart-area, pintado bajo la línea.
  await expect(chart.locator('path.progress-chart-area')).toHaveCount(1);

  // 16 puntos (> 10) => solo se etiquetan los hitos: primero, último, mínimo
  // y máximo, deduplicados por índice.
  const weights = fourBlocksWeights();
  const minI = weights.indexOf(Math.min(...weights));
  const maxI = weights.indexOf(Math.max(...weights));
  const expectedLabelCount = new Set([0, weights.length - 1, minI, maxI]).size;

  await expect(chart.locator('text.progress-chart-value-label')).toHaveCount(expectedLabelCount);

  await chart.screenshot({ path: 'test-results/progress-chart-many-points.png' });
});

test('el gráfico con pocos puntos etiqueta todos los valores', async ({ page }) => {
  await seedApp(page, {
    blockStart: BLOCK_START,
    sessions: [1, 2, 3, 4].map(week => buildSession(mondayFor(0, week), 1, week, 50 + week))
  });
  await page.goto(`/#/exercise/${EXERCISE_ID}`);

  const chart = page.locator('svg.progress-chart');
  await expect(chart).toBeVisible();
  await expect(chart.locator('text.progress-chart-value-label')).toHaveCount(4);

  await chart.screenshot({ path: 'test-results/progress-chart-few-points.png' });
});
