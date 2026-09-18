import { env } from "cloudflare:workers";

const DASHSCOPE_ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const QA_MODEL = "qwen3.7-plus";

type Citation = { quote: string; reason: string };
type AnswerPayload = { answer: string; citations: Citation[] };

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function parseAnswer(content: string, transcript: string): AnswerPayload {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return { answer: content.trim(), citations: [] };
  try {
    const value = JSON.parse(match[0]) as Partial<AnswerPayload>;
    const answer = typeof value.answer === "string" ? value.answer.trim() : content.trim();
    const citations = Array.isArray(value.citations)
      ? value.citations.filter((item): item is Citation => {
          if (!item || typeof item.quote !== "string" || typeof item.reason !== "string") return false;
          return item.quote.trim().length > 0 && transcript.includes(item.quote.trim());
        }).slice(0, 3)
      : [];
    return { answer, citations };
  } catch {
    return { answer: content.trim(), citations: [] };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { question?: unknown; transcript?: unknown };
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    if (!question) return jsonError("请输入你想问的问题。", 400);
    if (!transcript) return jsonError("请先上传并转写一段课堂录音。", 400);
    if (question.length > 500) return jsonError("问题请控制在500字以内。", 400);
    if (transcript.length > 50000) return jsonError("逐字稿过长，请换一段较短的录音。", 413);

    const requestKey = request.headers.get("x-dashscope-api-key")?.trim();
    const apiKey = env.DASHSCOPE_API_KEY?.trim() || requestKey;
    if (!apiKey) return jsonError("需要 DashScope API Key 才能回答问题。", 503);

    const response = await fetch(DASHSCOPE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: QA_MODEL,
        messages: [
          {
            role: "system",
            content: "你是无障碍课堂问答助手。只能根据用户提供的课堂逐字稿回答，不允许使用外部知识或猜测。找不到依据时必须明确说‘这段课堂录音中没有足够信息回答该问题’。只返回有效 JSON，不要使用 Markdown。引用必须逐字复制自逐字稿。",
          },
          {
            role: "user",
            content: `请回答问题，并返回这个 JSON 结构：{\"answer\":\"简洁清楚的中文答案\",\"citations\":[{\"quote\":\"逐字稿中的原句\",\"reason\":\"这句话如何支持答案\"}]}。最多引用3句；没有依据时 citations 为空数组。\n\n问题：${question}\n\n课堂逐字稿：\n${transcript}`,
          },
        ],
        stream: false,
        temperature: 0.1,
      }),
    });

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
      message?: string;
    };
    if (!response.ok) {
      const detail = payload.error?.message || payload.message;
      return jsonError(detail ? `问答服务返回错误：${detail}` : "问答服务暂时不可用。", response.status);
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) return jsonError("模型没有返回可用答案。", 502);
    return Response.json({ ...parseAnswer(content, transcript), model: QA_MODEL });
  } catch {
    return jsonError("回答问题时出现异常，请稍后重试。", 500);
  }
}
