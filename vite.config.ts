import { defineConfig, loadEnv, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';
import { z } from 'zod';

// Helper untuk path absolut
const r = (p: string) => path.resolve(__dirname, p);

// Validasi environment variables (wajib untuk enterprise)
const envSchema = z.object({
  VITE_APP_NAME: z.string().default('Pulse Hiring Intelligence'),
  VITE_API_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  const parsedEnv = envSchema.safeParse(env);
  
  if (!parsedEnv.success && mode === 'production') {
    console.error('❌ Invalid environment variables:', parsedEnv.error.format());
    process.exit(1);
  }

  const isProd = mode === 'production';
  const isDev = mode === 'development';

  return {
    plugins: [
      // TanStack Router plugin (wajib di awal untuk code splitting)
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
        routeFileIgnorePrefix: '-',
        generatedRouteTree: './src/routeTree.gen.ts',
      }),

      // Tailwind CSS v4 (Rust engine, super cepat)
      tailwindcss(),

      // React 19 + fast refresh + React Compiler
      react({
        babel: {
          plugins: isProd ? [['babel-plugin-react-compiler', { target: '19' }]] : [],
        },
      }),

      // PWA enterprise-ready
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png', 'icons/*'],
        manifest: {
          name: env.VITE_APP_NAME || 'Pulse Hiring Intelligence',
          short_name: 'PulseHR',
          description: 'Universal SaaS Platform for Global Talent Acquisition',
          theme_color: '#0D0D0D',
          background_color: '#0D0D0D',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          categories: ['business', 'productivity', 'hr'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
          shortcuts: [
            { name: 'Fit Calculator', url: '/calculator' },
            { name: 'Scorecard', url: '/scorecard' },
            { name: 'Talent Pool', url: '/talent-pool' },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          sourcemap: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'google-fonts', expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } },
            },
            {
              urlPattern: /^https:\/\/api\./i,
              handler: 'NetworkFirst',
              options: { cacheName: 'api-cache', networkTimeoutSeconds: 5, expiration: { maxEntries: 100, maxAgeSeconds: 60 * 10 } },
            },
          ],
        },
        devOptions: { enabled: isDev },
      }),

      // Compression for production (gzip)
      isProd && viteCompression({ algorithm: 'gzip', threshold: 1024, deleteOriginalAssets: false }),

      // Bundle visualizer (hanya jika ada flag VISUALIZE=true)
      process.env.VISUALIZE === 'true' && visualizer({ open: true, gzipSize: true, brotliSize: true }) as PluginOption,

      // Legacy browser support (optional, tapi best practice untuk enterprise)
      isProd && legacy({ targets: ['defaults', 'not IE 11'], modernPolyfills: true }),

    ].filter(Boolean) as PluginOption[],

    resolve: {
      alias: {
        '@': r('./src'),
        '@core': r('./src/core'),
        '@app': r('./src/app'),
        '@modules': r('./src/modules'),
        '@features': r('./src/features'),
        '@components': r('./src/components'),
        '@ui': r('./src/components/ui'),
        '@hooks': r('./src/hooks'),
        '@lib': r('./src/lib'),
        '@utils': r('./src/utils'),
        '@store': r('./src/store'),
        '@services': r('./src/services'),
        '@api': r('./src/api'),
        '@config': r('./src/config'),
        '@types': r('./src/types'),
        '@i18n': r('./src/i18n'),
        '@routes': r('./src/routes'),
        '@workers': r('./src/workers'),
      },
    },

    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version),
    },

    server: {
      port: 5173,
      host: true,
      open: true,
      strictPort: true,
      cors: true,
      warmup: {
        clientFiles: ['./src/main.tsx', './src/App.tsx'],
      },
    },

    preview: {
      port: 5173,
      host: true,
      strictPort: true,
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },

    build: {
      target: 'esnext',
      sourcemap: isProd ? 'hidden' : true,
      minify: 'esbuild',
      cssMinify: 'esbuild',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-core': ['react', 'react-dom'],
            'router': ['@tanstack/react-router'],
            'query': ['@tanstack/react-query', '@tanstack/react-table'],
            'state': ['zustand', '@reduxjs/toolkit', 'react-redux'],
            'motion': ['framer-motion'],
            'ui': ['clsx', 'tailwind-merge', 'class-variance-authority', 'lucide-react'],
            'forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
            'schema': ['@rjsf/core', '@rjsf/validator-ajv8'],
            'charts': ['recharts'],
            'i18n': ['react-i18next', 'i18next', 'i18next-browser-languagedetector'],
            'toast': ['sonner'],
            'utils': ['date-fns', 'fuse.js', 'use-debounce', 'react-use'],
          },
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'chunks/[name]-[hash].js',
          entryFileNames: 'entries/[name]-[hash].js',
        },
      },
      reportCompressedSize: true,
      commonjsOptions: { include: [/node_modules/] },
    },

    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'zustand',
        '@tanstack/react-query',
        '@tanstack/react-router',
        'clsx',
        'tailwind-merge',
      ],
      exclude: ['@tailwindcss/vite'],
      esbuildOptions: { target: 'esnext' },
    },

    css: {
      devSourcemap: true,
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },

    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
      supported: { 'top-level-await': true },
    },

    worker: {
      format: 'es',
      plugins: () => [react()],
    },
  };
});
