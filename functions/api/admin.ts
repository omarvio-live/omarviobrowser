/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Cloudflare Pages Edge Admin API (/api/admin)
 * Syncs advertisements, app customization, and urgent broadcasts to Cloudflare KV & D1.
 */

interface Env {
  KV_BINDING?: any;
  OMARVIO_KV?: any;
  KV?: any;
  OMARVIO_DB?: any;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const kv = env.KV_BINDING || env.OMARVIO_KV || env.KV;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const urlObj = new URL(request.url);
  const action = urlObj.searchParams.get('action') || 'get_all';

  if (request.method === 'GET') {
    if (kv) {
      try {
        const ads = (await kv.get('omarvio_ads', 'json')) || null;
        const customization = (await kv.get('omarvio_customization', 'json')) || null;
        return new Response(JSON.stringify({ success: true, ads, customization, storage: 'cloudflare_kv' }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
      }
    }

    return new Response(JSON.stringify({ success: true, storage: 'in_memory_or_local' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (request.method === 'POST') {
    try {
      const payload = (await request.json()) as any;
      if (kv) {
        if (payload.ads) {
          await kv.put('omarvio_ads', JSON.stringify(payload.ads));
        }
        if (payload.customization) {
          await kv.put('omarvio_customization', JSON.stringify(payload.customization));
        }
        return new Response(JSON.stringify({ success: true, synced: 'cloudflare_kv' }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      return new Response(JSON.stringify({ success: true, synced: 'local' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 400 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
};
