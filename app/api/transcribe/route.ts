const MAX_FILE_BYTES = 4 * 1024 * 1024;
const DASHSCOPE_ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const NOTES_MODEL = "qwen3.7-plus";

type StudyGuide = {
  title: string;
  summary: string;
  keyPoints: string[];
  tasks: string[];
  reviewQuestions: string[];
};

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function parseStudyGuide(content: string): StudyGuide | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const value = JSON.parse(match[0]) as Partial<StudyGuide>;
    if (typeof value.title !== "string" || typeof value.summary !== "string") return null;
    const strings = (items: unknown) => Array.isArray(items) ? items.filter((item): item is string => typeof item === "string") : [];
    return {
      title: value.title.trim() || "课堂录音笔记",
      summary: value.summary.trim(),
      keyPoints: strings(value.keyPoints),
      tasks: strings(value.tasks),
      reviewQuestions: strings(value.reviewQuestions),
    };
  } catch {
    return null;
  }
}

async function createStudyGuide(text: string, apiKey: string) {
  const response = await fetch(DASHSCOPE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: NOTES_MODEL,
      messages: [
        {
          role: "system",
          content: "你是无障碍课堂学习助手。只能依据逐字稿整理内容，不得补充逐字稿中没有出现的事实。请只返回有效 JSON，不要使用 Markdown。",
        },
        {
          role: "user",
          content: `请将下面的课堂逐字稿整理为中文学习指南。JSON 必须严格使用这个结构：{\"title\":\"不超过18字的课程标题\",\"summary\":\"80到160字摘要\",\"keyPoints\":[\"3到5条核心知识点\"],\"tasks\":[\"逐字稿明确提到的课后任务；没有则为空数组\"],\"reviewQuestions\":[\"2到4个可仅凭逐字稿回答的复习问题\"]}。\n\n课堂逐字稿：\n${text}`,
        },
      ],
      stream: false,
      temperature: 0.2,
    }),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  return content ? parseStudyGuide(content) : null;
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startedAt = Date.now();
  console.info(`[asr:${requestId}] request received`);
  try {
    const formData = await request.formData();
    const audio = formData.get("file");
    const shouldCreateNotes = formData.get("createNotes") !== "false";
    if (!(audio instanceof File)) return jsonError("没有收到音频文件。", 400);
    if (!audio.size) return jsonError("音频文件为空。", 400);
    console.info(`[asr:${requestId}] file parsed name=${audio.name} bytes=${audio.size} type=${audio.type||"unknown"}`);
    if (audio.size > MAX_FILE_BYTES) return jsonError("单段音频超过 4MB，请缩短分段后重试。", 413);

    const requestKey = request.headers.get("x-dashscope-api-key")?.trim();
    const apiKey = process.env.DASHSCOPE_API_KEY?.trim() || requestKey;
    if (!apiKey) return jsonError("尚未配置 DashScope API Key。", 503);

    const mimeType = audio.type || "audio/mpeg";
    const base64 = toBase64(await audio.arrayBuffer());
    console.info(`[asr:${requestId}] calling DashScope model=qwen3-asr-flash base64Chars=${base64.length}`);
    const response = await fetch(DASHSCOPE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3-asr-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: { data: `data:${mimeType};base64,${base64}` },
              },
            ],
          },
        ],
        stream: false,
        asr_options: { language: "zh", enable_itn: true },
      }),
      signal: AbortSignal.timeout(150000),
    });

    const rawPayload = await response.text();
    let payload: {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
      message?: string;
    } = {};
    try { payload = JSON.parse(rawPayload) as typeof payload; } catch { payload = { message: rawPayload.slice(0, 500) }; }
    console.info(`[asr:${requestId}] DashScope responded status=${response.status} elapsedMs=${Date.now()-startedAt}`);
    if (!response.ok) {
      const detail = payload.error?.message || payload.message;
      console.error(`[asr:${requestId}] DashScope error status=${response.status} detail=${detail||"unknown"}`);
      return jsonError(detail ? `语音服务返回错误：${detail}` : "语音服务暂时不可用。", response.status);
    }

    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) return jsonError("识别完成，但没有返回可用文字。", 502);
    const studyGuide = shouldCreateNotes ? await createStudyGuide(text, apiKey) : null;
    console.info(`[asr:${requestId}] completed chars=${text.length} elapsedMs=${Date.now()-startedAt}`);
    return Response.json({
      text,
      model: "qwen3-asr-flash",
      notesModel: NOTES_MODEL,
      fileName: audio.name,
      studyGuide,
      studyGuideWarning: shouldCreateNotes && !studyGuide ? "逐字稿已生成，但AI笔记暂时整理失败。" : undefined,
    });
  } catch (error) {
    console.error(`[asr:${requestId}] failed elapsedMs=${Date.now()-startedAt}`,error);
    return jsonError("处理音频时出现异常，请稍后重试。", 500);
  }
}
