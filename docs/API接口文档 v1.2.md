# API接口文档 v1.2

> **基础URL**: `https://api.yourapp.com/api/v1`
> 
> **认证方式**: JWT Token (Header: `Authorization: Bearer <token>`)

---

## 目录

- [1. 用户相关](#1-用户相关)
- [2. 诊所相关](#2-诊所相关)
- [3. 标签相关](#3-标签相关)
- [4. 预约相关](#4-预约相关)
- [5. 通用响应格式](#5-通用响应格式)
- [6. 错误码说明](#6-错误码说明)

---

## 1. 用户相关

### 1.1 微信登录

**接口**: `POST /auth/login`

**描述**: 使用微信code换取token

**请求参数**:
```json
{
  "code": "string  // 微信登录code（必填）"
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "openid": "oXXXX",
      "nickname": "用户昵称",
      "avatar": "https://...",
      "city": "北京",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

### 1.2 获取用户信息

**接口**: `GET /user/profile`

**描述**: 获取当前登录用户信息

**请求头**:
```
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "nickname": "用户昵称",
    "avatar": "https://...",
    "city": "北京",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 2. 诊所相关

### 2.1 获取附近诊所列表

**接口**: `GET /clinics/nearby`

**描述**: 根据位置和筛选条件获取附近诊所列表

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| lat | number | 是 | 纬度 |
| lng | number | 是 | 经度 |
| radius | number | 否 | 半径（米），默认3000，可选：3000/10000/20000 |
| sortType | string | 否 | 排序类型：reputation（口碑优先）/price（性价比优先），默认reputation |
| tagIds | string | 否 | 标签ID列表，逗号分隔，如："1,2,3" |
| city | string | 是 | 城市名称 |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20，最大50 |

**请求示例**:
```
GET /clinics/nearby?lat=39.9075&lng=116.4574&radius=3000&sortType=reputation&city=北京&page=1&pageSize=20
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "爱宠动物医院",
        "address": "北京市朝阳区建国路88号",
        "distance": 1234,  // 距离（米）
        "lat": 39.9075,
        "lng": 116.4574,
        "phone": "010-12345678",
        "businessHours": "周一至周日 9:00-21:00",
        "reputationScore": 85.5,
        "priceScore": 78.3,
        "confidenceFactor": 0.85,
        "topTags": [  // 最热门3个标签
          {
            "id": 1,
            "name": "不乱开药",
            "count": 23,
            "category": "trust"
          },
          {
            "id": 5,
            "name": "价格透明",
            "count": 18,
            "category": "value"
          },
          {
            "id": 9,
            "name": "医生态度好",
            "count": 15,
            "category": "experience"
          }
        ],
        "totalTagCount": 56,  // 总标签数
        "totalUsers": 32,  // 总用户数
        "isClaimed": false  // 是否已认领
      }
    ],
    "total": 15,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### 2.2 获取诊所详情

**接口**: `GET /clinics/:id`

**描述**: 获取诊所详细信息

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 诊所ID |

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| lat | number | 否 | 纬度（用于计算距离） |
| lng | number | 否 | 经度（用于计算距离） |

**请求示例**:
```
GET /clinics/1?lat=39.9075&lng=116.4574
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "name": "爱宠动物医院",
    "address": "北京市朝阳区建国路88号",
    "lat": 39.9075,
    "lng": 116.4574,
    "distance": 1234,
    "phone": "010-12345678",
    "wechat": "aichong_hospital",
    "businessHours": "周一至周日 9:00-21:00",
    "city": "北京",
    "district": "朝阳区",
    "scores": {
      "trust": 85.5,
      "value": 78.3,
      "experience": 82.1,
      "social": 75.0,
      "riskPenalty": 0,
      "reputation": 85.5,
      "price": 78.3,
      "confidenceFactor": 0.85
    },
    "tags": {
      "trust": [  // 信任类标签
        {
          "id": 1,
          "name": "不乱开药",
          "count": 23,
          "uniqueUsers": 20,
          "status": "stable",
          "displayWeight": 1.2
        },
        {
          "id": 2,
          "name": "不过度检查",
          "count": 18,
          "uniqueUsers": 16,
          "status": "verified",
          "displayWeight": 1.0
        }
      ],
      "value": [  // 性价比类标签
        {
          "id": 5,
          "name": "价格透明",
          "count": 18,
          "uniqueUsers": 15,
          "status": "verified",
          "displayWeight": 1.0
        }
      ],
      "experience": [  // 体验类标签
        {
          "id": 9,
          "name": "医生态度好",
          "count": 15,
          "uniqueUsers": 13,
          "status": "verified",
          "displayWeight": 1.0
        }
      ],
      "social": [  // 社交传播类标签
        {
          "id": 30,
          "name": "回头客多",
          "count": 12,
          "uniqueUsers": 0,  // 系统推断标签无用户数
          "status": "verified",
          "displayWeight": 1.0
        }
      ],
      "risk": []  // 风险标签（如果有）
    },
    "stats": {
      "totalUsers": 32,
      "totalOrders": 45,
      "confirmedOrders": 38,
      "repeatRate": 0.35  // 回头客比例
    },
    "isClaimed": false,
    "hasEvaluated": false  // 当前用户是否已评价（需登录）
  }
}
```

---

## 3. 标签相关

### 3.1 获取所有标签

**接口**: `GET /tags`

**描述**: 获取标签列表（按层级和分类组织）

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| layer | string | 否 | 标签层级：L1/L2/L3/L4 |
| userSelectable | boolean | 否 | 是否仅返回用户可选标签，默认false |

**请求示例**:
```
GET /tags?layer=L1&userSelectable=true
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "L1": {
      "trust": [
        {
          "id": 1,
          "name": "不乱开药",
          "weight": 1.0,
          "sortOrder": 1
        },
        {
          "id": 2,
          "name": "不过度检查",
          "weight": 1.0,
          "sortOrder": 2
        }
      ],
      "value": [
        {
          "id": 5,
          "name": "价格透明",
          "weight": 1.0,
          "sortOrder": 5
        }
      ],
      "experience": [
        {
          "id": 9,
          "name": "医生态度好",
          "weight": 1.0,
          "sortOrder": 9
        }
      ]
    }
  }
}
```

---

### 3.2 提交标签（打标签）

**接口**: `POST /tags/submit`

**描述**: 用户为诊所打标签

**请求头**:
```
Authorization: Bearer <token>
```

**请求参数**:
```json
{
  "clinicId": 1,  // 诊所ID（必填）
  "emotion": "satisfied",  // 情绪：satisfied/neutral/unsatisfied（必填）
  "tagIds": [1, 5, 9],  // 标签ID列表（必填，最多3个）
  "extraTagIds": [30],  // 补充标签ID列表（可选，最多2个）
  "source": "order",  // 来源：order/normal（可选，默认normal）
  "reviewText": "医生解释得很细，回家后的护理建议也讲清楚了。"  // 可选文字说明，最多500字，只留存不参与排序
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "感谢您的反馈！",
  "data": {
    "success": true,
    "weight": 1.0,  // 本次评价权重
    "userWeight": 1.0  // 用户权重
  }
}
```

**错误响应示例**:
```json
{
  "code": 40001,
  "message": "您已经为该诊所打过标签",
  "data": null
}
```

---

### 3.3 获取标签选择配置

**接口**: `GET /tags/selection-config`

**描述**: 获取标签选择页面的配置（根据情绪返回不同标签池）

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| emotion | string | 是 | 情绪：satisfied/neutral/unsatisfied |

**请求示例**:
```
GET /tags/selection-config?emotion=satisfied
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "emotion": "satisfied",
    "title": "请选择满意的原因（最多3个）",
    "tags": [
      {
        "id": 1,
        "name": "医生很专业",
        "mappedTagId": 1,  // 映射到的实际标签ID
        "mappedTagName": "不乱开药",
        "category": "trust"
      },
      {
        "id": 2,
        "name": "价格合理",
        "mappedTagId": 5,
        "mappedTagName": "价格透明",
        "category": "value"
      },
      {
        "id": 3,
        "name": "解释清楚",
        "mappedTagId": 3,
        "mappedTagName": "解释清楚病情",
        "category": "trust"
      },
      {
        "id": 4,
        "name": "不乱推荐检查",
        "mappedTagId": 2,
        "mappedTagName": "不过度检查",
        "category": "trust"
      },
      {
        "id": 5,
        "name": "对宠物很耐心",
        "mappedTagId": 10,
        "mappedTagName": "对宠物耐心",
        "category": "experience"
      },
      {
        "id": 6,
        "name": "环境干净",
        "mappedTagId": 11,
        "mappedTagName": "环境干净",
        "category": "experience"
      }
    ],
    "extraTags": [  // 补充标签
      {
        "id": 101,
        "name": "猫更友好",
        "weight": 0.3
      },
      {
        "id": 102,
        "name": "狗更友好",
        "weight": 0.3
      }
    ],
    "limits": {
      "minSelect": 1,
      "maxSelect": 3,
      "maxExtra": 2
    }
  }
}
```

---

## 4. 预约相关

### 4.1 创建预约记录

**接口**: `POST /orders`

**描述**: 用户点击预约（记录行为）

**请求头**:
```
Authorization: Bearer <token>
```

**请求参数**:
```json
{
  "clinicId": 1,  // 诊所ID（必填）
  "contactType": "phone"  // 联系方式：phone/wechat（必填）
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "orderId": 123,
    "clinicId": 1,
    "contactType": "phone",
    "contactInfo": "010-12345678",  // 电话号码或微信号
    "createdAt": "2024-01-01T10:00:00.000Z"
  }
}
```

---

### 4.2 获取用户预约历史

**接口**: `GET /orders/my`

**描述**: 获取当前用户的预约历史

**请求头**:
```
Authorization: Bearer <token>
```

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| status | string | 否 | 状态筛选：clicked/confirmed |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20 |

**请求示例**:
```
GET /orders/my?status=clicked&page=1&pageSize=20
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 123,
        "clinic": {
          "id": 1,
          "name": "爱宠动物医院",
          "address": "北京市朝阳区建国路88号",
          "phone": "010-12345678"
        },
        "status": "clicked",
        "contactType": "phone",
        "createdAt": "2024-01-01T10:00:00.000Z",
        "confirmedAt": null,
        "canEvaluate": true,  // 是否可以评价
        "hasEvaluated": false,  // 是否已评价
        "daysSinceOrder": 2  // 距离预约天数
      }
    ],
    "total": 5,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### 4.3 确认就诊

**接口**: `POST /orders/:id/confirm-visit`

**描述**: 用户确认是否已就诊（24小时后提醒）

**请求头**:
```
Authorization: Bearer <token>
```

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 预约ID |

**请求参数**:
```json
{
  "visited": true  // 是否已就诊（必填）
}
```

**响应示例（已就诊）**:
```json
{
  "code": 0,
  "message": "确认成功",
  "data": {
    "orderId": 123,
    "status": "confirmed",
    "confirmedAt": "2024-01-03T15:30:00.000Z",
    "shouldSubmitTag": true,  // 是否应该提交标签
    "clinicId": 1
  }
}
```

**响应示例（未就诊）**:
```json
{
  "code": 0,
  "message": "已记录",
  "data": {
    "orderId": 123,
    "status": "cancelled",
    "shouldSubmitTag": false
  }
}
```

---

## 5. 诊所回应相关

### 5.1 提交诊所回应

**接口**: `POST /clinics/:id/responses`

**描述**: 诊所对标签进行回应（需认领）

**请求头**:
```
Authorization: Bearer <clinic_token>
```

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 诊所ID |

**请求参数**:
```json
{
  "tagId": 1,  // 标签ID（必填）
  "responseText": "我们所有收费项目均在前台公示，如有疑问可联系客服核实。"  // 回应内容（必填，最多200字）
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "提交成功，等待审核",
  "data": {
    "responseId": 1,
    "status": "pending",
    "createdAt": "2024-01-03T15:30:00.000Z"
  }
}
```

---

### 5.2 获取诊所回应列表

**接口**: `GET /clinics/:id/responses`

**描述**: 获取诊所的标签回应列表

**路径参数**:
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 诊所ID |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "responses": [
      {
        "id": 1,
        "tagId": 1,
        "tagName": "乱收费",
        "responseText": "我们所有收费项目均在前台公示，如有疑问可联系客服核实。",
        "status": "approved",
        "createdAt": "2024-01-03T15:30:00.000Z",
        "approvedAt": "2024-01-03T16:00:00.000Z"
      }
    ]
  }
}
```

---

## 6. 监控相关

### 6.1 获取监控指标

**接口**: `GET /metrics`

**描述**: Prometheus指标端点（无需认证）

**响应格式**: Prometheus文本格式

**响应示例**:
```
# HELP api_requests_total Total number of API requests
# TYPE api_requests_total counter
api_requests_total{method="GET",endpoint="/clinics/nearby",status="200"} 1234

# HELP api_response_time_seconds API response time in seconds
# TYPE api_response_time_seconds histogram
api_response_time_seconds_bucket{method="GET",endpoint="/clinics/nearby",le="0.1"} 800
api_response_time_seconds_bucket{method="GET",endpoint="/clinics/nearby",le="0.5"} 1200
```

---

## 7. 通用响应格式

### 7.1 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    // 响应数据
  }
}
```

### 7.2 错误响应

```json
{
  "code": 40001,
  "message": "错误描述",
  "data": null
}
```

---

## 8. 错误码说明

| 错误码 | 说明 |
|-------|------|
| 0 | 成功 |
| 10001 | 参数错误 |
| 10002 | 缺少必填参数 |
| 10003 | 参数格式错误 |
| 20001 | 未登录 |
| 20002 | Token无效 |
| 20003 | Token过期 |
| 30001 | 资源不存在 |
| 30002 | 诊所不存在 |
| 30003 | 标签不存在 |
| 40001 | 已经评价过该诊所 |
| 40002 | 评价时间已过期 |
| 40003 | 未预约不能评价 |
| 40004 | 标签数量超过限制 |
| 40005 | 异常行为检测 |
| 40006 | 诊所未认领 |
| 40007 | 回应内容过长 |
| 50001 | 服务器内部错误 |
| 50002 | 数据库错误 |

---

## 9. 接口调用示例

### 9.1 完整的打标签流程

```javascript
// 1. 用户登录
const loginRes = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: 'wx_code_xxx' })
});
const { data: { token } } = await loginRes.json();

// 2. 获取诊所详情
const clinicRes = await fetch('/api/v1/clinics/1?lat=39.9075&lng=116.4574', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data: clinic } = await clinicRes.json();

// 3. 创建预约
const orderRes = await fetch('/api/v1/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    clinicId: 1,
    contactType: 'phone'
  })
});

// 4. 确认就诊（24小时后）
const confirmRes = await fetch('/api/v1/orders/123/confirm-visit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ visited: true })
});
const { data: confirmData } = await confirmRes.json();

// 如果已就诊，跳转到标签提交页面
if (confirmData.shouldSubmitTag) {
  // 跳转到标签选择页面
}

// 5. 获取标签选择配置
const configRes = await fetch('/api/v1/tags/selection-config?emotion=satisfied', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data: config } = await configRes.json();

// 6. 提交标签
const submitRes = await fetch('/api/v1/tags/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    clinicId: 1,
    emotion: 'satisfied',
    tagIds: [1, 5, 9],
    extraTagIds: [30],
    source: 'order'
  })
});
```

---

## 10. 接口性能要求

| 接口 | 响应时间要求 | QPS要求 |
|-----|------------|---------|
| 登录 | <500ms | 100 |
| 附近诊所列表 | <300ms | 500 |
| 诊所详情 | <200ms | 1000 |
| 获取标签 | <100ms | 1000 |
| 提交标签 | <500ms | 200 |
| 创建预约 | <300ms | 200 |

---

## 11. 接口限流规则

| 接口类型 | 限流规则 |
|---------|---------|
| 读接口 | 100次/分钟/用户 |
| 写接口 | 20次/分钟/用户 |
| 登录接口 | 10次/分钟/IP |
| 提交标签 | 5次/小时/用户 |

---

## 12. 接口版本管理

- 当前版本：v1.3
- 版本路径：`/api/v1/`
- 版本策略：向后兼容，重大变更升级版本号

**v1.3 更新内容（2024-05-11）：**
- 新增就诊确认接口（`POST /orders/:id/confirm-visit`）
- 新增诊所回应相关接口
- 新增监控指标接口（`GET /metrics`）
- 优化标签提交流程

---

## 附录：Swagger文档

完整的Swagger文档地址：`https://api.yourapp.com/api-docs`

可以在线测试所有接口。

---

## 13. V2 能力档案接口补充

### 13.1 获取能力字典

**接口**: `GET /clinics/capability-definitions`

**说明**

- 返回按能力类型分组的能力字典
- 推荐页、后台能力管理页都会消费这个接口

**示例响应**

```json
{
  "services": [{ "id": 1, "code": "srv_outpatient", "name": "常规门诊", "type": "service", "sortOrder": 1, "isActive": true }],
  "specialties": [{ "id": 8, "code": "sp_cat", "name": "猫专科", "type": "specialty", "sortOrder": 1, "isActive": true }],
  "equipment": [{ "id": 15, "code": "eq_ultrasound", "name": "B超", "type": "equipment", "sortOrder": 1, "isActive": true }],
  "facilities": [{ "id": 21, "code": "fc_inpatient", "name": "可住院", "type": "facility", "sortOrder": 1, "isActive": true }],
  "speciesSupported": [{ "id": 26, "code": "species_cat", "name": "接诊猫", "type": "species_supported", "sortOrder": 1, "isActive": true }]
}
```

### 13.2 推荐提交新增能力字段

**接口**: `POST /clinic-submissions`

新增请求体字段：

```json
{
  "services": ["srv_outpatient", "srv_emergency"],
  "specialties": ["sp_cat"],
  "equipment": ["eq_ultrasound"],
  "facilities": ["fc_inpatient"],
  "speciesSupported": ["species_cat", "species_dog"],
  "capabilityNotes": "夜间有值班医生，B超建议提前预约"
}
```

### 13.3 诊所详情新增能力档案返回

**接口**: `GET /clinics/:id`

新增返回字段：

- `summary`
- `coverPhotoUrl`
- `galleryPhotos`
- `capabilityProfileStatus`
- `capabilities`

`capabilities` 结构：

```json
{
  "services": [{ "code": "srv_emergency", "name": "急诊接诊", "verificationStatus": "verified" }],
  "specialties": [{ "code": "sp_cat", "name": "猫专科", "verificationStatus": "verified" }],
  "equipment": [{ "code": "eq_ultrasound", "name": "B超", "verificationStatus": "verified" }],
  "facilities": [{ "code": "fc_inpatient", "name": "可住院", "verificationStatus": "verified" }],
  "speciesSupported": [{ "code": "species_cat", "name": "接诊猫", "verificationStatus": "verified" }],
  "highlights": ["猫专科", "B超"]
}
```

### 13.4 列表 / 搜索新增能力筛选

**接口**

- `GET /clinics/nearby`
- `GET /clinics/search`

新增查询参数：

- `serviceCodes`
- `specialtyCodes`
- `equipmentCodes`
- `facilityCodes`

示例：

```text
GET /clinics/search?keyword=望京&city=北京&specialtyCodes=sp_cat&equipmentCodes=eq_ultrasound
GET /clinics/nearby?lat=39.9075&lng=116.4574&radius=3000&city=北京&facilityCodes=fc_inpatient
```

### 13.5 后台能力管理接口

**诊所能力管理**

- `GET /admin/clinics/:id/capabilities`
- `PUT /admin/clinics/:id/capabilities`

`PUT` 请求体示例：

```json
{
  "items": [
    { "code": "sp_cat", "verificationStatus": "verified", "note": "门店海报与病例照片已核验" },
    { "code": "eq_ultrasound", "verificationStatus": "verified" },
    { "code": "fc_inpatient", "verificationStatus": "pending" }
  ]
}
```

**能力字典管理**

- `GET /admin/capability-definitions`
- `POST /admin/capability-definitions`
- `PATCH /admin/capability-definitions/:id`
- `DELETE /admin/capability-definitions/:id`
