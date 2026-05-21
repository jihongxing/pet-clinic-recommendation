# Staging 部署说明

## 目标

当前 staging 部署基于仓库内的 `docker-compose.staging.yml`，面向单机自托管场景。

这套配置解决了之前几个明显问题：

- `backend/Dockerfile` 以前只适合本地开发，会直接跑 `start:dev`
- 原有 `docker-compose.yml` 默认绑定源码目录，不适合 staging
- 容器启动后不会自动执行 TypeORM migrations
- Nginx 反向代理下，应用没有显式开启 `trust proxy`

现在这套 staging 配置会：

- 构建生产镜像
- 自动等待 PostgreSQL / Redis 健康后启动后端
- 容器启动时自动执行 migrations
- 通过 Nginx 暴露统一入口
- 支持按 `DOMAIN_NAME` 渲染 HTTPS 域名与证书路径
- 持久化用户上传图片到独立 volume，避免重建后丢失推荐材料
- 保留 Prometheus / Alertmanager / Grafana
- 通过 Loki + Promtail 汇总后端与 Nginx 日志

## 部署前准备

1. 复制环境变量模板

```powershell
Copy-Item .env.staging.example .env.staging
```

2. 至少修改这些字段

- `DOMAIN_NAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `WECHAT_APPID`
- `WECHAT_SECRET`
- `GRAFANA_ADMIN_PASSWORD`

另外建议同步确认：

- `SWAGGER_ENABLED=false`
- `API_PREFIX=/api/v1`
- `JWT_SECRET` 不是开发默认值

## 一键部署

```powershell
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d --build
```

如果你使用 Podman，也可以执行：

```powershell
podman compose --env-file .env.staging -f docker-compose.staging.yml up -d --build
```

## 验证

部署完成后，先看容器状态：

```powershell
docker compose --env-file .env.staging -f docker-compose.staging.yml ps
```

再验证几个关键入口：

- 反向代理健康检查：`http://<server-host>/health`
- 后端存活探针：`https://<DOMAIN_NAME>/api/v1/health/live`
- 后端就绪探针：`https://<DOMAIN_NAME>/api/v1/health/ready`
- HTTPS 入口：`https://<DOMAIN_NAME>`
- 后端健康检查：`https://<DOMAIN_NAME>/api/v1/health`
- Prometheus：`http://<server-host>:9090`
- Alertmanager：`http://<server-host>:9093`
- Grafana：`http://<server-host>:3001`
- Loki：`http://<server-host>:3100/ready`

安全说明：Prometheus、Alertmanager、Grafana、Loki 的端口默认只绑定到 `127.0.0.1`。远程查看建议使用 SSH 隧道，或在服务器侧通过内网访问，不要直接暴露到公网。

## 常用运维命令

查看日志：

```powershell
docker compose --env-file .env.staging -f docker-compose.staging.yml logs -f backend nginx
```

看可观测性组件状态：

```powershell
docker compose --env-file .env.staging -f docker-compose.staging.yml ps loki promtail grafana prometheus
```

拉起更新：

```powershell
cd backend
npm run check:release
cd ..
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d --build
```

停止服务：

```powershell
docker compose --env-file .env.staging -f docker-compose.staging.yml down
```

## 当前边界

当前 staging 已具备这几项生产可观测性能力：

- 后端 JSON 结构化日志按天滚动写入持久卷
- 用户上传图片写入 `backend_staging_uploads` 持久卷
- Nginx access/error 日志写入持久卷
- Promtail 自动采集 backend / nginx 日志并推送到 Loki
- Grafana 同时接入 Prometheus 和 Loki
- 预置 `PetMed Production Observability` 仪表盘，可直接看错误日志、日志量和 API 指标

常用排查路径：

1. 先看 Grafana 仪表盘里的 `API Error Rate` 和 `API P95 Response Time`
2. 如果错误率异常，切到 `Backend Logs` 面板按 `requestId` / `path` 搜索
3. 如果怀疑反向代理问题，再看 `Nginx Logs` 面板

这次完成的是 `T6-05` 和 `T6-08` 的基础设施部分，staging 现在已经能同时追踪性能和错误日志。

补充收尾资料见：

- [发布检查清单](./发布检查清单.md)
- [数据库备份与恢复说明](./数据库备份与恢复说明.md)
- [上线回滚方案](./上线回滚方案.md)
