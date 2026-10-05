import { defineConfig } from 'tsdown'

// ESM for the Vite frontend, CJS for the NestJS backend
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
})
