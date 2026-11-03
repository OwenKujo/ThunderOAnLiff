import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Resolve the workspace root from this config file, not from the current
// working directory. This is important when Vercel builds a filtered pnpm
// workspace package (apps/liff) from the monorepo root.
const monorepoRoot = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig(({ mode }) => {
  // Vite also loads these variables for import.meta.env. Loading explicitly
  // here lets us fail during deployment if the LIFF app ID is not available.
  const env = loadEnv(mode, monorepoRoot, 'VITE_');
  const liffId = (process.env.VITE_LIFF_ID || env.VITE_LIFF_ID || '').trim();

  if (mode === 'production' && !liffId) {
    throw new Error(
      '[LIFF deployment] VITE_LIFF_ID is missing. Add the LIFF app ID in Vercel > Project > Settings > Environment Variables, enable Production (and Preview if needed), then create a NEW deployment. Use the LIFF app ID from LINE Developers, not the LINE Login channel ID.',
    );
  }

  console.info(`[LIFF deployment] VITE_LIFF_ID: ${liffId ? 'configured' : 'missing (local/dev only)'}`);
  console.info(`[LIFF deployment] Vite env directory: ${monorepoRoot}`);

  return {
    envDir: monorepoRoot,
    plugins: [react()],
    server: {
      port: 5173,
    },
    preview: {
      port: 4173,
    },
  };
});
