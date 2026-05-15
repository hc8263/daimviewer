import { NextRequest } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { getPatent, resolveSummary } from "@/lib/patents";

export const runtime = "nodejs";
export const maxDuration = 60;

// ~150k tokens ≈ ~600k chars (rough heuristic for Korean/English mixed). Trim
// the END of the description (least likely to hold core claims).
const MAX_CONTEXT_CHARS = 600_000;

function buildSystem(p: Awaited<ReturnType<typeof getPatent>>, summaryMd: string) {
  let description = p?.description || "";
  if (description.length > MAX_CONTEXT_CHARS) {
    description = description.slice(0, MAX_CONTEXT_CHARS) + "\n\n[…이후 본문 잘림…]";
  }
  return `당신은 이 특허에 대한 검토자 질의에 답합니다. 아래 컨텍스트(특허의 '상세한 설명' 전문)만 근거로 답하고, 추측 금지. 근거가 없으면 '명세서에 명시되어 있지 않습니다'라고 답하세요. 답변은 한국어로, 간결하게.

# 특허 정보
- WIPSONKEY: ${p?.wipsonKey}
- 발명의 명칭: ${p?.fileTitle}
- 출원인: ${p?.applicant}
- 출원번호: ${p?.wipsonKey}
- IPC: ${p?.ipc}

# 사전 요약
${summaryMd}

# 상세한 설명 전문
${description || "(명세서 본문 미적재 — 사용자에게 '본문이 아직 적재되지 않았습니다'라고 알리세요.)"}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.wipsonKey || !Array.isArray(body?.messages)) {
    return new Response("wipsonKey and messages required", { status: 400 });
  }
  const { wipsonKey, messages } = body as { wipsonKey: string; messages: UIMessage[] };

  const patent = await getPatent(wipsonKey);
  if (!patent) return new Response("patent not found", { status: 404 });
  const summaryMd = resolveSummary(patent);
  const systemText = buildSystem(patent, summaryMd);

  // Mock fallback when no API key is configured: stream a canned response.
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    const mock = `(개발 모드 · API 키 미설정)\n\n이 환경에서는 실제 모델 호출이 비활성화되어 있습니다.\n\n**컨텍스트 확인**\n- 특허 명칭: ${patent.fileTitle}\n- 명세서 길이: ${(patent.description || "").length.toLocaleString()}자\n\n프로덕션에서는 Claude Haiku 4.5가 위 명세서 전문을 근거로 답변합니다.`;
    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream({
        async start(controller) {
          for (const ch of mock) {
            controller.enqueue(encoder.encode(ch));
            await new Promise((r) => setTimeout(r, 6));
          }
          controller.close();
        },
      }),
      { headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  const result = streamText({
    model: anthropic("claude-haiku-4-5"),
    // Use a structured system with cache_control on the long context block so
    // subsequent queries about the same patent reuse the prompt cache.
    system: [
      {
        type: "text",
        text: systemText,
        providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
      },
    ] as unknown as string,
    messages: await convertToModelMessages(messages),
  });

  // Stream raw text to keep ChatPanel decoding trivial.
  return new Response(result.textStream as unknown as ReadableStream, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
