# ShorePass 个人使用部署说明

## 推荐方案

当前项目是 Next.js + SQLite，包含真实的服务端 API，不能直接部署到 GitHub Pages。

| 方案 | 电脑手机互通 | 运维 | 当前版本适配情况 |
| --- | --- | --- | --- |
| GitHub Pages + 浏览器存储 | 不自动互通 | 少 | 需要另做纯静态版本；本地记录随浏览器清理而丢失 |
| 一台小服务器 + HTTPS + 持久磁盘 | 支持同步码绑定 | 需要更新服务和备份 | 推荐，沿用现有架构 |
| 支持 Node.js 和持久卷的托管服务 | 支持同步码绑定 | 较少 | 可用，必须选持久磁盘而非临时文件系统 |
| Vercel + Supabase / 托管 PostgreSQL | 支持 | 较少 | 需要数据库迁移与重新验收，不能直接用当前 SQLite 文件 |

对于一个人的学习站，先采用单实例 Node.js + 持久 SQLite 即可。不需要短信登录或复杂账户系统。具体云服务的价格、免费额度和休眠政策本次未联网核对。

## 本地运行

```bash
npm ci
npm run db:generate
npm run db:push
npm run dev -- --hostname 127.0.0.1 --port 3210
```

需要 `.env` 中设置 `DATABASE_URL="file:./dev.db"`，示例见 `.env.example`。当前工作区数据库已保留并升级，不要重新运行会写入占位内容的旧测试脚本或旧种子脚本。

新环境导入修复后的预览题库：

```bash
npm run import:questions -- prisma/seed-data/repaired-preview-20260910.json
```

此 JSON 是修复后的预览数据，不是已人工核验的正式真题。不要通过直接修改 verified 值跳过核验。

## 服务器运行

要求 Node.js 22、持久可写磁盘、HTTPS 反向代理，推荐单实例运行。

1. 配置 `DATABASE_URL` 为持久盘中的 SQLite 绝对路径，如 `file:/data/shorepass.db`。
2. 配置 `APP_ORIGIN=https://你的域名`，代理保留正确 Host。生产设备 cookie 默认 Secure，不要在公网关闭。
3. 设置长随机 `ADMIN_TOKEN`，仅在服务器保管。未配置时发布、批改管理接口拒绝写入。
4. 执行 `npm ci`、`npm run db:generate`、`npm run db:push`、`npm run build`。
5. 用服务管理器启动 `npm run start -- --hostname 0.0.0.0 --port 3000`，由 HTTPS 代理转发。
6. 数据库首次部署后导入预览 JSON；正式使用之前完成人工题库核验。

提供了 Dockerfile 作为可选打包方式；本次未运行 Docker 构建。容器必须把 `/data` 挂载为持久卷。不要将 SQLite 放在 serverless 临时磁盘，也不要让多个副本各自持有不同数据库。

构建时不要和 dev 服务共用 `.next` 输出目录。需要并行时分别设置 `NEXT_DIST_DIR=.next-production` 与 `NEXT_DIST_DIR=.next-dev`；启动生产服务时使用构建时相同的值。

## 身份和同步

- 首次访问会创建免注册设备身份，凭证保存在 HttpOnly cookie 中；服务器只接受有效设备凭证，不信任传入的 userId。
- 在有学习记录的设备上生成同步码，在另一台设备输入。同步码 10 分钟有效且只能使用一次。
- 绑定会合并服务端记录；离线草稿应先恢复网络保存。答题页约每 4 秒同步，概览/错题页约每 5 秒刷新。
- 两端同时改题时，旧版本会被拒绝。载入最新进度前本机未同步草稿另存备份，避免静默覆盖。
- 不提供邮箱或密码找回。如果所有设备 cookie 都被清除，不能仅凭知道 userId 取回数据，需要由站点管理员依据数据库备份恢复。至少保留一台已绑定设备。
- 旧版仅存 userId 而无设备令牌的历史数据保留在数据库中，但不能自动认领，否则任何人都能冒充旧用户。迁移旧记录需核实归属后由管理员处理。

## 离线和备份

- 答案、标记、题号实时写入本机；联网后重试上传。离线不能完成服务端交卷，界面保留答案并允许重试。
- 已访问页面与静态资源由 Service Worker 缓存；首次打开从未缓存的试卷仍需联网。安装/PWA/Service Worker 在正式环境需要 HTTPS，局域网普通 HTTP 不等同于完整离线环境。
- 本机草稿以 `shorepass:draft:` 为前缀保存；冲突备份键包含 `:backup:`。清理浏览器数据会清除尚未同步的本地草稿。
- 服务器应每日进行 SQLite 一致性备份，例如 `sqlite3 /data/shorepass.db ".backup '/backup/shorepass-YYYYMMDD.db'"`，保留多份历史并复制到另一存储位置。
- 不要在运行写入时只复制一个 SQLite 文件作为唯一备份；使用 SQLite backup 接口并测试恢复。
- 公网代理应为设备创建、同步码接口设置按来源 IP 的限流。应用内部已有配对尝试次数限制，但它不能替代公网入口的限流。

## 尚未完成的产品项

详见 `ShorePass_验收与修复报告_2026-09-10.md`。当前软件闭环验收与正式内容核验是两件事。没有完整已核验真题，不能宣称已满足 PRD 的正式上线验收。
