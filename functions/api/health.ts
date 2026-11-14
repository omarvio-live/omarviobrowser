/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Cloudflare Pages Edge Health & Diagnostics (/api/health)
 */

interface Env {
  KV_BINDING?: any;
  OMARVIO_KV?: any;
  KV?: any;
  APP_NAME?: string;
  APP_VERSION?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Cloudflare Edge Colocation & Country
  const cf = (request as any).cf || {};

  return new Response(
    JSON.stringify({
      status: 'ok',
      engine: 'OMARVIO Cloudflare Edge SuperFast 2.0',
      version: env.APP_VERSION || 'v2.0.0',
      edgeColo: cf.colo || 'EDGE',
      country: cf.country || 'GLOBAL',
      bindings: {
        KV_BINDING: !!env.KV_BINDING,
        OMARVIO_KV: !!env.OMARVIO_KV,
        KV: !!env.KV,
      },
      timestamp: Date.now(),
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
