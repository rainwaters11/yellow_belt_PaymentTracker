// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import path from 'path';
import { fileURLToPath } from 'url';

import vercel from '@astrojs/vercel';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const swkBase = path.resolve(__dirname, 'node_modules/@creit.tech/stellar-wallets-kit/esm/sdk/modules');

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  vite: {
    resolve: {
      alias: {
        'swk/freighter': path.join(swkBase, 'freighter.module.js'),
        'swk/xbull': path.join(swkBase, 'xbull.module.js'),
        'swk/albedo': path.join(swkBase, 'albedo.module.js'),
      },
    },
    optimizeDeps: {
      // Pre-bundle both packages so CJS → ESM conversion works in dev
      include: [
        '@stellar/freighter-api',
        '@creit.tech/stellar-wallets-kit',
      ],
    },
    ssr: {
      noExternal: ['@creit.tech/stellar-wallets-kit'],
      external: ['@stellar/freighter-api'],
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  },

  output: 'server',
  adapter: vercel(),
});