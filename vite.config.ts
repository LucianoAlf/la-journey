import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { alphaTab } from '@coderline/alphatab-vite';
import path from 'path';
import {defineConfig, loadEnv, searchForWorkspaceRoot} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), alphaTab({ assetOutputDir: false })],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      fs: {
        // Worktree node_modules is a junction to the repo root. Vite follows the
        // real path and, with strict:true, blocks alphaTab.worker.mjs.
        strict: false,
        allow: [
          searchForWorkspaceRoot(process.cwd()),
          path.resolve(__dirname, '../..'),
          path.resolve(__dirname, '../../node_modules'),
        ],
      },
      allowedHosts: [
        'wizard-trickster-bacterium.ngrok-free.dev',
      ],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
