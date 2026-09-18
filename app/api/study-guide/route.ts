import { env } from "cloudflare:workers";

const DASHSCOPE_ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const NOTES_MODEL = "qwen3.7-plus";

type StudyGuide = {
  title: string;
  summary: string;
  keyPoints: string[];
  tasks: string[];
  reviewQuestions: string[];
};

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

export async function POST(request: Request) {
  try {
    const { transcript } = await request.json() as { transcript?: string };
    if (!transcript?.trim()) return Response.json({ error: "没有收到逐字稿。" }, { status: 400 });
    const requestKey = request.headers.get("x-dashscope-api-key")?.trim();
    const apiKey = env.DASHSCOPE_API_KEY?.trim() || requestKey;
    if (!apiKey) return Response.json({ error: "尚未配置 DashScope API Key。" }, { status: 503 });

    const response = await fetch(DASHSCOPE_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: NOTES_MODEL,
        messages: [
          { role: "system", content: "你是无障碍课堂学习助手。只能依据逐字稿整理内容，不得补充逐字稿中没有出现的事实。请只返回有效 JSON，不要使用 Markdown。" },
          { role: "user", content: `请将下面的课堂逐字稿整理为中文学习指南。JSON 必须严格使用这个结构：{\"title\":\"不超过18字的课程标题\",\"summary\":\"80到160字摘要\",\"keyPoints\":[\"3到5条核心知识点\"],\"tasks\":[\"逐字稿明确提到的课后任务；没有则为空数组\"],\"reviewQuestions\":[\"2到4个可仅凭逐字稿回答的复习问题\"]}。\n\n课堂逐字稿：\n${transcript}` },
        ],
        stream: false,
        temperature: 0.2,
      }),
    });
    if (!response.ok) return Response.json({ error: "逐字稿已生成，但AI笔记暂时整理失败。" }, { status: response.status });
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const guide = payload.choices?.[0]?.message?.content ? parseStudyGuide(payload.choices[0].message!.content!) : null;
    return guide ? Response.json({ studyGuide: guide }) : Response.json({ error: "逐字稿已生成，但AI笔记暂时整理失败。" }, { status: 502 });
  } catch {
    return Response.json({ error: "整理课堂笔记时出现异常。" }, { status: 500 });
  }
}
