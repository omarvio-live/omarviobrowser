/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Cloudflare Pages Edge Native Android APK Download & Open-Source Release Hub (/api/download-apk)
 * Preserves KV_BINDING / OMARVIO_KV / KV bindings on Cloudflare Free Tier.
 */

interface Env {
  KV_BINDING?: any;
  OMARVIO_KV?: any;
  KV?: any;
  OMARVIO_APK_URL?: string;
  OMARVIO_GITHUB_REPO?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const kv = env.KV_BINDING || env.OMARVIO_KV || env.KV;
  const urlObj = new URL(request.url);

  let kvRepo = '';
  if (kv) {
    try {
      const saved = await kv.get('omarvio_github_repo');
      if (saved) kvRepo = saved;
    } catch {}
  }

  // Optional query param ?setRepo=username/repo saves to Cloudflare KV if bound
  const setRepoParam = (urlObj.searchParams.get('setRepo') || '').trim();
  if (setRepoParam && setRepoParam.includes('/') && kv) {
    const cleanSet = setRepoParam.replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '');
    try {
      await kv.put('omarvio_github_repo', cleanSet);
      kvRepo = cleanSet;
    } catch {}
  }

  const envApkUrl = (env.OMARVIO_APK_URL || '').trim();
  const envRepo = (env.OMARVIO_GITHUB_REPO || kvRepo || '')
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\/+$/, '');
  const directUrl =
    envApkUrl || (envRepo ? `https://github.com/${envRepo}/releases/latest/download/omarvio-browser.apk` : '');

  if (directUrl && urlObj.searchParams.get('hub') !== '1') {
    return Response.redirect(directUrl, 302);
  }

  const html = `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>OMARVIO Android Native APK & Open-Source Release Hub</title>
      <style>
        body { background: #070a14; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
        .card { max-width: 500px; width: 100%; background: #0d1326; border: 1px solid rgba(6,182,212,0.4); border-radius: 24px; padding: 28px 22px; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
        .logo { font-size: 38px; margin-bottom: 10px; }
        h1 { margin: 0 0 8px; font-size: 20px; font-weight: 800; color: #38bdf8; }
        p { font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0 0 18px; }
        .badge { display: inline-block; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); color: #34d399; font-size: 11px; padding: 4px 12px; border-radius: 12px; font-weight: 700; margin-bottom: 18px; }
        .input-wrap { text-align: left; background: #070b18; border: 1px solid rgba(56,189,248,0.25); border-radius: 16px; padding: 14px; margin-bottom: 16px; }
        .input-wrap label { display: block; font-size: 11px; font-weight: 700; color: #38bdf8; margin-bottom: 6px; }
        .input-row { display: flex; gap: 8px; }
        input { flex: 1; background: #0f172a; border: 1px solid #334155; color: #fff; padding: 10px 12px; border-radius: 10px; font-size: 13px; outline: none; }
        input:focus { border-color: #22d3ee; }
        .btn { display: block; width: 100%; box-sizing: border-box; background: linear-gradient(135deg, #10b981, #06b6d4); color: #020617; font-weight: 800; font-size: 14px; padding: 13px; border-radius: 14px; text-decoration: none; margin-bottom: 10px; border: none; cursor: pointer; }
        .btn-sm { width: auto; padding: 10px 14px; margin: 0; font-size: 12px; }
        .btn-sec { background: #1e293b; color: #38bdf8; border: 1px solid #334155; }
        .guide { text-align: left; background: #080d1e; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px; font-size: 12px; color: #cbd5e1; margin-top: 16px; line-height: 1.6; }
        .guide strong { color: #38bdf8; }
        .guide ol { margin: 8px 0 0; padding-left: 18px; }
        .guide li { margin-bottom: 6px; }
        .mono { background: #020617; padding: 6px 10px; border-radius: 8px; font-family: monospace; font-size: 11px; color: #34d399; word-break: break-all; margin-top: 8px; display: block; }
        .back-link { display: inline-block; margin-top: 16px; font-size: 12px; color: #64748b; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">
          <img src="/assets/aistudio/file_0000000038508211a96b8fbe27d5ca68_9009abdf.png" alt="OMARVIO BROWSER" style="width:76px;height:76px;border-radius:16px;object-fit:contain;background:#000;display:block;margin:0 auto 12px;" />
        </div>
        <h1>OMARVIO BROWSER নেটিভ অ্যান্ড্রয়েড APK</h1>
        <div class="badge">Chromium WebView · Android 8–17 · ১০০% সব সাইট ওপেন</div>
        <p>আপনার ওপেন-সোর্স GitHub রিপোতে কোড পুশ করলেই অটোমেটিক আসল <strong>omarvio-browser.apk</strong> তৈরি হয়ে রিলিজ হবে।</p>

        <div class="input-wrap">
          <label for="ghRepo">আপনার GitHub রিপো (username/repo) বসান:</label>
          <div class="input-row">
            <input id="ghRepo" type="text" placeholder="যেমন: omarvio/omarvio-browser" />
            <button class="btn btn-sm" onclick="saveRepo()">সেভ</button>
          </div>
          <span id="directLinkBox" class="mono" style="display:none;"></span>
        </div>

        <a id="apkBtn" class="btn" href="#" style="display:none;" target="_blank" rel="noopener">⬇️ সরাসরি অ্যান্ড্রয়েড APK ডাউনলোড করুন</a>
        <a class="btn btn-sec" href="/">🌐 ওয়েব PWA সংস্করণে ফিরে যান</a>

        <div class="guide">
          <strong>💡 ওপেন-সোর্স থেকে সরাসরি ফোন-ইনস্টলযোগ্য APK পাওয়ার ৩টি ধাপ:</strong>
          <ol>
            <li>এই প্রোজেক্টটি আপনার পাবলিক GitHub রিপোতে Push করুন।</li>
            <li>GitHub-এর <strong>Actions</strong> ট্যাব স্বয়ংক্রিয়ভাবে Android SDK 35 দিয়ে APK বিল্ড করে <strong>Releases</strong>-এ আপলোড করবে।</li>
            <li>ওপরে আপনার <code>username/repo</code> বসালেই সরাসরি ফোন-ইনস্টল লিংক তৈরি হয়ে যাবে — কোনো লগইন ছাড়াই যে কেউ নামাতে পারবে।</li>
          </ol>
        </div>
        <a class="back-link" href="/">← ওমারভিও ব্রাউজার হোমে ফিরে যান</a>
      </div>

      <script>
        const input = document.getElementById('ghRepo');
        const linkBox = document.getElementById('directLinkBox');
        const apkBtn = document.getElementById('apkBtn');
        const saved = localStorage.getItem('omarvio_github_repo') || '${envRepo}';

        function updateUI(val) {
          const clean = (val || '').trim().replace(/^https?:\\/\\/github\\.com\\//i, '').replace(/\\/+$/, '');
          if (clean && clean.includes('/')) {
            const directUrl = 'https://github.com/' + clean + '/releases/latest/download/omarvio-browser.apk';
            linkBox.textContent = directUrl;
            linkBox.style.display = 'block';
            apkBtn.href = directUrl;
            apkBtn.style.display = 'block';
          } else {
            linkBox.style.display = 'none';
            apkBtn.style.display = 'none';
          }
        }

        if (saved) {
          input.value = saved;
          updateUI(saved);
        }

        function saveRepo() {
          const val = input.value.trim().replace(/^https?:\\/\\/github\\.com\\//i, '').replace(/\\/+$/, '');
          localStorage.setItem('omarvio_github_repo', val);
          updateUI(val);
        }
      </script>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
};
