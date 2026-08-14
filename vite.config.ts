/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  /**
   * Declared here rather than in a `vitest.config.ts` so the `@` alias above is
   * the only definition. Nothing under test touches the DOM — the canonical
   * schema, the registry and the store are all deliberately free of React Flow
   * and React — so `node` is the environment, not jsdom.
   */
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
