/**
 * Cloudflare Pages Functions ambient type definitions
 */
declare type PagesFunction<T = any> = (context: {
  request: Request;
  env: T;
  params?: Record<string, string | string[]>;
  data?: Record<string, any>;
  next?: () => Promise<Response>;
}) => Promise<Response> | Response;
