import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Development server configuration
  server: {
    port: 3000,
    host: true, // Allow external connections
    open: true, // Open browser on start
    hmr: {
      overlay: true // Show errors in overlay
    }
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',
    
    // Optimize bundle
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          store: ['zustand'],
          ai: ['./src/ai/aiEngine.js', './src/ai/aiStrategies.js', './src/ai/aiMemory.js'],
          utils: ['./src/utils/deckUtils.js', './src/utils/pokerLogic.js', './src/utils/gameEngine.js']
        }
      }
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@store': resolve(__dirname, 'src/store'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@constants': resolve(__dirname, 'src/constants'),
      '@ai': resolve(__dirname, 'src/ai')
    }
  },
  
  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  
  // CSS configuration
  css: {
    postcss: './postcss.config.js',
    devSourcemap: true
  },
  
  // Optimization
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand'],
    exclude: []
  },
  
  // Preview server (for production builds)
  preview: {
    port: 4173,
    host: true,
    open: true
  },
  
  // Test configuration (for Vitest)
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: true
  }
})