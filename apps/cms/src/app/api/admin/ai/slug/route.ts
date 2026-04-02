import { NextRequest, NextResponse } from "next/server";

const QWEN_API_KEY = "sk-0362d4e9251140cf88fd97e81efe3da4";
const QWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

export async function POST(req: NextRequest) {
  try {
    const { title } = await req.json();
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ slug: "" });
    }

    const trimmed = title.trim();

    // 如果标题已经是纯英文+数字+连字符，直接返回（不需要翻译）
    if (/^[a-zA-Z0-9\s\-]+$/.test(trimmed)) {
      const slug = trimmed
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
      return NextResponse.json({ slug });
    }

    // 调用千问 API 翻译标题为 URL slug
    const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${QWEN_API_KEY}`,
      },
      body: JSON.stringify({
        model: "qwen-turbo",
        messages: [
          {
            role: "system",
            content: `你是一个 URL slug 生成器。用户会给你一个文章标题，你需要把它转换成简洁的英文 URL slug。
规则：
- 只返回 slug 本身，不要任何解释、不要引号、不要代码块
- 全小写，单词用连字符连接
- 保留专有名词（公司名、地名等用英文）
- 金融术语用准确的英文（如 FOMC、rate-cut、bull、bear 等）
- 去掉疑问词和虚词（"的"、"了"、"吗"等）
- 控制长度在 30-60 个字符之间
- 示例：
  "伊朗冲突持续多久？油价会涨到多少？对美股港股有何具体影响？" → how-long-iran-conflict-oil-price-impact-us-hk-stocks
  "美联储宣布降息50个基点，美股三大指数全线上涨" → fed-rate-cut-50bps-us-stocks-surge
  "2026年第一季度A股市场展望与投资策略" → q1-2026-a-shares-outlook-investment-strategy
  "特斯拉财报超预期，净利润同比增长30%" → tesla-earnings-beat-expectation-profit-up-30`,
          },
          {
            role: "user",
            content: trimmed,
          },
        ],
        max_tokens: 80,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      // 千问调用失败，返回空字符串让前端用本地兜底
      console.error("Slug API error:", response.status, await response.text());
      return NextResponse.json({ slug: "" });
    }

    const data = await response.json();
    let slug = data.choices?.[0]?.message?.content?.trim() || "";

    // 清理：去掉可能的引号、代码块标记
    slug = slug.replace(/^["'`]+|["'`]+$/g, "").replace(/```/g, "").trim();
    // 确保只包含合法字符
    slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");

    if (!slug || slug.length < 3) {
      return NextResponse.json({ slug: "" });
    }

    return NextResponse.json({ slug });
  } catch (error) {
    console.error("Slug generation error:", error);
    return NextResponse.json({ slug: "" });
  }
}
