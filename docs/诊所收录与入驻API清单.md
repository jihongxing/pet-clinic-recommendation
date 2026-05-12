# 诊所收录与入驻API清单

> 来源：基于 [诊所收录与入驻双链路设计稿](./诊所收录与入驻双链路设计稿.md) 拆解
> 目标：明确哪些接口已经存在，哪些接口需要新增，谁调用，返回什么

---

## 1. 已有接口，直接复用

| Method | Path | Actor | 用途 |
|---|---|---|---|
| `POST` | `/auth/login` | 用户 | 微信登录，获取用户 JWT |
| `POST` | `/auth/dev-token` | 开发/测试 | 签发用户或诊所开发令牌 |
| `POST` | `/clinic/login` | 诊所 | 诊所后台账号密码登录，获取诊所 JWT |
| `GET` | `/clinics/nearby` | 用户 | 列表页附近诊所 |
| `GET` | `/clinics/search` | 用户 | 搜索诊所 |
| `GET` | `/clinics/:id` | 用户 | 诊所详情 |
| `GET` | `/clinics/:id/responses` | 用户 | 诊所回应列表 |
| `POST` | `/clinics/:id/responses` | 诊所 | 提交诊所回应 |

---

## 2. 用户推荐 API

### 2.1 上传推荐图片

`POST /clinic-submissions/photos`

**Actor**: 用户 JWT

**用途**: 独立上传推荐诊所图片，返回可直接写入 `photos` 的图片 URL。

**Content-Type**: `multipart/form-data`

**表单字段**

- `file`: 图片文件，支持 `JPG / PNG / WebP`，最大 `5MB`

**返回**

```json
{
  "fileUrl": "https://api-staging.petmed.example.com/uploads/clinic-submissions/1715500000000-abcd1234.jpg",
  "fileName": "clinic-door.jpg",
  "mimeType": "image/jpeg",
  "size": 248193
}
```

**说明**

- 当前版本默认存到服务端本地 `uploads/clinic-submissions/` 目录。
- 推荐提交接口继续只接收 `photos` URL 列表，不和文件上传绑成一个大请求。

### 2.2 提交推荐

`POST /clinic-submissions`

**Actor**: 用户 JWT

**用途**: 提交新诊所、补充已有诊所信息、纠错。

**请求体**

```json
{
  "submissionType": "new",
  "name": "爱宠动物医院",
  "address": "北京市朝阳区xx路xx号",
  "lat": 39.9,
  "lng": 116.4,
  "phone": "010-12345678",
  "businessHours": "09:00-21:00",
  "photos": ["https://..."],
  "reason": "附近没有这家诊所的完整信息，想补充一下。"
}
```

**返回**

```json
{
  "id": 1001,
  "status": "pending_review",
  "matchedClinics": []
}
```

### 2.3 提交前匹配候选

`GET /clinic-submissions/matches`

**Actor**: 用户 JWT

**用途**: 在提交前给出可能重复的候选诊所。

**查询参数**: `name`, `address`, `city`, `district`, `lat`, `lng`, `phone`

**返回**

```json
{
  "matches": [
    {
      "clinicId": 12,
      "name": "爱宠动物医院",
      "address": "北京市朝阳区xx路xx号",
      "city": "北京",
      "district": "朝阳区",
      "phone": "010-12345678",
      "businessHours": "09:00-21:00",
      "distance": 120,
      "matchScore": 95,
      "matchReasons": ["名称完全一致", "联系电话一致", "距离非常近"]
    }
  ]
}
```

### 2.4 我的推荐列表

`GET /clinic-submissions/my`

**Actor**: 用户 JWT

**用途**: 查看自己提交过的推荐记录和状态。

**查询参数**: `status`, `page`, `pageSize`

**返回**

```json
{
  "list": [
    {
      "id": 1001,
      "submissionType": "new",
      "status": "pending_review",
      "clinicId": null,
      "matchedClinicId": null,
      "name": "爱宠动物医院",
      "address": "北京市朝阳区xx路xx号",
      "city": "北京市",
      "district": "朝阳区",
      "phone": "010-12345678",
      "reason": "附近没有这家诊所的完整信息，想补充一下。",
      "reviewNote": null,
      "createdAt": "2026-05-12T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

### 2.5 推荐详情

`GET /clinic-submissions/:id`

**Actor**: 用户 JWT 或审核员

**用途**: 查看推荐单详情、审核备注、候选诊所。

---

## 3. 诊所认领 API

### 3.1 发起认领

`POST /clinics/:id/claim-requests`

**Actor**: 用户 JWT（诊所负责人在小程序内登录后提交）

**用途**: 诊所负责人对已有诊所发起认领申请。

**请求体**

```json
{
  "applicantName": "张三",
  "applicantPhone": "13800000000",
  "proofMaterial": "营业执照 / 门头照片 / 其他说明"
}
```

**返回**

```json
{
  "id": 2001,
  "status": "pending"
}
```

### 3.2 我的认领申请

`GET /clinic-claim-requests/my`

**Actor**: 用户 JWT

**用途**: 查看当前账号提交过的认领申请。

**返回重点字段**

- `id`
- `clinicId`
- `clinicName`
- `status`
- `reviewNote`
- `reviewedAt`
- `createdAt`

### 3.3 认领申请详情

`GET /clinic-claim-requests/:id`

**Actor**: 用户 JWT 或审核员

**用途**: 查看申请状态、审核备注、审核时间。

**返回重点字段**

- `id`
- `clinicId`
- `clinicName`
- `applicantName`
- `applicantPhone`
- `proofMaterial`
- `status`
- `reviewNote`
- `reviewedAt`
- `createdAt`

---

## 4. 后台审核 API

### 4.0 后台登录与会话

`POST /admin/login`

**Actor**: 管理员用户名密码

**用途**: 登录审核后台，换取管理员 JWT。

`GET /admin/session`

**Actor**: 管理员 JWT

**用途**: 获取当前登录管理员信息，用于后台初始化会话。

### 4.1 推荐列表

`GET /admin/clinic-submissions`

**Actor**: 管理员 JWT

**查询参数**: `status`, `city`, `createdFrom`, `createdTo`, `page`, `pageSize`

**用途**: 审核队列列表。

**返回**

```json
{
  "list": [
    {
      "id": 1001,
      "submissionType": "new",
      "status": "pending_review",
      "clinicId": null,
      "matchedClinicId": null,
      "name": "爱宠动物医院",
      "address": "北京市朝阳区xx路xx号",
      "city": "北京",
      "district": "朝阳区",
      "phone": "010-12345678",
      "reason": "附近没有这家诊所的完整信息，想补充一下。",
      "reviewNote": null,
      "createdAt": "2026-05-12T10:00:00.000Z",
      "reviewedAt": null,
      "submitter": {
        "userId": 21,
        "nickname": "阿福家长",
        "city": "北京"
      },
      "reviewer": null,
      "linkedClinic": null,
      "matchedClinic": null,
      "potentialMatches": [
        {
          "clinicId": 12,
          "name": "爱宠动物医院望京店",
          "address": "北京市朝阳区yy路yy号",
          "distance": 120,
          "matchScore": 95,
          "matchReasons": ["名称完全一致", "联系电话一致", "距离非常近"]
        }
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

### 4.2 推荐详情

`GET /admin/clinic-submissions/:id`

**Actor**: 管理员 JWT

**用途**: 查看推荐详情、候选匹配和历史重复。

**返回**

```json
{
  "id": 1001,
  "submissionType": "new",
  "status": "pending_review",
  "clinicId": null,
  "matchedClinicId": null,
  "name": "爱宠动物医院",
  "address": "北京市朝阳区xx路xx号",
  "city": "北京",
  "district": "朝阳区",
  "lat": 39.9,
  "lng": 116.4,
  "phone": "010-12345678",
  "businessHours": "09:00-21:00",
  "photos": ["https://example.com/1.jpg"],
  "reason": "附近没有这家诊所的完整信息，想补充一下。",
  "reviewNote": "待人工核对",
  "createdAt": "2026-05-12T10:00:00.000Z",
  "updatedAt": "2026-05-12T10:30:00.000Z",
  "reviewedAt": null,
  "submitter": {
    "userId": 21,
    "nickname": "阿福家长",
    "city": "北京",
    "createdAt": "2026-05-01T10:00:00.000Z"
  },
  "reviewer": null,
  "linkedClinic": null,
  "matchedClinic": null,
  "potentialMatches": [],
  "historicalDuplicates": []
}
```

### 4.3 推荐审核

`POST /admin/clinic-submissions/:id/review`

**Actor**: 管理员 JWT

**请求体**

```json
{
  "action": "approved_new",
  "note": "资料完整，创建新诊所",
  "matchedClinicId": null
}
```

**action 取值**

- `approved_new`
- `merged`
- `need_info`
- `rejected`

**返回**

```json
{
  "id": 1001,
  "status": "approved_new",
  "clinicId": 88,
  "matchedClinicId": null,
  "reviewedAt": "2026-05-12T10:40:00.000Z",
  "reviewNote": "资料完整，创建新诊所",
  "reviewLogId": 501
}
```

### 4.4 推荐审核日志

`GET /admin/clinic-submissions/:id/review-logs`

**Actor**: 管理员 JWT

**用途**: 查看推荐单每次审核动作。

**响应示例**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "submissionId": 1001,
    "list": [
      {
        "id": 502,
        "action": "need_info",
        "beforeStatus": "pending_review",
        "afterStatus": "need_info",
        "note": "请补充门头照片",
        "createdAt": "2026-05-12T11:00:00.000Z",
        "reviewer": {
          "adminUserId": 902,
          "username": "senior_admin",
          "displayName": "资深审核员"
        }
      }
    ]
  }
}
```

### 4.5 认领列表

`GET /admin/claim-requests`

**Actor**: 管理员 JWT

**用途**: 查看待审核认领申请。

### 4.6 认领审核

`POST /admin/claim-requests/:id/review`

**Actor**: 管理员 JWT

**请求体**

```json
{
  "action": "approved",
  "note": "证照和联系人信息一致"
}
```

**action 取值**

- `approved`
- `rejected`

**说明**

- 当 `action=approved` 时，系统会创建或启用对应的 `clinic_account`。
- 如果是首次创建账号，审核备注里会追加后台登录用户名和初始密码。

---

## 5. 建议的后端返回字段

### 5.1 推荐单

- `id`
- `submissionType`
- `status`
- `name`
- `address`
- `lat`
- `lng`
- `phone`
- `reason`
- `matchedClinics`
- `reviewNote`
- `createdAt`
- `updatedAt`

### 5.2 认领单

- `id`
- `clinicId`
- `applicantName`
- `applicantPhone`
- `proofMaterial`
- `status`
- `reviewedAt`
- `createdAt`

### 5.3 审核日志

- `id`
- `reviewerId`
- `action`
- `beforeStatus`
- `afterStatus`
- `note`
- `createdAt`

---

## 6. 复用说明

- 用户推荐用新的 `clinic-submissions`，不要塞进 `clinics` 现有读接口。
- 认领沿用现有 `clinic_claim_request` 语义，只补 API。
- 审核后台 API 不要暴露给普通用户。
- 诊所回应继续复用现有 `/clinics/:id/responses`，前提是认领通过。
