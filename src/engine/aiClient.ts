/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OMARVIO BROWSER - Client-Side AI Gateway Helper
 * Communicates strictly with server-side /api/ai/chat (zero client API key exposure).
 */

export type ActiveAiModelId =
  | 'gemini-4-hydrogen'
  | 'gemini-4-hydrogen-deep'
  | 'gemini-3.1-flash-lite'
  | 'gemini-4-bangla';

export type AiReasoningLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AiChatRequest {
  prompt: string;
  model?: string;
  reasoningLevel?: AiReasoningLevel;
  autoTranslateBn?: boolean;
  sanitizePrompt?: boolean;
  pageUrl?: string;
  pageContext?: string;
  signal?: AbortSignal;
}

export interface AiChatResponse {
  text: string;
  modelUsed: string;
  preset: string;
}

export function normalizeActiveAiModelId(raw?: string | null): ActiveAiModelId {
  const v = (raw || '').trim();
  if (v === 'gemini-4-hydrogen-deep' || v === 'gemini-2.5-pro' || v === 'deepseek-r1') {
    return 'gemini-4-hydrogen-deep';
  }
  if (v === 'gemini-3.1-flash-lite' || v === 'llama-3.3-70b') {
    return 'gemini-3.1-flash-lite';
  }
  if (v === 'gemini-4-bangla' || v === 'claude-3.7-sonnet' || v === 'chatgpt-gpt-4o') {
    return 'gemini-4-bangla';
  }
  return 'gemini-4-hydrogen';
}

export function getSavedAiSettings(): {
  model: ActiveAiModelId;
  reasoningLevel: AiReasoningLevel;
  autoTranslateBn: boolean;
  sanitizePrompt: boolean;
  searchSummary: boolean;
} {
  try {
    const model = normalizeActiveAiModelId(localStorage.getItem('omarvio_ai_model'));
    const rawLevel = (localStorage.getItem('omarvio_ai_reasoning_level') || 'MEDIUM').toUpperCase();
    const reasoningLevel: AiReasoningLevel =
      rawLevel === 'HIGH' ? 'HIGH' : rawLevel === 'LOW' ? 'LOW' : 'MEDIUM';
    const autoTranslateBn = localStorage.getItem('omarvio_ai_auto_translate_bn') !== 'false';
    const sanitizePrompt = localStorage.getItem('omarvio_ai_prompt_sanitizer') !== 'false';
    const searchSummary = localStorage.getItem('omarvio_ai_search_summary') !== 'false';
    return { model, reasoningLevel, autoTranslateBn, sanitizePrompt, searchSummary };
  } catch {
    return {
      model: 'gemini-4-hydrogen',
      reasoningLevel: 'MEDIUM',
      autoTranslateBn: true,
      sanitizePrompt: true,
      searchSummary: true,
    };
  }
}

export function sanitizeUserPrompt(raw: string): string {
  return raw
    // Strip IPv4 addresses
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[redacted-ip]')
    // Strip personal email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/gi, '[redacted-email]')
    // Strip tracking params in embedded URLs
    .replace(/([?&])(fbclid|gclid|utm_[a-z]+|igshid|si)=[^&\s]*/gi, '');
}

export async function runOmarvioAiChat(req: AiChatRequest): Promise<AiChatResponse> {
  const settings = getSavedAiSettings();
  const useSanitizer = req.sanitizePrompt ?? settings.sanitizePrompt;
  const cleanedPrompt = useSanitizer ? sanitizeUserPrompt(req.prompt) : req.prompt;
  const model = normalizeActiveAiModelId(req.model || settings.model);

  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    signal: req.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: cleanedPrompt,
      model,
      reasoningLevel: req.reasoningLevel || settings.reasoningLevel,
      autoTranslateBn: req.autoTranslateBn ?? settings.autoTranslateBn,
      pageUrl: req.pageUrl || '',
      pageContext: req.pageContext || '',
    }),
  });

  const data = (await response.json().catch(() => ({}))) as any;
  if (!response.ok) {
    throw new Error(data?.error || `AI সার্ভার ত্রুটি (${response.status})`);
  }

  return {
    text: data.text || '',
    modelUsed: data.modelUsed || model,
    preset: data.preset || model,
  };
}
