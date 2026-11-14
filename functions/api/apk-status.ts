/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Cloudflare Pages Edge APK Status Endpoint (/api/apk-status)
 */

interface Env {
  KV_BINDING?: any;
  OMARVIO_KV?: any;
  KV?: any;
  OMARVIO_APK_URL?: string;
  OMARVIO_GITHUB_REPO?: string;
  ASSETS?: { fetch: (input: RequestInfo | URL) => Promise<Response> };
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const kv = env.KV_BINDING || env.OMARVIO_KV || env.KV;

  let kvRepo = '';
  if (kv) {
    try {
      const saved = await kv.get('omarvio_github_repo');
      if (saved) kvRepo = saved;
    } catch {}
  }

  let manifestRepo = '';
  let manifestApkUrl = '';
  let manifestVersion = '';
  let manifestVersionCode = 4;
  let manifestSha256 = '71ab9e0fe1b43e3c20bcf92d1bd6e4c95dce6969584d2dbdf4c04433866fd766';
  if (env.ASSETS) {
    try {
      const assetRes = await env.ASSETS.fetch(new URL('/apk-release.json', request.url));
      if (assetRes.ok) {
        const manifest = (await assetRes.json()) as {
          repo?: string;
          apkUrl?: string;
          version?: string;
          versionCode?: number;
          sha256?: string;
        };
        manifestRepo = (manifest.repo || '').trim();
        manifestApkUrl = (manifest.apkUrl || '').trim();
        manifestVersion = (manifest.version || '').trim();
        if (typeof manifest.versionCode === 'number') {
          manifestVersionCode = manifest.versionCode;
        }
        if (manifest.sha256) {
          manifestSha256 = manifest.sha256.trim();
        }
      }
    } catch {}
  }

  const DEFAULT_PUBLIC_REPO = 'omarvio-live/omarviobrowser';
  const envApkUrl = (env.OMARVIO_APK_URL || manifestApkUrl || '').trim();
  const envRepo = (env.OMARVIO_GITHUB_REPO || kvRepo || manifestRepo || DEFAULT_PUBLIC_REPO)
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');
  const githubReleaseUrl =
    envApkUrl || `https://github.com/${envRepo}/releases/latest/download/omarvio-browser.apk`;

  return new Response(
    JSON.stringify({
      hasLocalBinary: false,
      directApkUrl: githubReleaseUrl,
      githubRepo: envRepo,
      workflowFile: '.github/workflows/build-apk.yml',
      packageName: 'com.omarvio.browser',
      version: manifestVersion || '2.0.0.4',
      versionCode: manifestVersionCode,
      sha256: manifestSha256,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    }
  );
};
