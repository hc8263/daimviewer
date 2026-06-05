// LLM 모델 선택지 (Vercel AI Gateway 경유).
// Vercel AI Gateway 모델 ID: "<provider>/<model>"
export type ChatModelId =
  | "google/gemini-2.5-flash"
  | "deepseek/deepseek-v4-pro"
  | "anthropic/claude-haiku-4.5"
  | "openai/gpt-5-mini";

export type ChatModelOption = {
  id: ChatModelId;
  label: string;
  hint: string;
};

export const CHAT_MODELS: ChatModelOption[] = [
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    hint: "긴 컨텍스트(1M) · 저렴 · 기본",
  },
  {
    id: "deepseek/deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    hint: "1M 컨텍스트 · 고성능 추론",
  },
  {
    id: "anthropic/claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    hint: "한국어 정확도 우수",
  },
  {
    id: "openai/gpt-5-mini",
    label: "GPT-5 Mini",
    hint: "범용 균형형",
  },
];

export const DEFAULT_CHAT_MODEL: ChatModelId = "deepseek/deepseek-v4-pro";

export function isChatModel(value: unknown): value is ChatModelId {
  return CHAT_MODELS.some((m) => m.id === value);
}
