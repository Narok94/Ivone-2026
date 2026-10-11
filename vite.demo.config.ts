import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { renameSync, writeFileSync } from 'node:fs';

export default defineConfig({
  publicDir: false,
  plugins: [react(), tailwindcss(), {
    name: 'standalone-demo',
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type !== 'chunk') continue;
        for (const id of Object.keys(item.modules)) {
          const path = id.replaceAll('\\', '/');
          if (/\/(api|server)\/|\/src\/(contexto|lib)\/|\/src\/App\.tsx/.test(path)) {
            throw new Error('Public demo cannot include application data or server modules');
          }
        }
      }
    },
    closeBundle() {
      renameSync('dist-demo/demo.html', 'dist-demo/index.html');
      writeFileSync('dist-demo/vercel.json', JSON.stringify({
        version: 2,
        routes: [
          { src: '/.*', headers: { 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }, continue: true },
          { src: '/api(?:/.*)?', status: 404 },
          { handle: 'filesystem' },
          { src: '/demo/?', dest: '/index.html' },
          { src: '/.*', status: 404 },
        ],
      }, null, 2));
    },
  }],
  build: { outDir: 'dist-demo', emptyOutDir: true, rollupOptions: { input: 'demo.html' } },
});
