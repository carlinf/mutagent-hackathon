export interface EnvConfig {
  port: number;
  corsOrigin: string;
  datasetPath: string;
  openAiApiKey: string | undefined;
  openAiModel: string | undefined;
}

function optionalEnv(name: string) {
  const value = Bun.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function getEnv(): EnvConfig {
  return {
    port: Number(Bun.env.PORT ?? 8787),
    corsOrigin: Bun.env.CORS_ORIGIN ?? "http://127.0.0.1:5173",
    datasetPath:
      Bun.env.DATASET_PATH ??
      "../data/SENSIBILISATION_STAFFDFM_MAFY-2026-06-27.xlsx",
    openAiApiKey: optionalEnv("OPENAI_API_KEY"),
    openAiModel: optionalEnv("OPENAI_MODEL"),
  };
}
