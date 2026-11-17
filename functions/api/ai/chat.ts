/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OMARVIO BROWSER - Cloudflare Pages Edge Gemini AI Function (/api/ai/chat)
 */

interface Env {
  GEMINI_API_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const apiKey = (context.env?.GEMINI_API_KEY || '').trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return new Response(
        JSON.stringify({
          error:
            'GEMINI_API_KEY কনফিগার করা নেই। Cloudflare Pages Environment Variables-এ GEMINI_API_KEY যোগ করুন।',
        }),
        { status: 503, headers: corsHeaders }
      );
    }

    const body = (await context.request.json().catch(() => ({}))) as any;
    const rawPrompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!rawPrompt) {
      return new Response(
        JSON.stringify({ error: 'অনুগ্রহ করে একটি প্রশ্ন বা প্রম্পট লিখুন।' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const requestedModel = typeof body.model === 'string' ? body.model.trim() : 'gemini-4-hydrogen';
    const reasoningLevel =
      typeof body.reasoningLevel === 'string' ? body.reasoningLevel.toUpperCase() : 'MEDIUM';
    const autoTranslateBn = body.autoTranslateBn !== false;
    const pageContext =
      typeof body.pageContext === 'string' ? body.pageContext.slice(0, 12000) : '';
    const pageUrl = typeof body.pageUrl === 'string' ? body.pageUrl : '';

    let resolvedModel = 'gemini-4-hydrogen';
    let thinkingLevel =
      reasoningLevel === 'HIGH' ? 'HIGH' : reasoningLevel === 'LOW' ? 'LOW' : 'MEDIUM';
    let styleInstruction =
      'You are the built-in AI assistant inside OMARVIO BROWSER. Give clear, concise, accurate answers.';

    if (requestedModel === 'gemini-3.1-flash-lite' || requestedModel === 'llama-3.3-70b') {
      resolvedModel = 'gemini-3.1-flash-lite';
      styleInstruction =
        'You are OMARVIO Ultra-Fast Lite AI. Answer concisely in crisp bullet points.';
    } else if (
      requestedModel === 'gemini-4-hydrogen-deep' ||
      requestedModel === 'gemini-2.5-pro' ||
      requestedModel === 'deepseek-r1'
    ) {
      resolvedModel = 'gemini-4-hydrogen';
      thinkingLevel = 'HIGH';
      styleInstruction =
        'You are OMARVIO Deep Reasoning AI. Think step-by-step and provide thorough, verified analysis.';
    } else if (
      requestedModel === 'gemini-4-bangla' ||
      requestedModel === 'claude-3.7-sonnet' ||
      requestedModel === 'chatgpt-gpt-4o'
    ) {
      resolvedModel = 'gemini-4-hydrogen';
      styleInstruction =
        'You are OMARVIO Bangla & Writing Specialist AI. Craft natural, polished, eloquent explanations.';
    }

    if (autoTranslateBn) {
      styleInstruction +=
        ' Respond primarily in clear, natural Bengali (বাংলা) unless the user explicitly asks for another language.';
    }

    const combinedPrompt = pageContext
      ? `Webpage URL: ${pageUrl || 'Active Tab'}\nWebpage Content:\n${pageContext}\n\nUser Request: ${rawPrompt}`
      : rawPrompt;

    const generationConfig: Record<string, any> = {};
    if (resolvedModel === 'gemini-4-hydrogen') {
      generationConfig.thinkingConfig = { thinkingLevel };
    }

    let actualModelUsed = resolvedModel;
    let endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
    let upstream: Response | null = null;
    try {
      const controller = new AbortController();
      const timeoutId =
        resolvedModel === 'gemini-4-hydrogen'
          ? setTimeout(() => controller.abort(), 9000)
          : null;
      upstream = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'aistudio-build',
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: styleInstruction }] },
          contents: [{ role: 'user', parts: [{ text: combinedPrompt }] }],
          generationConfig,
        }),
      });
      if (timeoutId) clearTimeout(timeoutId);
    } catch {
      upstream = null;
    }

    if (
      resolvedModel === 'gemini-4-hydrogen' &&
      (!upstream || upstream.status === 503 || upstream.status === 429)
    ) {
      actualModelUsed = 'gemini-3.1-flash-lite';
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`;
      upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'aistudio-build',
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: styleInstruction }] },
          contents: [{ role: 'user', parts: [{ text: combinedPrompt }] }],
        }),
      });
    }

    if (!upstream) {
      return new Response(
        JSON.stringify({ error: 'AI সার্ভারে সংযোগ করতে সময় বেশি লাগছে। আবার চেষ্টা করুন।' }),
        { status: 504, headers: corsHeaders }
      );
    }

    const data = (await upstream.json().catch(() => ({}))) as any;
    if (!upstream.ok) {
      return new Response(
        JSON.stringify({
          error: data?.error?.message || `Gemini API error (${upstream.status})`,
        }),
        { status: upstream.status, headers: corsHeaders }
      );
    }

    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((p: any) => p?.text || '')
      .join('')
      .trim();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'AI মডেল থেকে কোনো উত্তর পাওয়া যায়নি।' }),
        { status: 502, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ text, modelUsed: actualModelUsed, preset: requestedModel }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'AI প্রসেসিংয়ে ত্রুটি ঘটেছে।' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
