import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir:'tests/browser', use:{baseURL:'http://127.0.0.1:3000',headless:true,launchOptions:{executablePath:process.env.CHROME_TEST_EXECUTABLE}},webServer:{command:'npx vite --host=127.0.0.1 --port=3000',url:'http://127.0.0.1:3000',reuseExistingServer:true},workers:1 });
