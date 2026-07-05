# CPSPP 文献监控系统

每日自动检索QP钢+机器学习前沿文献，AI总结后发送到邮箱。

## 功能特性

- 🔍 **智能检索**: arXiv API检索CPSPP相关文献和ML前沿文献
- 🤖 **自动总结**: 四维度分析（ML方法、研究对象、结论、流程框架）
- 📧 **邮件推送**: HTML格式精美日报
- ⏰ **定时运行**: GitHub Actions每天早上9点自动执行
- 💰 **完全免费**: 使用GitHub Actions公共仓库免费额度

## 快速开始

### 1. Fork或上传到GitHub

```bash
# 创建新仓库后上传
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/cpspp-literature-monitor.git
git push -u origin main
```

### 2. 设置GitHub Secrets

进入仓库 → Settings → Secrets and variables → Actions → New repository secret

创建两个Secret：

**第一个Secret：**

- **Name**: `EMAIL_ADDRESS`
- **Value**: `PyuanQAQ@gmail.com`

**第二个Secret：**

- **Name**: `EMAIL_PASSWORD`
- **Value**: `kgrw drle xbvv qjss` (你的Gmail App密码)

### 3. 启用GitHub Actions

进入仓库 → Actions → 启用Workflows

### 4. 测试运行

Actions → CPSPP Literature Monitor → Run workflow → 点击Run

## 配置说明

编辑 `monitor.js` 中的 `CONFIG` 对象:

```javascript
const CONFIG = {
  email: {
    sender: 'PyuanQAQ@gmail.com',
    receiver: 'PyuanQAQ@gmail.com',
    // ...
  },
  search: {
    cpsppKeywords: [...],      // CPSPP相关关键词
    mlFrontierKeywords: [...], // ML前沿关键词
    maxResults: 5,             // 每个关键词最大结果数
    daysBack: 7                // 检索过去几天的文献
  }
};
```

## 文件结构

```text
literature_monitor/
├── .github/workflows/
│   └── daily_literature.yml  # GitHub Actions配置
├── monitor.js                # 主脚本
├── package.json              # Node.js依赖
└── README.md                 # 说明文档
```

## 输出示例

邮件包含：

- 论文标题、作者、发表日期
- 四维度AI总结
- PDF下载链接

## 关键词覆盖

### CPSPP方向

- QP钢、淬火配分钢
- 材料信息学
- 先进高强钢+ML
- 物理信息神经网络
- 多模态材料学习

### ML前沿方向

- 材料机器学习
- 图神经网络
- Transformer在材料中的应用
- 生成模型
- 主动学习

## Gmail App密码设置

1. 访问 [Google账户安全设置](https://myaccount.google.com/security)
2. 启用两步验证
3. 搜索"App密码"
4. 生成16位专用密码
5. 添加到GitHub Secrets

## 定制化

### 修改运行时间

编辑 `.github/workflows/daily_literature.yml`:

```yaml
schedule:
  - cron: '0 1 * * *'  # UTC时间，换算北京时间要+8
```

### 添加更多关键词

编辑 `monitor.js` 中的 `cpsppKeywords` 和 `mlFrontierKeywords` 数组

### 修改邮件接收者

编辑 `CONFIG.email.receiver`

## 注意事项

- arXiv API有频率限制，脚本已内置1秒间隔
- GitHub Actions公共仓库每月2000分钟免费
- 每天运行一次约消耗5分钟，完全在免费额度内
- 需要GitHub账号和Gmail App密码

## 手动触发

```bash
# 本地测试（需要Node.js）
npm install
npm start
```

## 许可证

MIT License
