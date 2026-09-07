import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        // Local backend target for development only.
        // Override with VITE_DEV_API_TARGET if your backend uses another port.
        target: process.env.VITE_DEV_API_TARGET || 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // Disable source maps in production for smaller deploy
    sourcemap: false,
    // Target modern browsers for smaller output
    target: 'es2020',
    // EN: Split CSS per chunk — when a JS chunk changes, only that page's CSS
    //     is invalidated in the browser cache (not the entire stylesheet).
    cssCodeSplit: true,
    // EN: Inline assets smaller than 4KB as base64 data URIs (avoids extra HTTP requests).
    //     Larger assets get their own hashed file (long-term cacheable).
    assetsInlineLimit: 4096,
    // Split the monolithic bundle into logical chunks
    rollupOptions: {
      output: {
        // EN: Give hashed filenames to all chunks and assets.
        //     [hash] changes whenever the content changes, allowing
        //     immutable 1-year cache headers on every file.
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        manualChunks: {
          // Core React runtime — cached long-term, rarely changes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Animation library — heavy (~95KB), loaded async by routes that need it
          'vendor-motion': ['framer-motion'],
          // Data fetching — lightweight but separate for caching
          'vendor-swr': ['swr'],
          // Icon library — tree-shaken but still shared across pages
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    // Increase warning limit since we're now intentionally chunking
    chunkSizeWarningLimit: 250,
  },
});
