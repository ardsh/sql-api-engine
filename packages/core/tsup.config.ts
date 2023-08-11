import { defineConfig } from 'tsup'

export default defineConfig([
  // Universal APIs
  {
    entry: ['utils/index.ts'],
    format: ['cjs', 'esm'],
    external: ['react'],
    dts: true
  },
  {
    entry: ['engine/index.ts'],
    format: ['cjs', 'esm'],
    external: ['react'],
    outDir: 'engine/dist',
    dts: true
  },
  // React APIs
  {
    entry: ['react/index.ts'],
    outDir: 'react/dist',
    banner: {
      js: "'use client'"
    },
    format: ['cjs', 'esm'],
    external: ['react'],
    dts: true
  },
  {
    entry: ['react/index.server.ts'],
    outDir: 'react/dist',
    format: ['cjs', 'esm'],
    external: ['react'],
    dts: true
  },
])
