# 技术文档 05｜Agent Pipeline 集成记录（fedzx.com）

> 变更日期：2026-03-22
> 操作人：AI（Claude）
> 目的：为 Dify 多 Agent 内容创作 Pipeline 新增文章自动写入接口，实现"AI 生成 → 草稿入库 → 人工审核 → 发布"的半自动内容运营流程。

---

## 1. 变更概览

| 变更项 | 说明 |
|--------|------|
| 新增 API 接口 | `POST /api/agent/articles` |
| 新增环境变量 | `AGENT_API_KEY` |
| 涉及文件 | `src/app/api/agent/articles/route.ts` |
| 数据库变更 | 无（复用现有 Article 表） |
| 部署方式 | npm run build + systemctl restart |

---

## 2. 背景

站点引入了基于 Dify 搭建的多 Agent 内容创作 Pipeline，流程如下：

```
用户输入主题
  → 研究助理 Agent（Kimi）：搜集资料
  → 大纲规划 Agent（千问）：生成结构
  → 正文撰写 Agent（千问）：撰写全文
  → 审稿 Agent（千问）：质量评估 + 去AI化检测
  → 润色编辑 Agent（千问）：终审润色
  → 解析字段（代码节点）：拆分结构化字段
  → HTTP 节点：调用本接口写入 CMS
  → 输出节点：返回结果
```

文章写入后状态为 `DRAFT`，需人工在 CMS 后台审核后手动发布。

---

## 3. 新增接口说明

### 接口地址

```
POST https://cms.fedzx.com/api/agent/articles
```

### 请求头

| Header | 值 |
|--------|-----|
| Content-Type | application/json |
| x-api-key | 见环境变量 `AGENT_API_KEY` |

### 请求体字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | 文章标题（通常使用 Question 字段） |
| body | string | ✅ | 正文内容（Markdown） |
| question | string | 否 | GEO 问题字段 |
| short_answer | string | 否 | GEO 核心结论 |
| summary | string | 否 | 摘要 |
| sources | string | 否 | 来源（换行分隔） |
| slug | string | 否 | 不传则自动生成 |

### 响应示例

**成功（200）：**
```json
{
  "success": true,
  "id": "cmn1iiku10000lutw4q5ovpnp",
  "slug": "2026年美联储降息-1774169169722",
  "adminUrl": "https://cms.fedzx.com/admin/articles/cmn1iiku10000lutw4q5ovpnp"
}
```

**认证失败（401）：**
```json
{ "error": "Unauthorized" }
```

**参数缺失（400）：**
```json
{ "error": "title 和 body 为必填项" }
```

---

## 4. 新增文件

### 文件路径

```
apps/cms/src/app/api/agent/articles/route.ts
```

### 文件内容

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== process.env.AGENT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { title, slug, question, short_answer, summary, sources } = body
    const articleBody = body.body

    if (!title || !articleBody) {
      return NextResponse.json({ error: 'title 和 body 为必填项' }, { status: 400 })
    }

    const finalSlug = slug ||
      title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '')
      + '-' + Date.now()

    const article = await prisma.article.create({
      data: {
        title,
        slug: finalSlug,
        question: question || null,
        shortAnswer: short_answer || null,
        summary: summary || null,
        body: articleBody,
        sources: sources || null,
        status: 'DRAFT',
        tags: '[]',
        createdById: 'cmmutco3000006ktwden2pnlc',
        updatedById: 'cmmutco3000006ktwden2pnlc',
      },
    })

    return NextResponse.json({
      success: true,
      id: article.id,
      slug: article.slug,
      adminUrl: `https://cms.fedzx.com/admin/articles/${article.id}`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '创建失败' }, { status: 500 })
  }
}
```

> ⚠️ 注意：`createdById` 和 `updatedById` 硬编码为管理员账号 `admin@fedzx.com` 的用户 ID（`cmmutco3000006ktwden2pnlc`）。如果未来管理员账号重建，需同步更新此处。

---

## 5. 新增环境变量

文件路径：`/opt/fedzx/apps/cms/.env.production`

```
AGENT_API_KEY="zhao@@@123"
```

> ⚠️ 安全提示：此 Key 用于 Dify Pipeline 调用，请勿泄露。如需更换，同步更新 Dify 工作流中 HTTP 节点的 Header 配置。

---

## 6. 排查过程记录（供参考）

本次部署过程中遇到以下问题，记录如下供后续参考：

**问题一：接口返回 404**
原因：文件误创建在根目录 `app/`，而项目实际使用 `src/app/` 结构。
解决：删除 `app/` 目录，将文件移至 `src/app/api/agent/articles/route.ts`。

**问题二：TypeScript 编译报错 `short_answer` 字段不存在**
原因：Prisma schema 使用驼峰命名 `shortAnswer`，不是下划线。
解决：接口接收 `short_answer`（与 Dify 输出保持一致），写入数据库时映射为 `shortAnswer`。

**问题三：`createdBy` 字段类型错误**
原因：`createdBy` 是关联 User 的对象关系，不能直接传字符串。
解决：改用 `createdById` 传入用户 ID（外键字段）。

**问题四：CMS 后台 `/admin/login` 返回 404**
原因：服务器根目录存在手动创建的 `app/` 目录，Next.js 优先读取了它，导致 `src/app/admin` 被忽略，路由未被注册。
解决：删除多余的根目录 `app/` 后重新 build，所有 admin 路由恢复正常。

---

## 7. 后续待完成事项

- [ ] 在 Dify 中完成「解析文章字段」代码节点配置
- [ ] 在 Dify 中完成「HTTP 发布」节点配置
- [ ] 端到端测试：从 Dify 输入主题 → 文章自动出现在 CMS 草稿箱
- [ ] 将本文件提交到 git 仓库（路径建议：`docs/05-agent-pipeline-integration.md`）
- [ ] 将 `src/app/api/agent/articles/route.ts` 提交到 git 仓库

---

## 8. 相关命令速查

重新部署 CMS：
```bash
cd /opt/fedzx/apps/cms
npm run build
sudo systemctl restart fedzx-cms
```

测试接口：
```bash
curl -s -X POST https://cms.fedzx.com/api/agent/articles \
  -H "Content-Type: application/json" \
  -H "x-api-key: zhao@@@123" \
  -d '{"title":"测试标题","body":"测试正文"}'
```

查看 CMS 日志：
```bash
sudo journalctl -u fedzx-cms -n 100 --no-pager
```
