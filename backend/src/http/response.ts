import type { EnvConfig } from "../config/env";

export function jsonResponse(
  data: unknown,
  init: ResponseInit = {},
  config?: EnvConfig,
) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (config) {
    headers.set("Access-Control-Allow-Origin", config.corsOrigin);
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }

  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers,
  });
}

export function optionsResponse(config: EnvConfig) {
  return jsonResponse({ ok: true }, { status: 204 }, config);
}

export function errorResponse(
  message: string,
  status: number,
  config: EnvConfig,
  details?: unknown,
) {
  return jsonResponse(
    {
      ok: false,
      error: {
        message,
        details,
      },
    },
    { status },
    config,
  );
}
