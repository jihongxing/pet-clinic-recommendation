# 宠物诊所口碑推荐小程序

> 一个基于四层标签体系和防刷排序算法的结构化真实医疗反馈系统

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/yourname/pet-clinic-recommendation)
[![License](https://img.shields.io/badge/license-Learning%20Only-orange.svg)](LICENSE)

---

## 📖 项目简介

这是一个帮助宠物主人**快速找到附近"口碑好/性价比高"宠物诊所**的轻量级微信小程序。

### 核心特点

- 🏷️ **四层标签体系**：L1用户决策 + L2医疗能力 + L3风险信号 + L4社交传播
- 🛡️ **三层防刷机制**：用户去重 + 时间衰减 + 交叉验证
- 📊 **智能排序算法**：Trust(45%) + Value(25%) + Experience(15%) + Social(15%) - Risk
- ⚡ **3秒完成选择**：三层情绪分流UI，降低用户决策成本
- 🔒 **去商业化排序**：付费不影响排名，信任优先

## ⚠️ 许可证说明

本仓库代码仅供学习、研究和非商业技术评估使用。

- 允许：个人学习、课堂/研究用途、非商业性质的本地修改与实验
- 禁止：商用、对外提供服务、生产部署、作为商业产品或商业项目的一部分使用

这不是 OSI 意义上的开源许可证。具体条款见 [LICENSE](LICENSE)。

---

## 🚀 本地启动

### 环境要求

- Node.js >= 20.x
- Podman 5.x + `podman compose`
- 微信开发者工具

说明：

- 当前仓库已经验证通过 `podman compose` 启动 PostgreSQL + Redis
- 当前后端可用 `npm run start:dev` 本机直跑
- 当前前端是微信小程序工程骨架，可直接在微信开发者工具中打开

### 1. 克隆项目

```powershell
git clone https://github.com/yourname/pet-clinic-recommendation.git
cd pet-clinic-recommendation
```

### 2. 准备根目录环境变量

```powershell
Copy-Item .env.example .env
```

默认开发值已经可用，如无特殊需求可先不改：

```env
DB_USERNAME=postgres
DB_PASSWORD=postgres_password
DB_DATABASE=pet_clinic_recommendation
JWT_SECRET=dev_only_change_me
```

### 3. 启动 PostgreSQL + Redis

```powershell
podman compose up -d postgres redis
```

查看状态：

```powershell
podman compose ps
```

当前默认端口：

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Prometheus: `localhost:9090`
- Alertmanager: `localhost:9093`
- Grafana: `localhost:3001`

### 4. 启动后端并执行 migrations

先安装依赖：

```powershell
cd backend
npm install
```

复制后端环境变量模板：

```powershell
Copy-Item .env.example .env
```

初始化数据库结构和种子数据：

```powershell
npm run migration:run
```

验证标签种子数据：

```powershell
npm run seed:verify:tags
```

验证诊所种子数据：

```powershell
npm run seed:verify:clinics
```

开发模式启动：

```powershell
npm run start:dev
```

启动后可访问：

- 健康检查：`http://localhost:3000/api/v1/health`
- Swagger 文档：`http://localhost:3000/api-docs`

### 5. 打开前端小程序工程

在微信开发者工具中打开目录：

```text
D:\codeSpace\petMed\frontend
```

当前小程序已包含这些基础页面：

- 首页
- 搜索
- 地图
- 我的
- 诊所详情
- 评价页

### 6. 更多配置说明

详细环境变量说明见：

- [本地环境配置说明](docs/本地环境配置说明.md)

---

## 🐳 容器启动

当前推荐使用 `podman compose`：

```powershell
podman compose up -d
```

初始化数据库结构：

```powershell
cd backend
npm run migration:run
```

验证标签种子数据：

```powershell
npm run seed:verify:tags
```

验证诊所种子数据：

```powershell
npm run seed:verify:clinics
```

查看日志：

```powershell
podman compose logs -f
```

停止服务：

```powershell
podman compose down
```

### 服务说明

- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
- **Backend API**: `localhost:3000`
- **Prometheus**: `localhost:9090`
- **Alertmanager**: `localhost:9093`
- **Grafana**: `localhost:3001`
- **Nginx**: `localhost:80`

启动后可访问 Swagger 文档：

- `http://localhost:3000/api-docs`

启动后也可以访问监控页面：

- Prometheus 指标页：`http://localhost:9090`
- Alertmanager：`http://localhost:9093`
- Grafana：`http://localhost:3001`
- Backend 指标端点：`http://localhost:3000/metrics`

Grafana 默认登录信息来自根目录 `.env`：

```env
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin123456
```

当前已经预置：

- Prometheus 数据源
- Loki 日志数据源
- `PetMed Backend Overview` 仪表盘
- `PetMed Production Observability` 仪表盘
- 核心 API 面板：QPS、错误率、P95 响应时间、按接口分组的请求/错误趋势
- 日志检索面板：backend / nginx 日志流、错误日志数、日志量趋势
- Prometheus 告警规则：服务不可用、5xx 错误率过高、P95 响应时间过慢
- Alertmanager 本地聚合页，可直接查看 firing / resolved alerts

说明：

- 当前 `docker-compose.yml` 已按本地 `podman` 环境校准
- 当前 PostgreSQL 镜像使用 `postgis/postgis:16-3.4`
- 当前 Redis 镜像使用 `redis:7-alpine`

### Staging 部署

如果要启动可验收的 staging 环境，请使用单独的部署配置：

```powershell
Copy-Item .env.staging.example .env.staging
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d --build
```

这套配置会使用生产镜像、自动执行 migrations，并通过 Nginx 暴露统一入口。

同时会启动完整的可观测性链路：

- Prometheus：性能指标
- Alertmanager：告警聚合
- Loki：日志存储
- Promtail：日志采集
- Grafana：统一查询指标和日志

如果要让小程序 `trial / release` 环境直接访问 staging / 生产 API，还需要继续完成：

- 域名解析
- HTTPS 证书放置到 `nginx/ssl/`
- 微信公众平台合法请求域名配置
- 小程序 API 域名更新

详细步骤见：

- [Staging部署说明](docs/Staging部署说明.md)
- [域名与HTTPS配置说明](docs/域名与HTTPS配置说明.md)
- [生产日志与监控说明](docs/生产日志与监控说明.md)

---

## 📁 项目结构

```
pet-clinic-recommendation/
├── backend/                    # 后端项目（NestJS）
│   ├── src/
│   │   ├── common/            # 公共常量与共享能力
│   │   ├── config/            # 应用配置
│   │   ├── database/          # TypeORM data source / migrations
│   │   ├── modules/           # 业务模块
│   │   ├── tasks/             # 定时任务目录（预留）
│   │   └── main.ts
│   ├── .env.example
│   └── package.json
├── frontend/                   # 前端项目（微信小程序）
│   ├── pages/
│   ├── utils/
│   ├── app.js
│   ├── app.json
│   └── project.config.json
├── nginx/                      # Nginx配置
│   ├── nginx.conf
│   └── ssl/
├── database/                   # 数据库参考脚本
│   └── init.sql
├── docs/                       # 文档
│   ├── PRD v1.1.md
│   ├── 技术方案 v1.1.md
│   ├── API接口文档 v1.2.md
│   ├── 标签体系设计说明 v2.0.md
│   └── 标签UI与排序算法设计 v2.0.md
├── docker-compose.yml
└── README.md
```

---

## 🔧 核心功能

### 1. 四层标签体系

```
L1: 用户决策层 (12个标签)
    ├─ Trust: 不乱开药、不过度检查、解释清楚病情、没有隐性收费
    ├─ Value: 价格透明、基础诊疗便宜、不强推高价项目、检查合理收费
    └─ Experience: 医生态度好、对宠物耐心、环境干净、响应快

L2: 医疗能力层 (11个标签，V1暂不启用)
    ├─ Capability: 猫专科、狗外科、皮肤病专长、骨科能力、急诊能力
    └─ Infrastructure: 有DR/X光、有B超、可做手术、可住院、有化验室

L3: 风险标签层 (5个标签)
    └─ Risk: 有价格争议记录、有过医疗纠纷、过度推荐手术嫌疑、用户投诉较多

L4: 传播标签层 (4个标签，系统推断)
    └─ Social: 被推荐次数高、回头客多、熟人推荐率高、本地口碑好
```

### 2. 三层情绪分流UI

```
第一层：快速情绪判断
    👍 很满意 / 😐 一般 / 👎 不满意

第二层：原因选择（根据情绪展示不同标签池）
    最多选3个

第三层：补充标签（可选）
    最多选2个
```

### 3. 智能排序算法

```
综合分数 = TrustScore × 0.45 
         + ValueScore × 0.25 
         + ExperienceScore × 0.15 
         + SocialProof × 0.15 
         - RiskPenalty
```

**防刷机制：**
- 用户去重：第1次1.0，第2次0.3，第3次0.1
- 时间衰减：30天1.0，60天0.7，90天0.4
- 交叉验证：≥2个独立用户才生效

---

## 📊 API文档

完整的API文档请查看：[API接口文档 v1.2.md](docs/API接口文档%20v1.2.md)

### 主要接口

| 接口 | 方法 | 说明 |
|-----|------|------|
| `/auth/login` | POST | 微信登录 |
| `/clinics/nearby` | GET | 获取附近诊所列表（PostGIS地理查询） |
| `/clinics/:id` | GET | 获取诊所详情 |
| `/tags` | GET | 获取标签列表 |
| `/tags/submit` | POST | 提交标签 |
| `/orders` | POST | 创建预约 |

### Swagger文档

当前 Swagger 已接入，默认地址为 `http://localhost:3000/api-docs`

---

## 🧪 测试

### 后端测试

```bash
cd backend

# 单元测试
npm run test

# 测试覆盖率
npm run test:cov

# E2E测试
npm run test:e2e
```

---

## 📈 性能指标

| 指标 | 目标值 |
|-----|--------|
| API响应时间 | <300ms |
| 数据库查询时间 | <100ms |
| Redis命中率 | >80% |
| 并发支持 | 500 QPS |

---

## 🔐 安全措施

- ✅ HTTPS强制加密
- ✅ JWT认证
- ✅ SQL注入防护（ORM参数化查询）
- ✅ XSS防护（输入过滤）
- ✅ 限流控制（Redis）
- ✅ 异常行为检测

---

## 📝 开发规范

### Git提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

### 代码规范

- ESLint + Prettier
- TypeScript严格模式
- 单元测试覆盖率 > 80%

---

## 🗺️ 版本规划

### V1.0（当前，2周开发）
- ✅ L1标签层（用户决策层）
- ✅ 三层情绪分流UI
- ✅ 基础排序算法
- ✅ 防刷机制（三层）
- ✅ 轻预约功能

### V1.5（1个月后）
- ⏳ L3/L4标签层启用
- ⏳ 系统推断引擎
- ⏳ 风险检测引擎
- ⏳ 标签生命周期管理

### V2.0（3个月后）
- ⏳ L2标签层启用
- ⏳ 精准推荐系统
- ⏳ 城市级医疗画像
- ⏳ 多城市支持

### V3.0（6个月后）
- ⏳ 成为"宠物医疗的信用地图"
- ⏳ 行业标准制定者
- ⏳ 转诊功能
- ⏳ 诊所端独立APP

---

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

### 贡献步骤

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交Pull Request

---

## 📄 许可证

本项目采用“仅限学习、禁止商用”的自定义许可证。

查看 [LICENSE](LICENSE) 获取完整条款。

---

## 👥 团队

- **产品经理**: [@yourname](https://github.com/yourname)
- **后端开发**: [@yourname](https://github.com/yourname)
- **前端开发**: [@yourname](https://github.com/yourname)

---

## 📞 联系我们

- 邮箱: your-email@example.com
- 微信: your-wechat-id
- 官网: https://yourwebsite.com

---

## 🙏 致谢

感谢所有为这个项目做出贡献的人！

---

## ⭐ Star History

如果这个项目对你有帮助，请给我们一个Star！

[![Star History Chart](https://api.star-history.com/svg?repos=yourname/pet-clinic-recommendation&type=Date)](https://star-history.com/#yourname/pet-clinic-recommendation&Date)

---

**Built with ❤️ by Pet Clinic Recommendation Team**
