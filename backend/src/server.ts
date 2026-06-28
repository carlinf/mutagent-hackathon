import { getEnv } from "./config/env";
import { route } from "./http/router";

const config = getEnv();

const server = Bun.serve({
  port: config.port,
  async fetch(request) {
    return route(request, config);
  },
});

console.info(
  `DfM MAFY agent backend listening on http://127.0.0.1:${server.port}`,
);
