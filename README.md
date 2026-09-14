# ShorePass

面向自考英语（二）/ 英语专升本的响应式学习网站，支持电脑和手机做题、保存草稿、客观题判分、错题复练和设备同步。

## 功能

- 试卷筛选、答题卡、标记、原文阅读与进度恢复。
- 客观题自动判分；作文与翻译保留作答并显示待评状态。
- 错题自动归集，独立复练连续答对两次后标记掌握。
- 一次性同步码绑定设备，服务端保存学习记录。
- 已访问页面的基础离线支持和 PWA 安装清单。

技术栈：Next.js、React、TypeScript、Prisma、SQLite。

## 本地运行

需要 Node.js 22。在本地创建 `.env`，参照 `.env.example` 配置：

```dotenv
DATABASE_URL="file:./dev.db"
```

```bash
npm ci
npm run db:generate
npm run db:push
# 仅首次初始化空数据库时导入全部 30 套试卷
for paper in prisma/seed-data/all-papers/*.json prisma/seed-data/repaired-preview-20260910.json; do
  npm run import:questions -- "$paper" || exit 1
done
node_modules/.bin/tsx src/scripts/seed-words.ts
npm run dev -- --hostname 127.0.0.1
```

打开 <http://127.0.0.1:3000>。

仓库保留全部试卷 JSON，数据库由导入命令初始化。已有数据库和学习记录时，跳过首次导入步骤。`example-paper.json` 是开发示例，不在上述 30 套试卷导入范围内。

本地数据库、环境配置、依赖目录、构建产物及测试生成文件由 `.gitignore` 排除，不上传 Git。历史核验附件已清理；JSON 中的来源信息仅作为历史文字说明，运行和导入均不要求对应原件存在。

## 检查与部署

```bash
npm test
npm run lint
npm run build
```

端到端验收会自动在临时目录创建独立数据库、播种合成数据并启动生产服务，配置见 `playwright.acceptance.config.ts` 和 `acceptance/`。设置 `UPDATE_ACCEPTANCE_EVIDENCE=1` 可按需生成截图；生成文件不进入 Git。

本项目需要运行服务端 API，不能直接部署到 GitHub Pages。个人使用推荐单实例 Node.js、持久磁盘和 HTTPS。部署步骤及备份要求见 [DEPLOYMENT.md](DEPLOYMENT.md)。
