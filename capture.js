import { chromium } from '@playwright/test';
import fs from 'fs';

const captureScreenshots = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    colorScheme: 'dark' // To make it look sleek
  });
  const page = await context.newPage();

  if (!fs.existsSync('public/screenshots')) {
    fs.mkdirSync('public/screenshots', { recursive: true });
  }

  const BASE_URL = 'https://auth-final-gamma.vercel.app';

  // 1. Login Page
  await page.goto(BASE_URL);
  await page.waitForTimeout(2000); // Wait for Turnstile / animations
  await page.screenshot({ path: 'public/screenshots/login.png' });

  // 2. Signup Page
  await page.goto(`${BASE_URL}/signup`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'public/screenshots/signup.png' });

  // 3. Forgot Password Page
  await page.goto(`${BASE_URL}/forgot-password`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'public/screenshots/forgot-password.png' });

  await browser.close();
  console.log("Screenshots captured successfully!");
};

captureScreenshots().catch(console.error);
