// 연수 슬라이드용 앱 화면 캡처. 실행(D:/projects/3in1 에서): npx playwright test --config "D:/projects/slides/생기부AI작업실_slide/capture/playwright.capture.config.mjs"
// 앱 e2e 와 같은 서버(tests/e2e/server.mjs)와 가짜 AI 응답을 쓴다. 실제 AI 호출·실제 키 없음.
import { defineConfig, devices } from '@playwright/test';

const port = 52741;
export default defineConfig({
  testDir: '.',
  testMatch: 'capture.spec.mjs',
  timeout: 120_000,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}`, channel: 'chrome', serviceWorkers: 'block', ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  webServer: { command: 'node tests/e2e/server.mjs', cwd: 'D:/projects/3in1', env: { E2E_PORT: String(port) }, url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 15_000 },
});
