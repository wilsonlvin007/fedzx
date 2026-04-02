import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/admin/(protected)/_lib/require-admin";
import { TagSelector } from "@/app/admin/(protected)/_components/TagSelector";
import { getTagOptions, syncArticleTags } from "@/lib/tags";
import { generateSlugFromTitle } from "@/lib/utils/slug";

export default async function NewArticlePage() {
  await requireAdminUser();
  const tagOptions = await getTagOptions();

  async function create(formData: FormData) {
    "use server";
    const user = await requireAdminUser();

    const title = String(formData.get("title") ?? "").trim();
    let slug = String(formData.get("slug") ?? "").trim();
    const question = String(formData.get("question") ?? "").trim();
    const shortAnswer = String(formData.get("short_answer") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const sources = String(formData.get("sources") ?? "").trim();
    const coverImage = String(formData.get("coverImage") ?? "").trim();
    const tagValues = formData.getAll("tagValues").map((t) => String(t).trim()).filter(Boolean);

    // 如果 slug 为空，自动生成
    if (!slug && title) {
      slug = generateSlugFromTitle(title);
    }

    if (!title || !slug || !body) return;

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        question: question || null,
        shortAnswer: shortAnswer || null,
        summary: summary || null,
        body,
        sources: sources || null,
        coverImage: coverImage || null,
        tags: "[]",
        status: "DRAFT",
        createdById: user.id,
        updatedById: user.id,
      },
    });

    await syncArticleTags(article.id, tagValues);

    revalidatePath("/admin/articles");
    redirect("/admin/articles");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">新建文章</h1>
        <p className="mt-2 text-sm text-slate-600">
          正文建议用 Markdown，后续阶段可由 AI 辅助生成草稿。Slug 会根据标题自动生成，也可以手动修改。
        </p>
      </div>

      <form action={create} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <Field 
          label="标题" 
          name="title" 
          required 
        />
        <Field 
          label="Slug（用于 URL，留空自动生成）" 
          name="slug" 
          placeholder="例如: fed-policy-2026-03"
          hint="如果不填写，会根据标题自动生成拼音或关键词 slug"
        />
        <Field label="封面图 URL（可选）" name="coverImage" placeholder="https://..." />
        <Field
          label="Question（可选）"
          name="question"
          hint="写成用户会搜索的问题。示例：高利率下科技股如何配置？"
        />
        <Textarea
          label="Short Answer（可选）"
          name="short_answer"
          rows={3}
          hint="1~2 句话核心结论，要可以被直接引用。"
        />
        <Textarea label="Summary（可选）" name="summary" rows={3} hint="用于首页展示的人类可读摘要。" />
        <Textarea label="Body（正文 Markdown）" name="body" rows={14} required />
        <Textarea label="Sources（可选）" name="sources" rows={4} hint="数据或观点来源（换行分隔）。" />

        <TagSelector initialOptions={tagOptions} />

        <div className="flex items-center justify-end">
          <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800" type="submit">
            创建草稿
          </button>
        </div>
      </form>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const titleInput = document.querySelector('input[name="title"]');
              const slugInput = document.querySelector('input[name="slug"]');
              if (!titleInput || !slugInput) return;

              // 本地词典兜底（API 失败时使用）
              function localSlug(title) {
                if (!title) return '';
                let text = title.trim();
                text = text.replace(/[^\\w\\u4e00-\\u9fa5\\s]/g, ' ');
                const map = {
                  '什么是':'what-is','为什么':'why','如何':'how-to','怎么':'how','多少':'how-much',
                  '多久':'how-long','什么时候':'when','美联储':'fed','联储':'fed','利率':'rate',
                  '政策':'policy','股票':'stock','市场':'market','经济':'economy','通胀':'inflation',
                  '失业':'unemployment','美元':'usd','人民币':'cny','债券':'bond','基金':'fund',
                  '投资':'invest','分析':'analysis','预测':'forecast','影响':'impact','趋势':'trend',
                  '数据':'data','加息':'rate-hike','降息':'rate-cut','增长':'growth','衰退':'recession',
                  '风险':'risk','策略':'strategy','买':'buy','卖':'sell','持有':'hold',
                  '上涨':'rise','下跌':'fall','震荡':'sideways','资金':'capital','预期':'expectation',
                  '非农':'nfp','油价':'oil-price','金价':'gold-price','比特币':'bitcoin',
                  '美股':'us-stocks','港股':'hk-stocks','A股':'a-shares','中国':'china','美国':'us',
                  '伊朗':'iran','冲突':'conflict','战争':'war','制裁':'sanctions','关税':'tariff',
                  '危机':'crisis','牛市':'bull','熊市':'bear','财报':'earnings','营收':'revenue',
                  '科技':'tech','互联网':'internet','半导体':'semiconductor','人工智能':'ai',
                  '新能源':'new-energy','电动车':'ev','房地产':'real-estate','银行':'banking',
                  '苹果':'apple','微软':'microsoft','谷歌':'google','亚马逊':'amazon','特斯拉':'tesla',
                  '英伟达':'nvidia','阿里巴巴':'alibaba','腾讯':'tencent','百度':'baidu','京东':'jd',
                  '美团':'meituan','拼多多':'pdd','小米':'xiaomi','华为':'huawei','台积电':'tsmc',
                  '茅台':'maotai','比亚迪':'byd','蔚来':'nio','理想':'lixiang','小鹏':'xpeng',
                  '标普':'spx','纳斯达克':'nasdaq','恒生':'hang-seng','FOMC':'fomc','CPI':'cpi',
                  'PCE':'pce','GDP':'gdp','ETF':'etf','期货':'futures','期权':'options',
                  '止损':'stop-loss','止盈':'take-profit','加仓':'add-position','减仓':'reduce-position',
                  '抄底':'buy-bottom','反弹':'rebound','突破':'breakout','暴涨':'soar','暴跌':'crash',
                  '会':'will','能':'can','有':'has','是':'is','的':'','了':'','吗':'','呢':'','吧':'',
                  '？':'','！':'','，':'','。':'','：':'','；':''
                };
                const sortedKeys = Object.keys(map).sort((a, b) => b.length - a.length);
                for (const key of sortedKeys) {
                  text = text.replace(new RegExp(key.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'g'), ' ' + map[key] + ' ');
                }
                text = text.replace(/[\\u4e00-\\u9fa5]/g, ' ');
                text = text.toLowerCase().replace(/[^a-z0-9\\s-]/g, ' ').replace(/\\s+/g, ' ').trim().replace(/\\s+/g, '-');
                text = text.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
                return text || 'post-' + Date.now();
              }

              let debounceTimer = null;

              async function generateSlug(title) {
                if (!title || title.length < 2) { slugInput.value = ''; return; }
                try {
                  const res = await fetch('/api/admin/ai/slug', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title })
                  });
                  const data = await res.json();
                  if (data.slug && data.slug.length >= 3) {
                    slugInput.value = data.slug;
                    slugInput.classList.add('bg-slate-50');
                    setTimeout(() => slugInput.classList.remove('bg-slate-50'), 500);
                    return;
                  }
                } catch (e) { /* API 失败，用本地兜底 */ }
                // 本地兜底
                slugInput.value = localSlug(title);
                slugInput.classList.add('bg-slate-50');
                setTimeout(() => slugInput.classList.remove('bg-slate-50'), 500);
              }

              titleInput.addEventListener('input', function() {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                  if (slugInput.dataset.userModified === 'true') return;
                  generateSlug(titleInput.value.trim());
                }, 400);
              });

              slugInput.addEventListener('input', function() {
                slugInput.dataset.userModified = 'true';
              });
            })();
          `
        }}
      />
    </div>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
  hint,
  onInput,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  onInput?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
      <input
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  rows,
  required,
  hint,
}: {
  label: string;
  name: string;
  rows: number;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
      <textarea
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
        name={name}
        rows={rows}
        required={required}
      />
    </label>
  );
}
