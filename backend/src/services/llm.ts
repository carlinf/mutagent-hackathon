import type { EnvConfig } from "../config/env";

export interface LlmMessage {
  role: "system" | "user";
  content: string;
}

export interface LlmClient {
  enabled: boolean;
  complete(messages: LlmMessage[]): Promise<string>;
}

class DisabledLlmClient implements LlmClient {
  enabled = false;

  async complete() {
    return "";
  }
}

class OpenAiResponsesClient implements LlmClient {
  enabled = true;

  constructor(private readonly config: EnvConfig) {}

  async complete(messages: LlmMessage[]) {
    if (!this.config.openAiApiKey) return "";

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.openAiModel ?? "gpt-4.1-mini",
        input: messages.map((message) => ({
          role: message.role,
          content: [{ type: "input_text", text: message.content }],
        })),
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`LLM request failed: ${response.status} ${details}`);
    }

    const payload = (await response.json()) as {
      output_text?: string;
      output?: Array<{
        content?: Array<{ text?: string }>;
      }>;
    };

    if (payload.output_text) return payload.output_text;

    return (
      payload.output
        ?.flatMap((item) => item.content ?? [])
        .map((content) => content.text ?? "")
        .join("\n")
        .trim() ?? ""
    );
  }
}

export function createLlmClient(config: EnvConfig): LlmClient {
  if (!config.openAiApiKey) return new DisabledLlmClient();
  return new OpenAiResponsesClient(config);
}
