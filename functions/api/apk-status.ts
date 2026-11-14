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
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const kv = env.KV_BINDING || env.OMARVIO_KV || env.KV;

  let kvRepo = '';
  if (kv) {
    try {
      const saved = await kv.get('omarvio_github_repo');
      if (saved) kvRepo = saved;
    } catch {}
  }

  const envApkUrl = (env.OMARVIO_APK_URL || '').trim();
  const envRepo = (env.OMARVIO_GITHUB_REPO || kvRepo || '')
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\/+$/, '');
  const githubReleaseUrl =
    envApkUrl || (envRepo ? `https://github.com/${envRepo}/releases/latest/download/omarvio-browser.apk` : '');

  return new Response(
    JSON.stringify({
      hasLocalBinary: false,
      directApkUrl: githubReleaseUrl || null,
      githubRepo: envRepo || null,
      workflowFile: '.github/workflows/build-apk.yml',
      packageName: 'com.omarvio.browser',
      version: '2.0.0',
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
