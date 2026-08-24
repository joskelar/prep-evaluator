import { test, expect } from '@playwright/test';

test.describe('Prep Evaluator Student Journeys E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Clear local storage to start fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('E2E 1 — Practice Flow (Home -> Config -> Session -> Answer -> Finish -> Results -> Review)', async ({ page }) => {
    await page.goto('/');
    
    // Choose PrepaTec target (default) and click Practice card
    await page.click('text=Practicar Temas');
    await expect(page).toHaveURL(/.*\/practice.*/);

    // Select Habilidades Cognitivas area (default)
    // Select specific category: Analogías (contains "analogies")
    await page.selectOption('#category-select', 'analogies');

    // Choose 5 questions from select dropdown (standard option)
    await page.selectOption('#question-count-select', '5');

    // Iniciar Práctica
    await page.click('button:has-text("Iniciar Práctica")');
    await expect(page).toHaveURL(/.*\/session\/.*/);

    // Answer Q1: Click first option option-letter "A" or option container
    await page.click('.options-container > div:first-child');

    // Click Next
    await page.click('button:has-text("Siguiente →")');

    // Answer Q2: Click second option
    await page.click('.options-container > div:nth-child(2)');

    // Click Entregar Examen
    await page.click('button:has-text("Entregar Examen")');

    // Confirm entrega in modal
    await page.click('button:has-text("Sí, Finalizar Examen")');

    // Wait for Results redirection
    await expect(page).toHaveURL(/.*\/results\/.*/);
    await expect(page.locator('text=Resultado General')).toBeVisible();

    // Go to Review
    await page.click('button:has-text("Revisar Preguntas")');
    await expect(page).toHaveURL(/.*\/results\/.*\/review/);
    await expect(page.locator('.explanation-card')).toBeVisible();
  });

  test('E2E 2 — General Review Flow (Multi-Area stratified sampling)', async ({ page }) => {
    await page.goto('/');

    // Choose BUAP target
    await page.click('text=BUAP (Examen de Admisión)');
    
    // Iniciar Repaso card
    await page.click('text=Iniciar Repaso');
    await expect(page).toHaveURL(/.*\/review.*/);

    // BUAP target pre-selected by default.
    // Click area checkboxes to select Cognitive + Spanish
    const cognitiveCheckbox = page.locator('input[type="checkbox"]').first();
    const isChecked = await cognitiveCheckbox.isChecked();
    if (!isChecked) {
      await cognitiveCheckbox.click();
    }

    // Set questions count to 5 by choosing standard option from dropdown
    await page.selectOption('#question-count-select', '5');

    // Click Iniciar Repaso
    await page.click('button:has-text("Iniciar Repaso")');
    await expect(page).toHaveURL(/.*\/session\/.*/);

    // Finish session immediately (unanswered)
    await page.click('button:has-text("Entregar Examen")');
    await page.click('button:has-text("Sí, Finalizar Examen")');

    // Verify Results
    await expect(page).toHaveURL(/.*\/results\/.*/);
    await expect(page.locator('text=Rendimiento por Área')).toBeVisible();
  });

  test('E2E 3 — Simulator Flow (Timed session with timer visibility)', async ({ page }) => {
    await page.goto('/');

    // Click Iniciar Simulacro
    await page.click('text=Iniciar Simulacro');
    await expect(page).toHaveURL(/.*\/simulator.*/);

    // Iniciar Simulacro config page defaults to Prepatec 30 questions
    // Click Comenzar Simulador
    await page.click('button:has-text("Comenzar Simulador")');
    await expect(page).toHaveURL(/.*\/session\/.*/);

    // Timer display should be visible
    const timer = page.locator('.timer-val');
    await expect(timer).toBeVisible();

    // Deliver exam
    await page.click('button:has-text("Entregar Examen")');
    await page.click('button:has-text("Sí, Finalizar Examen")');

    // Results screen loaded
    await expect(page).toHaveURL(/.*\/results\/.*/);
  });

  test('E2E 4 — Persistence (Answer -> Reload -> Verify state)', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Practicar Temas');
    
    // Start Practice session with 5 questions
    await page.selectOption('#category-select', 'analogies');
    await page.selectOption('#question-count-select', '5');
    await page.click('button:has-text("Iniciar Práctica")');

    // Click first option "A"
    const firstOption = page.locator('.options-container > div:first-child');
    await firstOption.click();

    // Reload page
    await page.reload();

    // Wait for session to load
    await expect(page.locator('.question-prompt')).toBeVisible();

    // Verify option is still selected
    const reloadedFirstOption = page.locator('.options-container > div:first-child');
    await expect(reloadedFirstOption).toHaveClass(/.*selected.*/);
  });

  test('E2E 5 — Study Cards Flow (Flip -> Next -> Shuffle)', async ({ page }) => {
    await page.goto('/');

    // Go to Study Cards
    await page.click('text=Repasar Tarjetas');
    await expect(page).toHaveURL(/.*\/study.*/);

    // Click Comenzar Repaso
    await page.click('button:has-text("Comenzar Repaso")');

    // Check card title is visible on front card
    const frontText = page.locator('.study-card-front h3');
    await expect(frontText).toBeVisible();

    // Click card container to flip it
    await page.click('.study-card-flip-container');

    // Dorso tag / explanation should be visible
    const backText = page.locator('.study-card-back h3');
    await expect(backText).toBeVisible();

    // Click Next
    await page.click('button:has-text("Siguiente →")');
    await expect(page.locator('text=Ficha 2 de')).toBeVisible();

    // Click Shuffle
    await page.click('button:has-text("Mezclar Fichas")');
    await expect(page.locator('text=Ficha 1 de')).toBeVisible();
  });
});
