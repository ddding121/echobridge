const DASHSCOPE_ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const TRANSLATION_MODEL = "qwen3.7-plus";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { transcript?: unknown };
    const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    if (!transcript) return jsonError("请先完成课堂转写。", 400);
    if (transcript.length > 50000) return jsonError("逐字稿过长，请缩短后再翻译。", 413);

    const requestKey = request.headers.get("x-dashscope-api-key")?.trim();
    const apiKey = process.env.DASHSCOPE_API_KEY?.trim() || requestKey;
    if (!apiKey) return jsonError("尚未配置 DashScope API Key。", 503);

    const response = await fetch(DASHSCOPE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TRANSLATION_MODEL,
        messages: [
          {
            role: "system",
            content: "你是课堂字幕翻译助手。请忠实地将中文课堂逐字稿翻译为自然、清晰的英文，保留原文段落顺序，不补充、不总结、不解释。只输出英文译文。",
          },
          {
            role: "user",
            content: `请把下面的课堂逐字稿翻译成英文：\n\n${transcript}`,
          },
        ],
        stream: false,
        temperature: 0.1,
      }),
    });

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
      message?: string;
    };
    if (!response.ok) {
      const detail = payload.error?.message || payload.message;
      return jsonError(detail ? `翻译服务返回错误：${detail}` : "翻译服务暂时不可用。", response.status);
    }

    const translation = payload.choices?.[0]?.message?.content?.trim();
    if (!translation) return jsonError("模型没有返回有效译文。", 502);
    return Response.json({ translation, model: TRANSLATION_MODEL });
  } catch {
    return jsonError("生成双语字幕时出现异常，请稍后重试。", 500);
  }
}
