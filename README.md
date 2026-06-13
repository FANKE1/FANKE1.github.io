# AI Coding Plan 对比 · 9 大主流平台

[![Live](https://img.shields.io/badge/site-fanke1.github.io-0f766e)](https://fanke1.github.io)

国内 9 大主流 AI 平台 Coding Plan / Token Plan 对比工具：

> 智谱AI · Kimi · MiniMax · 小米·MiMo · 字节·方舟 · 阿里·百炼 · 百度·千帆 · 腾讯云 · 讯飞·星火

## 在线访问

[https://fanke1.github.io](https://fanke1.github.io)

## 文件结构

纯静态站点，5 个文件：

```
.
├── index.html    # 单页结构 + 顶部 hero + 推荐 + 筛选条 + 表格
├── styles.css    # 全部样式
├── app.js        # 加载数据 / 筛选 / 排序 / 渲染
├── plans.json    # ★ 套餐数据（编辑这个文件即可更新）
└── README.md
```

## 怎么改数据

打开 [plans.json](plans.json)，每个套餐是一个对象：

```json
{
  "vendor": "智谱AI",
  "plan": "Lite",
  "type": "Coding Plan",
  "rating": 5,
  "link": "",                       ← 在这里填跳转链接
  "firstMonthPrice": 46.55,
  "monthlyPrice": 49,
  "quarterlyPrice": 132.3,
  "yearlyPrice": 470.4,
  "models": ["GLM-5.1", "GLM-5-Turbo"],
  "fiveHoursRequests": 1200,
  "weeklyRequests": 6000,
  "monthlyRequests": 24000,
  "tokenLimit": "无限制",
  "benefits": ["免费MCP次数"],
  "note": "• 备注信息支持换行"
}
```

- `link` 留空时按钮显示「待补充」并禁用
- `link` 填入 URL 后按钮变为「前往 →」
- `monthlyPrice` 为数字（人民币 ¥）；如要展示美元，可手动改为字符串如 `"$20"`

## 改推荐位 / 平台顺序

打开 [app.js](app.js)，文件顶部有两个常量：

- `VENDOR_ORDER` — 控制筛选栏和默认排序里 9 家平台的顺序
- `RECOMMENDATIONS` — 顶部"平台推荐"卡片的内容（5 个推荐）

## 本地预览

```bash
# Python（任选）
python -m http.server 8000

# Node
npx http-server -p 8000
```

打开 http://localhost:8000

## 部署

push 到 main 分支即自动部署到 [fanke1.github.io](https://fanke1.github.io)。

GitHub 仓库 → Settings → Pages → Source: `Deploy from a branch / main / (root)`。

## License

MIT
