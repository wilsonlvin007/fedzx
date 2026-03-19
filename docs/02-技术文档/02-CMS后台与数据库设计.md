# 技术文档 02｜CMS 后台与数据库设计（apps/cms）

本篇聚焦 CMS 的代码结构、鉴权、数据库与文章字段（GEO 结构）。

---

## 1. 技术栈

- Next.js 16（App Router）
- Prisma ORM（SQLite）
- Session：cookie-based（服务端校验）
- 部署：systemd + Nginx 反代

---

## 2. Prisma 与数据库

### 2.1 schema 位置

- `apps/cms/prisma/schema.prisma`

### 2.2 生产数据库与环境变量

- 生产 DB：`/opt/fedzx/apps/cms/prod.db`
- 环境变量：`/opt/fedzx/apps/cms/.env.production`
  - `DATABASE_URL="file:./prod.db"`

### 2.3 迁移策略（生产）

生产使用迁移目录 `apps/cms/prisma/migrations`。

上线时建议流程：

1. `git pull`
2. `npm ci`
3. `npx prisma migrate deploy`
4. `npx prisma generate`
5. `npm run build`
6. `sudo systemctl restart fedzx-cms`

如果生产库早期不是用 `migrate` 创建的（已存在表，但没有迁移历史），会触发：

- `P3005 The database schema is not empty`

处理方式是 baseline：

- `npx prisma migrate resolve --applied <init_migration_id>`

然后再 `migrate deploy`。

---

## 3. 文章模型（GEO 结构）

`Article` 关键字段（Phase 1/STEP 4 后）：

- `title`：标题
- `slug`：唯一 URL 标识（前台用 `?slug=` 或 docs 用 path）
- `question`（可空）：用户可搜索问题（GEO）
- `short_answer`（可空）：可被 AI 直接引用的 1-2 句结论（GEO）
- `summary`（可空）：给人看的摘要（列表/卡片）
- `body`：正文（Markdown）
- `sources`（可空）：来源（换行分隔）
- `tags`：JSON 字符串（默认 `"[]"`，后台用多选保存为数组 JSON）
- `status`：`DRAFT | REVIEW | PUBLISHED | ARCHIVED`
- `publishedAt`：发布时间（发布时写入）

前台渲染逻辑（约定）：

- 列表页：优先 `short_answer`，否则 `summary`
- 详情页顺序：
  1. 标题
  2. Short Answer（高亮卡片；旧文 fallback summary）
  3. Summary（只有 short_answer 与 summary 同时存在才展示，避免重复）
  4. 正文
  5. Sources（单独模块）

---

## 4. CMS 后台页面与权限

后台路径：

- `https://cms.fedzx.com/admin`
- 管理文章：`/admin/articles`
- 新建：`/admin/articles/new`
- 编辑：`/admin/articles/<id>`

权限模型：

- 当前为单角色 `ADMIN`
- 访问 `/admin/(protected)/*` 需要登录 session

---

## 5. 后台文章编辑表单（运营友好）

编辑顺序固定：

1. Question（提示：写成用户会搜索的问题）
2. Short Answer（提示：1-2 句可引用结论）
3. Summary（提示：首页人类可读摘要）
4. Body（正文 Markdown）
5. Sources（提示：来源换行分隔）
6. Tags（多选 + 自定义标签新增入库）

这套顺序与前台呈现一致，让运营“只填内容，不用思考结构”。

### 5.1 账户设置 / 修改密码

新增页面：

- `/admin/settings`

用途：

- 当前登录管理员修改自己的密码

表单字段：

- 当前密码
- 新密码
- 确认新密码

接口：

- `POST /api/admin/account/password`

逻辑：

- 先用当前 session 确认操作者身份
- 校验当前密码是否正确
- 新密码至少 6 位
- 两次输入必须一致
- 成功后更新 `User.passwordHash`

### 5.2 标签池与文章标签关系

为了让“自定义标签”可以沉淀并复用，新增了两张表：

- `Tag`
  - `id`
  - `name`
  - `normalizedName`（唯一，做防重复）
- `ArticleTag`
  - `articleId`
  - `tagId`

后台行为：

- 文章编辑页的“自定义标签”点击添加后，会调用 `POST /api/admin/tags`
- 如果标签不存在，就写入 `Tag`
- 如果已存在，就直接复用
- 添加成功后：
  - 常用标签列表立即出现该标签
  - 并自动选中

兼容策略：

- `Article.tags` 这个旧字段仍然保留
- 每次保存文章时，会把关联标签同步回 `Article.tags` 的 JSON 字符串

这样做的好处是：

- 新的标签池可复用
- 旧前台/API 不需要一次性全部重写

---

## 6. 公共 API（前台消费）

文章列表：

- `GET /api/public/articles`

返回项（简化）：

- `id, slug, title, question, shortAnswer, short_answer, summary, tags[], publishedAt, updatedAt`

文章详情：

- `GET /api/public/articles/<slug>`

返回项（简化）：

- `... + body + sources`

兼容说明：

- `tags` 在 API 返回为数组（兼容早期 DB 存 JSON 字符串）
- `short_answer` 会同时返回一份 snake_case，兼容静态站脚本的字段读取

---

## 7. 内部 Docs API（知识库）

- `GET /api/internal/docs`：分类目录
- `GET /api/internal/docs/<slug>`：文档内容

文档源：`/opt/fedzx/docs/<categoryDir>/*.md`

标题读取：Markdown 第一行 `# ...`

---

## 8. 常见故障定位（CMS）

1) 502（cms 子域）

- `sudo systemctl status fedzx-cms`
- `sudo journalctl -u fedzx-cms -n 200 --no-pager`
- `sudo ss -lntp | grep 3100`

2) Prisma 报表不存在

- DB 文件指错 / 没跑迁移
- 检查 `.env.production` 的 `DATABASE_URL`
- 跑 `npx prisma migrate deploy`

如果是本次标签系统升级，还要确认新迁移已执行：

- `20260320093000_add_tag_tables`

3) 登录证书报错（ERR_CERT_COMMON_NAME_INVALID）

- Nginx server block 证书配置错
- 用 openssl 检查：
  - `echo | openssl s_client -connect cms.fedzx.com:443 -servername cms.fedzx.com 2>/dev/null | openssl x509 -noout -subject -ext subjectAltName`
