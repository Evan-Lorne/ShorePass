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
npm run import:questions -- prisma/seed-data/repaired-preview-20260910.json
npm run dev -- --hostname 127.0.0.1
```

打开 <http://127.0.0.1:3000>。

仓库不包含本地数据库、设备令牌或个人学习记录。预览题库尚未通过原件人工核验，不应直接开放为正式模考。

## 检查与部署

```bash
npm test
npm run lint
npm run build
```

端到端验收会自动在临时目录创建独立数据库、播种合成数据并启动生产服务，配置见 `playwright.acceptance.config.ts` 和 `acceptance/`。默认不覆盖验收截图；仅在需要更新证据时设置 `UPDATE_ACCEPTANCE_EVIDENCE=1`。

本项目需要运行服务端 API，不能直接部署到 GitHub Pages。个人使用推荐单实例 Node.js、持久磁盘和 HTTPS。部署步骤及备份要求见 [DEPLOYMENT.md](DEPLOYMENT.md)。

详细修复清单、测试证据和未完成项见 [验收与修复报告](ShorePass_验收与修复报告_2026-09-10.md)。
