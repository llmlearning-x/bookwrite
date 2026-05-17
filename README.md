# BookBuddy

**AI 驱动的书籍创作桌面工具** — 从创意到成稿，全程 AI 辅助。

> 测试版 · v0.1.0-beta

---

## 简介

BookBuddy 是一款本地桌面应用（Electron + React），专为书籍创作者设计。用户通过自然语言与 AI Agent 对话，完成从创意发散、章节大纲、正文写作到封面生成、文档导出的完整创作流程。书籍数据通过 Supabase 云端加密同步，多设备无缝接续。

**设计风格**：Notion 风格极简界面 + 像素插画，黑白单色，无多余色彩干扰，专注创作。

---

## 核心功能

| 功能 | 说明 |
|------|------|
| **沉浸式创作 Studio** | 通过对话指令驱动 AI 完成全部创作任务 |
| **AI Agent 工具链** | 展开创意、生成大纲、写章节、润色、生成封面、导出文档 |
| **云端书架** | 书籍云端同步，登录即可跨设备访问 |
| **多模型支持** | Anthropic Claude、OpenAI GPT、Kimi、DeepSeek、Qwen、Groq 等 |
| **自定义 Base URL** | 支持任意 OpenAI 兼容接口，可接私有代理 |
| **本地 Ollama** | 完全离线运行本地模型 |
| **富文本编辑器** | 基于 Tiptap，支持标题、加粗、引用、列表等格式 |
| **多格式导出** | Word (.docx)、Markdown、HTML |
| **中英文界面** | 默认中文，可在设置中切换 |

---

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 安装

```bash
git clone https://github.com/your-username/bookbuddy.git
cd bookbuddy
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env.local` 并填入你的配置：

```bash
cp .env.example .env.local
```

```env
# Supabase（账号系统 + 云同步）
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...

# 默认 AI Key（可选，用户也可以在应用内设置里填写）
VITE_DEFAULT_AI_KEY=sk-...
```

### 初始化数据库

在 [Supabase Dashboard](https://supabase.com) → SQL Editor 中执行 `supabase-schema.sql`：

```bash
cat supabase-schema.sql
# 复制内容粘贴到 Supabase SQL Editor 执行
```

### 启动开发模式

```bash
npm run dev
```

### 打包构建

```bash
npm run build
```

---

## AI 模型配置

应用内点击右上角设置图标进行配置。

### 支持的提供商

| 提供商 | 说明 |
|--------|------|
| **Anthropic** | Claude Opus / Sonnet / Haiku，支持自定义代理 Base URL |
| **OpenAI** | GPT-4o / GPT-4o Mini / O3，支持 Azure 等兼容地址 |
| **自定义（OpenAI 兼容）** | 一键切换以下服务商 |
| **Ollama** | 本地模型，完全离线 |

### 自定义提供商快速预设

| 服务商 | Base URL |
|--------|----------|
| Kimi (Moonshot) | `https://api.moonshot.cn/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| 通义千问 (Qwen) | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Groq | `https://api.groq.com/openai/v1` |
| SiliconFlow | `https://api.siliconflow.cn/v1` |
| Azure OpenAI | 自定义 Deployment 地址 |

---

## 技术栈

```
Electron 33      桌面应用框架
React 19         UI 框架
TypeScript       类型安全
Vite             构建工具（electron-vite）
Zustand          状态管理
Tiptap           富文本编辑器
Supabase         Auth + PostgreSQL + 云同步
@anthropic-ai/sdk  Claude API
openai           OpenAI / 兼容接口
Tailwind CSS v3  样式
lucide-react     图标
docx             Word 导出
```

---

## 项目结构

```
src/
├── components/
│   ├── auth/          # 登录 / 注册界面
│   ├── library/       # 书架主页（书籍列表）
│   ├── studio/        # 创作 Studio（编辑器 + Agent 面板 + 侧栏）
│   ├── editor/        # Tiptap 富文本编辑器
│   └── settings/      # 设置面板
├── services/
│   ├── ai/
│   │   ├── gateway.ts   # 统一流式 AI 调用（Anthropic / OpenAI / Ollama）
│   │   └── agent.ts     # Claude Tool Use Agent 主循环
│   ├── supabase.ts      # Supabase 客户端
│   └── cloudSync.ts     # 书籍云端同步服务
├── stores/
│   ├── authStore.ts     # 用户认证状态
│   ├── bookStore.ts     # 当前书籍内容
│   ├── libraryStore.ts  # 书架列表 + 同步状态
│   ├── agentStore.ts    # Agent 对话历史 + Skill 状态
│   └── settingsStore.ts # 用户偏好（持久化）
├── i18n/
│   └── index.ts         # 中英文翻译字典
└── types/
    ├── book.ts          # 书籍数据结构
    └── ai.ts            # AI 配置 + 模型列表
```

---

## Agent Skill 工具链

Agent 通过 Claude Tool Use API 自动编排以下 Skill：

| Skill | 触发示例 |
|-------|---------|
| `expand_idea` | "把我的创意扩展成完整设定" |
| `generate_outline` | "生成章节大纲" |
| `write_chapter` | "写第三章" |
| `write_all_chapters` | "把所有章节都写完" |
| `edit_chapter` | "润色当前章节" |
| `generate_cover` | "生成封面" |
| `export_book` | "导出 Word 文档" |
| `navigate_chapter` | "跳到第二章" |
| `update_book_info` | "把作者改成张三" |

---

## 安全说明

- **API Key** 存储在 `.env.local`，已加入 `.gitignore`，不会随代码提交
- **书籍数据** 通过 Supabase Row Level Security 隔离，用户只能访问自己的数据
- **AI 请求** 从客户端直接发往模型服务商，不经过任何中间服务器
- **打包分发** 时如需保护 Key，建议改为用户在应用内自行填写（移除 `VITE_DEFAULT_AI_KEY`）

---

## 开发计划

- [ ] PDF / EPUB 导出
- [ ] 写作目标（每日字数）
- [ ] 章节拖拽排序
- [ ] 人物 / 世界观卡片
- [ ] License Key 商业授权
- [ ] 自动更新（electron-updater）

---

## License

MIT
