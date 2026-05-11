# 域名与 HTTPS 配置说明

## 目标

`T6-06` 的交付不是“文档里说以后要上 HTTPS”，而是把 staging 环境真正收敛到可配置域名、可挂证书、可供微信小程序配置合法请求域名的状态。

当前仓库已经准备好：

- `docker-compose.staging.yml` 暴露 `80/443`
- `nginx/nginx.staging.conf.template` 按 `DOMAIN_NAME` 渲染
- `nginx/ssl/` 作为证书挂载目录
- `nginx/www/` 作为 ACME challenge webroot
- 小程序前端按 `develop / trial / release` 切换不同 API 域名

## 1. 准备域名

建议至少准备两个域名：

- `api-staging.petmed.example.com`
- `api.petmed.example.com`

其中：

- `trial` 环境对应 staging 域名
- `release` 环境对应正式域名

DNS 需要先把域名解析到部署服务器公网 IP。

## 2. 配置 staging 环境变量

复制模板：

```powershell
Copy-Item .env.staging.example .env.staging
```

至少确认这些字段：

```env
DOMAIN_NAME=api-staging.petmed.example.com
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
```

## 3. 准备证书

当前 Nginx 会默认读取：

```text
nginx/ssl/live/<DOMAIN_NAME>/fullchain.pem
nginx/ssl/live/<DOMAIN_NAME>/privkey.pem
```

例如：

```text
nginx/ssl/live/api-staging.petmed.example.com/fullchain.pem
nginx/ssl/live/api-staging.petmed.example.com/privkey.pem
```

如果你已经有证书，直接放进去即可。

如果你用 Let's Encrypt，可以使用 webroot 方式签发，challenge 目录已经预留为：

```text
nginx/www/.well-known/acme-challenge/
```

## 4. 启动 HTTPS 入口

```powershell
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d --build
```

启动后行为：

- `http://<DOMAIN_NAME>` 会跳转到 `https://<DOMAIN_NAME>`
- `http://<DOMAIN_NAME>/health` 保留给健康检查
- `https://<DOMAIN_NAME>/api/v1/*` 正式提供小程序接口

## 5. 微信小程序合法域名配置

在微信公众平台的小程序后台，至少配置：

- `request 合法域名`
- `uploadFile 合法域名`
- `downloadFile 合法域名`

当前项目后端 API 场景里，最关键的是：

```text
https://api-staging.petmed.example.com
https://api.petmed.example.com
```

注意：

- 必须是 `https`
- 不能是 IP
- 不能带路径，只填域名

## 6. 前端域名切换

当前小程序 API 域名配置在：

- [frontend/config/index.js](/D:/codeSpace/petMed/frontend/config/index.js:1)

默认约定：

- `develop` -> `http://localhost:3000/api/v1`
- `trial` -> `https://api-staging.petmed.example.com/api/v1`
- `release` -> `https://api.petmed.example.com/api/v1`

你只需要把示例域名替换成真实域名即可。

## 7. 验证清单

1. HTTP 重定向：

```powershell
curl -I http://api-staging.petmed.example.com
```

应该返回 `301` 到 `https://...`

2. HTTPS 健康检查：

```powershell
curl https://api-staging.petmed.example.com/health
```

3. API 前缀：

```powershell
curl https://api-staging.petmed.example.com/api/v1/health
```

4. 小程序 trial 包请求：

- `getApp().globalData.apiBaseUrl` 应该是 `https://api-staging.petmed.example.com/api/v1`

## 8. 当前边界

这次完成的是：

- 域名入口配置
- HTTPS 证书挂载约定
- Nginx 443 反向代理
- 小程序 API 域名切换
- 微信合法请求域名配置说明

还没覆盖的内容：

- 证书自动续期
- CDN / WAF
- 多地域或多实例负载均衡
