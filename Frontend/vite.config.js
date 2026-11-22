import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // `vite --mode demo` builds the static demo: `convex/react` is swapped for an in-browser engine (src/demo).
  const isDemo = mode === 'demo'

  return {
    plugins: [react()],
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', ...(isDemo ? [] : ['convex/react'])],
      force: true,
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        'react': 'react',
        'react-dom': 'react-dom',
        ...(isDemo && { 'convex/react': fileURLToPath(new URL('./src/demo/convexMock.js', import.meta.url)) }),
      },
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/],
      },
    },
  }
})
