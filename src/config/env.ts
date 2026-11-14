/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Type-Safe Environment & Cloudflare Bindings Interface
 * Unifies Cloudflare Worker/Pages bindings, Node.js process.env, and Vite runtime environments.
 * Eliminates hardcoded secrets and provides consistent access across all search adapters.
 */

export interface CloudflareEnv {
  // KV Namespace Bindings
  KV_BINDING?: any;
  OMARVIO_KV?: any;
  KV?: any;

  // D1 Database & R2 Storage Bindings
  OMARVIO_DB?: any;
  OMARVIO_BUCKET?: any;

  // Cloudflare Workers AI Binding
  AI?: any;

  // Search Engine API Credentials & Secrets
  GOOGLE_CSE_KEY?: string;
  GOOGLE_CSE_CX?: string;
  BRAVE_API_KEY?: string;

  // Application Metadata & Configuration
  APP_NAME?: string;
  APP_VERSION?: string;
  SLOGAN?: string;
  DEFAULT_SEARCH_ENGINE?: string;
  ENCRYPTION_STANDARD?: string;
  NODE_ENV?: string;
  ALLOW_FRAME_BYPASS?: string;
  CLOUDFLARE_EDGE_SYNC?: string;
}

export interface SearchEngineSecrets {
  googleCseKey: string;
  googleCseCx: string;
  braveApiKey: string;
}

export interface AppConfig {
  appName: string;
  appVersion: string;
  slogan: string;
  defaultSearchEngine: string;
  isProduction: boolean;
}

// Module-level context for Cloudflare Pages/Worker runtime injection
let workerEnvContext: Partial<CloudflareEnv> = {};

/**
 * Injects Cloudflare Worker/Pages context.env into the global accessor.
 * Enables edge runtime functions to supply dynamic request-level bindings.
 */
export function setWorkerEnv(env: Partial<CloudflareEnv>): void {
  workerEnvContext = { ...workerEnvContext, ...env };
}

/**
 * Type-safe environment lookup supporting Cloudflare Workers, Node.js, and browser runtimes.
 * Resolution hierarchy: Worker context -> globalThis -> process.env -> import.meta.env -> fallback
 */
export function getEnv(key: keyof CloudflareEnv | string, defaultValue = ''): string {
  // 1. Check Cloudflare Worker context injection
  if (workerEnvContext && (workerEnvContext as any)[key] !== undefined) {
    const val = (workerEnvContext as any)[key];
    if (typeof val === 'string') return val;
  }

  // 2. Check globalThis (Cloudflare edge runtime globals)
  if (typeof globalThis !== 'undefined' && (globalThis as any)[key] !== undefined) {
    const val = (globalThis as any)[key];
    if (typeof val === 'string') return val;
  }

  // 3. Check Node.js process.env (server.ts / local dev)
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    return process.env[key] || defaultValue;
  }

  // 4. Check Vite import.meta.env
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const metaEnv = (import.meta as any).env;
      if (metaEnv[key] !== undefined) {
        return metaEnv[key] || defaultValue;
      }
      const viteKey = `VITE_${key}`;
      if (metaEnv[viteKey] !== undefined) {
        return metaEnv[viteKey] || defaultValue;
      }
    }
  } catch {}

  return defaultValue;
}

/**
 * Returns strongly typed search engine API credentials for engine adapters.
 */
export function getSearchSecrets(): SearchEngineSecrets {
  return {
    googleCseKey: getEnv('GOOGLE_CSE_KEY'),
    googleCseCx: getEnv('GOOGLE_CSE_CX'),
    braveApiKey: getEnv('BRAVE_API_KEY'),
  };
}

/**
 * Returns global application configuration parameters.
 */
export function getAppConfig(): AppConfig {
  return {
    appName: getEnv('APP_NAME', 'OMARVIO BROWSER'),
    appVersion: getEnv('APP_VERSION', 'v2.0.0'),
    slogan: getEnv('SLOGAN', 'My Phone, My Data – Why Surrender It To Others!'),
    defaultSearchEngine: getEnv('DEFAULT_SEARCH_ENGINE', 'google'),
    isProduction: getEnv('NODE_ENV') === 'production',
  };
}

/**
 * Retrieves the Cloudflare KV binding instance if available in the current runtime.
 */
export function getKVBinding(): any | null {
  if (workerEnvContext.KV_BINDING) return workerEnvContext.KV_BINDING;
  if (workerEnvContext.OMARVIO_KV) return workerEnvContext.OMARVIO_KV;
  if (workerEnvContext.KV) return workerEnvContext.KV;

  if (typeof globalThis !== 'undefined') {
    if ((globalThis as any).KV_BINDING) return (globalThis as any).KV_BINDING;
    if ((globalThis as any).OMARVIO_KV) return (globalThis as any).OMARVIO_KV;
    if ((globalThis as any).KV) return (globalThis as any).KV;
  }

  return null;
}
