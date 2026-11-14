import { execSync } from 'child_process';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function detectGitHubRepo(): string {
  const fromEnv = (process.env.OMARVIO_GITHUB_REPO || process.env.GITHUB_REPOSITORY || '').trim();
  if (fromEnv && fromEnv.includes('/')) {
    return fromEnv.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '');
  }
  try {
    const remote = execSync('git config --get remote.origin.url', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    const match = remote.match(/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/i);
    if (match && match[1]) return match[1];
  } catch {}
  return '';
}

function omarvioApkManifestPlugin() {
  return {
    name: 'omarvio-apk-manifest',
    closeBundle() {
      try {
        const distFile = path.resolve(import.meta.dirname, 'dist', 'apk-release.json');
        let existing: Record<string, string> = {};
        if (fs.existsSync(distFile)) {
          try {
            existing = JSON.parse(fs.readFileSync(distFile, 'utf8'));
          } catch {}
        }
        const detectedRepo = detectGitHubRepo() || (existing.repo || '').trim();
        const apkUrl =
          (process.env.OMARVIO_APK_URL || '').trim() ||
          (existing.apkUrl || '').trim() ||
          (detectedRepo ? `https://github.com/${detectedRepo}/releases/latest/download/omarvio-browser.apk` : '');

        if (detectedRepo || apkUrl) {
          fs.writeFileSync(
            distFile,
            JSON.stringify(
              {
                repo: detectedRepo,
                apkUrl,
                version: existing.version || '2.0.0',
                host: 'github-releases',
                updatedAt: new Date().toISOString(),
              },
              null,
              2
            ) + '\n'
          );
        }
      } catch {}
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), omarvioApkManifestPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      hmr: {
        clientPort: 443,
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/scheduler')
            ) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('src/engine/')) {
              return 'app-core';
            }
          },
        },
      },
    },
  };
});
