# SSL 证书目录说明

`T6-06` 默认使用 Nginx 直接终止 HTTPS。

请把证书按下面的目录结构放到这里：

```text
nginx/ssl/
└── live/
    └── <你的域名>/
        ├── fullchain.pem
        └── privkey.pem
```

例如：

```text
nginx/ssl/live/api-staging.petmed.example.com/fullchain.pem
nginx/ssl/live/api-staging.petmed.example.com/privkey.pem
```

当前 staging Nginx 模板会按 `DOMAIN_NAME` 自动读取这两个文件。
