# GitHub 仓库发布说明

## 目标

这份文档用于整理仓库对外展示时最重要的几项信息：

- GitHub About
- Topics
- 首页展示重点
- 发布时的最小动作

当前环境里没有 `gh` CLI，所以没有直接把这些字段写到 GitHub 仓库设置里。

但下面的内容已经整理成可直接复制版本。

## 1. 推荐 About

推荐直接使用这条：

```text
宠物诊所口碑推荐小程序 MVP，包含微信小程序前端、NestJS 后端、评价聚合、防刷排序、Redis 缓存和 staging 部署配置。
```

如果你想更偏工程一点，也可以用这条：

```text
微信小程序 + NestJS 宠物诊所推荐 MVP，包含标签评价、轻预约、排序聚合、可观测性和 staging 部署脚手架。
```

## 2. 推荐 Website

如果 GitHub 仓库里要填 Website，建议先不填官网，优先放文档入口：

```text
https://github.com/jihongxing/pet-clinic-recommendation#readme
```

如果后面有真实演示站或提审说明页，再替换。

## 3. 推荐 Topics

推荐这一组：

```text
wechat-mini-program
nestjs
typescript
postgresql
redis
typeorm
grafana
prometheus
loki
pet-health
```

如果你想更偏产品语义，也可以替换其中 2 到 3 个为：

```text
pet-clinic
reputation-system
miniapp
```

## 4. README 首页展示重点

当前 README 首页已经收口到这几个重点：

- 项目是什么
- 当前做到什么程度
- 怎么本地跑起来
- 怎么拉起 staging
- 域名 / HTTPS / 可观测性 / 提审文档在哪
- 学习用途、禁止商用

这比“所有设计文档堆在首页”要更像一个能对外看的仓库。

## 5. 建议手动补的 GitHub 设置

建议你在 GitHub 仓库页面手动补这些：

1. About
2. Website
3. Topics
4. Social preview 图

### Social preview 建议

可以考虑用：

- 首页列表页截图
- 诊所详情页截图
- `miniapp-prototype.html` 的局部截图

要求只有一个：一眼看出这是“宠物诊所推荐小程序”，不要放纯代码截图。

## 6. 发布前最小检查

对外展示前，至少确认：

1. README 顶部没有 `yourname`、`your-email` 这类占位文本
2. LICENSE 与 README 口径一致
3. `.env`、证书、日志、`node_modules` 没有入库
4. 首页第一屏能解释“这是什么项目”
5. About / Topics 和 README 说的是一回事
