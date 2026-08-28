# idlm · AI 工作台

个人 AI 工具与对话工作台,部署在 Vercel。
前端是纯静态页面 (`public/`),对话能力由 `api/chat.js` 这个 Serverless Function 转发到 OpenAI。

> 上一代是基于 hexo 的博客 (`hexo-archive` 分支保留了全部历史)。本仓库现在是一个独立的 AI 工作台,不再保留旧博客。

## 文件结构

```
api/
  chat.js          OpenAI 代理 (流式 SSE)
public/
  index.html       主页
  styles.css       样式
  app.js           前端逻辑
  favicon.svg
vercel.json        Vercel 路由配置
package.json
```

## 部署步骤

### 1. 安装 Vercel CLI 并登录

```bash
npm install
npx vercel login
```

`vercel login` 会在终端打印一个 URL,**在浏览器中打开并授权**。授权完成后回到终端,会看到 `> Logged in as <your-email>`。

### 2. 把项目首次部署到 Vercel

```bash
npx vercel --yes
```

这一步会:
- 在 Vercel 上创建一个新项目(默认名跟目录同名,`idlm.github.io`)
- 部署一次预览版(preview,非生产)
- 打印预览 URL,例如 `https://idlm-github-io-xxxx.vercel.app`

### 3. 在 Vercel 控制台配置 `OPENAI_API_KEY`

打开 https://vercel.com/dashboard,选择刚创建的项目:

- **Settings** → **Environment Variables**
- 添加:
  - `OPENAI_API_KEY` = `sk-...` (你的 OpenAI API key)
  - `OPENAI_MODEL` (可选) = `gpt-4o-mini` (默认就是这个)
  - `SYSTEM_PROMPT` (可选) = 自定义系统提示词
- 选 **Production** (也可以同时加 Preview)
- 保存

### 4. 部署到生产 (拿到正式 URL)

```bash
npx vercel deploy --prod
```

这次会拿到一个生产 URL,例如 `https://idlm-github-io.vercel.app`。

### 5. (可选) 把 `idlm.github.io` 切到这个 Vercel 项目

要让 `https://idlm.github.io` 也指向这个 Vercel 项目:

- Vercel 项目 → **Settings** → **Domains**
- 添加 `idlm.github.io`
- Vercel 会给一条 A/CNAME 记录,到 GitHub 仓库的 **Settings** → **Pages** → **Custom domain** 里配

(也可以保留 GitHub Pages 现状,只把 Vercel 当 API 后端用。)

## 本地开发

```bash
npx vercel dev
```

这会同时跑静态文件 + Serverless Function。`http://localhost:3000` 是入口。

## 注意事项

- **API key 安全**:`OPENAI_API_KEY` 只放在 Vercel 环境变量里,**不要写进任何提交的代码**。`.gitignore` 已经把 `.env` 排掉。
- **流式响应**:对话使用 SSE 流式,API 失败时会有可见错误提示。
- **CORS**:`api/chat.js` 已经允许任意 origin,方便调试。前端是同源调用,浏览器实际不会用 CORS。
- **限额**:`api/chat.js` 把对话裁剪到最后 20 条,避免单次 prompt 超长导致 token 失控。

## 后续添加新工具

在 `public/index.html` 的 `<section class="grid">` 里加新的 `<a class="card" href="...">` 即可。在 `app.js` 的 `ENGINE_URLS` 字典里加新引擎,就能在 hero 搜索里用上。
