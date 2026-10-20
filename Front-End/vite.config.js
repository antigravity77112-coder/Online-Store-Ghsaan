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
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) {
            return 'vendor-react';
          }
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('swr')) return 'vendor-swr';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('xlsx')) return 'vendor-xlsx';
          return undefined;
        },
      },
    },
    // Increase warning limit since we're now intentionally chunking
    chunkSizeWarningLimit: 250,
  },
});
