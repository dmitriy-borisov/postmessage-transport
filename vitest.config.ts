import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 2000,
    browser: {
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      enabled: true,
      headless: true,
    },
  },
});
