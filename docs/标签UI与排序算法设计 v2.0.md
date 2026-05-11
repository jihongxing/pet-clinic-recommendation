# 标签UI与排序算法设计 v2.0

> **核心理念**：把"随意评论"变成"结构化判断选择"，把"谁会运营"变成"谁真的被反复验证"

---

## 一、为什么这两个模块是核心？

你现在已经不是在做：
- ❌ 推荐系统
- ❌ 点评系统

你在做的是：
- ✅ **结构化真实医疗反馈系统**

**关键点：**
1. **标签UI**：降低选择成本 + 防刷
2. **排序算法**：防刷 + 真实权重

---

## 二、标签UI设计（核心：3秒完成选择）

### 2.1 设计目标

你的目标不是"让用户表达更多"，而是：

> **让用户在3秒内做出可信选择**

---

### 2.2 标签交互原则（必须遵守）

#### ❌ 不要做：
- 自由输入长评论
- 多层筛选
- 复杂UI
- 类点评系统

#### ✔ 必须做：
- 点选
- 限制数量
- 场景化问题引导
- 情绪分流

---

### 2.3 推荐UI结构（就诊后弹窗）

#### 📍 触发时机

**方式1：主动触发**
- 用户点击"已就诊"按钮

**方式2：被动提醒**
- 预约后24小时推送服务通知
- 文案："您在【XX诊所】的就诊体验如何？"

---

#### 📦 UI结构（三层设计）

##### 🧠 第一层：快速情绪判断（必选1）

**标题**："这次就诊体验怎么样？"

**交互**：👉 用"按钮"，不用标签

```
┌─────────────────────────────────────────┐
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ 👍      │  │ 😐      │  │ 👎      │ │
│  │ 很满意  │  │ 一般    │  │ 不满意  │ │
│  └─────────┘  └─────────┘  └─────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**目的：**
- 快速分流
- 不同情绪进入不同标签池
- **这是防刷关键**

---

##### 🧠 第二层：原因选择（最多选3个）

**根据第一层选择，展示不同标签池：**

**如果 👍 很满意：**
```
┌─────────────────────────────────────────┐
│ 请选择满意的原因（最多3个）：            │
│                                         │
│ ☐ 医生很专业                            │
│ ☐ 价格合理                              │
│ ☐ 解释清楚                              │
│ ☐ 不乱推荐检查                          │
│ ☐ 对宠物很耐心                          │
│ ☐ 环境干净                              │
│                                         │
│         [取消]        [提交(1/3)]       │
└─────────────────────────────────────────┘
```

**如果 😐 一般：**
```
┌─────────────────────────────────────────┐
│ 哪些方面还可以改进？（最多3个）          │
│                                         │
│ ☐ 价格略高                              │
│ ☐ 等待时间长                            │
│ ☐ 沟通一般                              │
│ ☐ 检查项目多                            │
│ ☐ 环境一般                              │
│                                         │
│         [取消]        [提交(1/3)]       │
└─────────────────────────────────────────┘
```

**如果 👎 不满意：**
```
┌─────────────────────────────────────────┐
│ 遇到了什么问题？（最多3个）              │
│                                         │
│ ☐ 乱收费                                │
│ ☐ 过度检查                              │
│ ☐ 不专业                                │
│ ☐ 体验差                                │
│ ☐ 态度不好                              │
│ ☐ 强推高价项目                          │
│                                         │
│         [取消]        [提交(1/3)]       │
└─────────────────────────────────────────┘
```

**👉 核心设计点：**
- ❗ 不同情绪 → 不同标签池（防刷关键）
- 最多选3个，至少选1个
- 实时显示已选数量

---

##### 🧠 第三层：补充标签（可选）

```
┌─────────────────────────────────────────┐
│ 还有其他想补充的吗？（可选，最多2个）    │
│                                         │
│ ☐ 猫更友好                              │
│ ☐ 狗更友好                              │
│ ☐ 急诊不错                              │
│ ☐ 有停车位                              │
│ ☐ 交通方便                              │
│ ☐ 可以洗澡                              │
│                                         │
│         [跳过]        [完成]            │
└─────────────────────────────────────────┘
```

**说明：**
- 这一层可跳过
- 最多选2个
- 权重较低（0.3）

---

#### 标签映射到四层体系

| 用户选择 | 映射到标签层 | 权重 |
|---------|------------|------|
| 👍 + 医生很专业 | L1-Trust: 不乱开药 | 1.0 |
| 👍 + 价格合理 | L1-Value: 价格透明 | 1.0 |
| 👍 + 对宠物耐心 | L1-Experience: 对宠物耐心 | 1.0 |
| 😐 + 价格略高 | L1-Value: 基础诊疗便宜（负向） | 0.5 |
| 😐 + 等待时间长 | L1-Experience: 响应快（负向） | 0.5 |
| 👎 + 乱收费 | L3-Risk: 有价格争议记录 | 1.0 |
| 👎 + 过度检查 | L3-Risk: 过度推荐手术嫌疑 | 1.0 |

---

### 2.4 UI防刷设计（很重要）

#### 1️⃣ 限制频率
- 同一用户同一诊所：**只能一次评价**
- 数据库唯一索引强制约束

```sql
UNIQUE KEY uk_user_clinic (user_id, clinic_id)
```

---

#### 2️⃣ 不允许"全选"
- 第一层：必选1个
- 第二层：最多3个，至少1个
- 第三层：最多2个，可跳过

**前端验证：**
```javascript
// 第二层验证
if (selectedTags.length === 0) {
  showError('请至少选择1个原因');
  return;
}
if (selectedTags.length > 3) {
  showError('最多只能选择3个');
  return;
}
```

---

#### 3️⃣ 行为触发而不是主动评论
- 只能在"就诊后流程"出现
- 未预约用户不能直接打标签（或权重极低0.3）

**流程控制：**
```typescript
async function showTagDialog(userId: number, clinicId: number) {
  // 检查是否已评价
  const hasEvaluated = await checkEvaluation(userId, clinicId);
  if (hasEvaluated) {
    showMessage('您已经为这家诊所打过标签了');
    return;
  }
  
  // 检查是否有预约记录
  const order = await getOrder(userId, clinicId);
  if (!order) {
    showMessage('请先预约并就诊后再评价');
    return;
  }
  
  // 检查时间限制
  const daysSinceOrder = getDaysDiff(order.createdAt, new Date());
  if (daysSinceOrder > 30) {
    showMessage('评价时间已过期');
    return;
  }
  
  // 显示标签选择页
  showTagSelectionPage();
}
```

---

#### 4️⃣ 时间限制
- 预约后7天内有效（权重1.0）
- 7-30天内（权重0.7）
- 超过30天不再提醒

---

#### 5️⃣ 异常检测
- 同一设备短时间内多次评价 → 降权
- 评价模式高度相似 → 人工审核
- IP地址异常 → 标记

**异常检测逻辑：**
```typescript
async function detectAbnormal(userId: number, clinicId: number, tagIds: number[]) {
  // 1. 检查设备指纹
  const deviceId = getDeviceFingerprint();
  const recentEvals = await getRecentEvalsByDevice(deviceId, 3600); // 1小时内
  if (recentEvals.length > 5) {
    await markAsAbnormal(userId, 'device_frequency');
    return true;
  }
  
  // 2. 检查评价模式相似度
  const userHistory = await getUserEvalHistory(userId);
  const similarity = calculateSimilarity(userHistory, tagIds);
  if (similarity > 0.9 && userHistory.length > 3) {
    await markAsAbnormal(userId, 'pattern_similarity');
    return true;
  }
  
  // 3. 检查IP异常
  const ip = getUserIP();
  const ipEvals = await getEvalsByIP(ip, 86400); // 24小时内
  if (ipEvals.length > 10) {
    await markAsAbnormal(userId, 'ip_frequency');
    return true;
  }
  
  return false;
}
```

---

### 2.5 目的总结

> **把"评论系统"变成"结构化反馈系统"**

**不是让用户表达更多，而是：**
- 让用户在3秒内做出可信选择
- 通过情绪分流防止刷标签
- 通过限制数量提高质量
- 通过行为触发保证真实性

---

## 三、排序算法 v2（防刷 + 真实权重）

### 3.1 核心问题

> **怎么让真实好诊所排前面，而不是会运营的诊所排前面**

---

### 3.2 算法底线（必须满足）

排序必须满足：
- ✔ 不能被单一变量操控
- ✔ 不能被付费影响
- ✔ 要抗小样本波动
- ✔ 要强调"长期一致性"

---

### 3.3 排序模型 v2（核心公式）

```
Score = TrustScore × 0.45 
      + ValueScore × 0.25 
      + ExperienceScore × 0.15 
      + SocialProof × 0.15 
      - RiskPenalty
```

**权重调整说明：**
- Trust从0.5降至0.45（防止单一维度操控）
- Social从0.1提升至0.15（强调长期一致性）

---

### 3.4 每个模块怎么计算（可实现）

#### 🟢 TrustScore（信任）

**核心指标：**
- 不乱开药比例
- 不过度检查比例
- 满意率

**计算公式：**
```
Trust = (正向标签数 - 负向标签数) / 总标签数 × 用户去重权重 × 100
```

**👉 加关键机制：用户去重权重（防刷）**

| 用户行为 | 权重 |
|---------|------|
| 第1次评价 | 1.0 |
| 第2次评价 | 0.3 |
| 第3次及以上 | 0.1 |

**示例：**
```
诊所A：10个用户，每人1次评价，8个正向
TrustScore = (8 - 2) / 10 × 1.0 × 100 = 60分

诊所B：3个用户，每人多次评价，20个正向
TrustScore = (20 - 0) / 20 × 0.3 × 100 = 30分

→ 诊所A排名更高（真实用户更多）
```

---

#### 🟡 ValueScore（性价比）

**核心指标：**
- 价格透明
- 基础治疗好评

**计算公式：**
```
Value = 性价比标签加权数 / 总标签数 × 用户独立性系数 × 100
```

**防刷关键：必须来自"不同用户 + 不同时间"**

**用户独立性系数：**
```
独立性系数 = MIN(1.0, 独立用户数 / 5)
```

**示例：**
```
诊所A：10个性价比标签，来自8个独立用户
独立性系数 = MIN(1.0, 8/5) = 1.0
ValueScore = 10 / 15 × 1.0 × 100 = 66.7分

诊所B：20个性价比标签，来自3个独立用户
独立性系数 = MIN(1.0, 3/5) = 0.6
ValueScore = 20 / 25 × 0.6 × 100 = 48分
```

---

#### 🔵 ExperienceScore（体验）

**核心指标：**
- 医生态度
- 等待时间
- 环境

**计算公式：**
```
Experience = 体验标签加权数 / 总标签数 × 100
```

**👉 权重最低（防主观干扰）**

---

#### 🟣 SocialProof（社会证明）

**不是"点赞数"，而是：**
- 被推荐次数
- 回头客比例
- 多用户重复出现

**计算公式：**
```
SocialProof = (回头客比例 × 0.5 + 推荐次数系数 × 0.3 + 用户活跃度 × 0.2) × 100
```

**防刷核心：同一来源链权重衰减**
```
第1个推荐权重 = 1.0
第2个推荐权重 = 0.5
第3个及以上 = 0.2
```

---

#### 🔴 RiskPenalty（风险惩罚，关键）

**这是你整个系统护城河。**

**风险信号：**
- 负面标签 ≥ 2个独立用户
- 同类投诉集中
- 价格争议

**计算公式：**
```
RiskPenalty = 负面标签权重 × 时间衰减因子 × 用户独立性权重
```

**时间衰减因子：**
| 时间范围 | 衰减因子 |
|---------|---------|
| 30天内 | 1.0 |
| 31-60天 | 0.7 |
| 61-90天 | 0.4 |
| 90天以上 | 0.2 |

**惩罚力度：**
```
每个风险标签基础扣分 = 15分
实际扣分 = 15 × 时间衰减因子 × 独立性权重
```

**👉 重点：**
- ❗ 风险比正向权重更"重"

---

### 3.5 防刷机制（核心设计）

你必须做到三件事：

#### 1️⃣ 用户去重
```
同一用户对同一诊所：
第1次 = 100%
第2次 = 30%
第3次 = 10%
```

#### 2️⃣ 时间衰减
```
最近30天权重 = 1.0
60天 = 0.7
90天 = 0.4
```

#### 3️⃣ 交叉验证
```
只有当：
≥2个独立用户给出相同标签
标签才进入"有效状态"
```

---

### 3.6 排序最终逻辑（简单版本）

```
1. 先过滤风险过高诊所（RiskPenalty > 20分）
   ↓
2. 再算 TrustScore
   ↓
3. 再算 ValueScore
   ↓
4. 最后加 SocialProof
   ↓
5. 扣除 RiskPenalty
   ↓
6. 应用小样本保护（置信度系数）
   ↓
7. 得到最终分数
   ↓
8. 按分数降序排列
```

---

### 3.7 小样本保护机制

**问题：**
- 新诊所标签数少，分数波动大
- 可能因为1-2个差评排名暴跌

**解决方案：置信度系数**

```
置信度系数 = MIN(1.0, 总标签数 / 20)

最终分数 = 计算分数 × 置信度系数 + 基准分数 × (1 - 置信度系数)
```

**基准分数：**城市平均分 = 60分

**示例：**
```
新诊所A：5个标签，计算分数80分
置信度系数 = 5/20 = 0.25
最终分数 = 80 × 0.25 + 60 × 0.75 = 65分

成熟诊所B：50个标签，计算分数80分
置信度系数 = 1.0
最终分数 = 80 × 1.0 + 60 × 0 = 80分
```

---

## 四、这个系统真正的关键点（非常重要）

你现在已经不是在做：
- ❌ 推荐系统

你在做的是：
- ✅ **"结构化真实医疗反馈系统"**

**关键差异：**

| 维度 | 传统点评系统 | 我们的系统 |
|-----|------------|-----------|
| **用户输入** | 自由评论 | 结构化选择 |
| **防刷机制** | 弱 | 强（三层） |
| **排序逻辑** | 评分+付费 | 多维权重模型 |
| **时间处理** | 不衰减 | 时间衰减 |
| **风险标签** | 无 | 有（核心） |
| **小样本** | 不保护 | 置信度系数 |

---

## 五、一句话总结两个模块

**标签UI：**
> 把"随意评论"变成"结构化判断选择"

**排序算法：**
> 把"谁会运营"变成"谁真的被反复验证"

---

## 六、技术实现要点

### 6.1 前端实现（小程序）

```javascript
// 标签选择页面
Page({
  data: {
    step: 1,  // 当前步骤
    emotion: null,  // 第一层选择
    selectedTags: [],  // 第二层选择
    extraTags: [],  // 第三层选择
    tagPool: []  // 当前标签池
  },
  
  // 第一层：选择情绪
  selectEmotion(e) {
    const emotion = e.currentTarget.dataset.emotion;
    this.setData({
      emotion,
      step: 2,
      tagPool: this.getTagPoolByEmotion(emotion)
    });
  },
  
  // 第二层：选择标签
  toggleTag(e) {
    const tagId = e.currentTarget.dataset.id;
    let { selectedTags } = this.data;
    
    if (selectedTags.includes(tagId)) {
      selectedTags = selectedTags.filter(id => id !== tagId);
    } else {
      if (selectedTags.length >= 3) {
        wx.showToast({ title: '最多选择3个', icon: 'none' });
        return;
      }
      selectedTags.push(tagId);
    }
    
    this.setData({ selectedTags });
  },
  
  // 提交
  async submit() {
    const { emotion, selectedTags, extraTags } = this.data;
    
    if (selectedTags.length === 0) {
      wx.showToast({ title: '请至少选择1个原因', icon: 'none' });
      return;
    }
    
    // 调用API
    await api.submitTags({
      clinicId: this.data.clinicId,
      emotion,
      tagIds: [...selectedTags, ...extraTags]
    });
    
    wx.showToast({ title: '感谢您的反馈！', icon: 'success' });
    wx.navigateBack();
  }
});
```

---

### 6.2 后端实现（NestJS）

```typescript
@Controller('tags')
export class TagController {
  @Post('submit')
  async submitTags(
    @Body() dto: SubmitTagsDto,
    @User() user: UserEntity
  ) {
    // 1. 检查是否已评价
    const exists = await this.checkEvaluation(user.id, dto.clinicId);
    if (exists) {
      throw new BadRequestException('您已经为该诊所打过标签');
    }
    
    // 2. 检查预约记录
    const order = await this.getOrder(user.id, dto.clinicId);
    if (!order) {
      throw new BadRequestException('请先预约并就诊后再评价');
    }
    
    // 3. 计算权重
    const daysSinceOrder = this.getDaysDiff(order.createdAt, new Date());
    let weight = 1.0;
    if (daysSinceOrder > 7 && daysSinceOrder <= 30) {
      weight = 0.7;
    } else if (daysSinceOrder > 30) {
      throw new BadRequestException('评价时间已过期');
    }
    
    // 4. 计算用户权重
    const userWeight = await this.getUserWeight(user.id);
    
    // 5. 异常检测
    const isAbnormal = await this.detectAbnormal(user.id, dto.clinicId, dto.tagIds);
    if (isAbnormal) {
      weight *= 0.3;  // 降权
    }
    
    // 6. 保存标签
    await this.saveUserTags(user.id, dto.clinicId, dto.tagIds, weight, userWeight);
    
    // 7. 异步更新统计
    await this.updateClinicTagStat(dto.clinicId);
    
    return { success: true };
  }
}
```

---

## 七、关键成功因素

### 1. UI体验
- 3秒内完成选择
- 情绪分流清晰
- 限制明确

### 2. 防刷机制
- 用户去重有效
- 时间衰减合理
- 异常检测准确

### 3. 排序公正
- 真实用户排前面
- 长期稳定排前面
- 有风险排后面

### 4. 小样本保护
- 新诊所不会因1-2个差评暴跌
- 需要积累足够标签才能上位

---

## 🔚 总结

**标签UI + 排序算法 = 结构化真实医疗反馈系统**

**核心不是功能，而是：**
- 如何让用户快速做出可信选择
- 如何让真实好诊所排前面
- 如何防止刷标签和刷排名
- 如何保护小样本诊所

**最终目标：**
- 用户信任这个排序
- 诊所无法操控排名
- 系统越用越准确
