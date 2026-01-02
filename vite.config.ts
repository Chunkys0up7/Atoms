import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5174,
      host: '0.0.0.0',
      strictPort: false, // Allow fallback to other ports
      watch: {
        ignored: ['**/venv/**', '**/rag-index/**', '**/data/**', '**/docs/**', '**/tests/**', '**/test_data/**']
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY || env.GEMINI_API_KEY),
      'process.env.ANTHROPIC_API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-markdown', 'lucide-react'],
      force: false // Don't force rebuild every time
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'markdown-vendor': ['react-markdown', 'remark-gfm', 'react-syntax-highlighter']
          }
        }
      }
    }
  };
});
