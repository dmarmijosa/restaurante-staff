#!/usr/bin/env node
/**
 * Genera PDF desde la presentación HTML usando Playwright.
 * Uso: node presentacion/generate-pdf.mjs
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'restaurante-staff-presentacion.html');
const pdfPath = path.join(__dirname, 'restaurante-staff-presentacion.pdf');
const fileUrl = `file://${htmlPath}`;

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto(fileUrl, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await page.pdf({
  path: pdfPath,
  width: '1280px',
  height: '720px',
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  preferCSSPageSize: true,
});

await browser.close();
console.log(`PDF generado: ${pdfPath}`);
