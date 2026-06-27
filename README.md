<div align="center">
  <h1>🎨 NOAH IDE</h1>
  <p><strong>可视化交互式演示文稿编辑器</strong></p>
  <p>基于 Tauri v2 + Vue 3 构建，让创建精美演示文稿像使用设计工具一样简单</p>

  <p>
    <img alt="Tauri" src="https://img.shields.io/badge/Tauri-2.0-FFC131?style=flat-square&logo=tauri" />
    <img alt="Vue" src="https://img.shields.io/badge/Vue-3.4-4FC08D?style=flat-square&logo=vue.js" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript" />
    <img alt="License" src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
    <img alt="Platform" src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-9cf?style=flat-square" />
  </p>
  <br />
</div>

## 📖 简介

**NOAH IDE** 是一款面向教师和学生的可视化演示文稿制作工具。它提供了拖拽式编辑界面，让你可以像使用 PPT 一样轻松创建交互式网页演示文稿，并支持导出为独立的 HTML 文件。

与传统的演示工具不同，NOAH IDE 生成的演示文稿是基于网页技术的，支持丰富的交互效果、动画和多媒体内容。

## ✨ 功能特性

### 🎯 核心功能
- **拖拽式编辑** — 从组件面板拖拽组件到画布，所见即所得
- **组件系统** — 内置 18+ 种组件类型，覆盖基础、展示、形状、图表等类别
- **实时预览** — 编辑时实时查看演示效果
- **独立导出** — 导出为独立 HTML 文件，无需任何依赖即可播放
- **项目管理** — 保存为 `.noah` 项目文件，随时打开继续编辑

### 🧩 组件类型
| 类别 | 包含组件 |
|------|---------|
| 基础 | 文本、图片、形状、按钮 |
| 展示 | 卡片、列表、表格、图标 |
| 形状 | 矩形、圆形、三角形、箭头、线条 |
| 背景 | 纯色背景、渐变背景、图片背景 |
| 数据 | 数据表格、列表 |
| 图表 | 柱状图、折线图、饼图（基于 ECharts） |
| 3D | Three.js 3D 场景 |
| 特效 | 粒子效果、动画效果（基于 CSS/SVG） |

### 🤖 AI 辅助
- 集成 AI 聊天助手，支持通过自然语言生成演示内容
- 兼容 OpenAI 和 Anthropic API 格式
- 支持国内 AI 提供商（DeepSeek、智谱、月之暗面等）

### 🎨 演示播放
- 全屏展示模式，支持键盘翻页
- 灵活的缩放适配
- 丰富的过渡动画
- 导出为独立 HTML 或 PowerPoint (PPTX)

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v8+)
- [Rust](https://www.rust-lang.org/) (1.70+) — 用于 Tauri 构建

### 安装

```bash
# 克隆仓库
git clone https://github.com/your-username/NOAH-IDE.git
cd NOAH-IDE

# 安装依赖
pnpm install
```

### 开发

```bash
# 启动 Tauri 桌面应用（推荐）
pnpm tauri dev

# 或仅启动 Web 开发服务器
pnpm dev
```

### 构建

```bash
pnpm tauri build
```

## 📦 项目结构

```
noah-ide/
├── src/                    # Vue 前端源码
│   ├── assets/             # 静态资源
│   ├── components/         # Vue 组件
│   ├── composables/        # 组合式函数
│   │   ├── useCodeGenerator.ts   # 代码生成器
│   │   └── ...
│   ├── config/             # 配置文件
│   ├── stores/             # Pinia 状态管理
│   ├── types/              # TypeScript 类型定义
│   │   ├── component.ts    # 组件定义
│   │   ├── effect.ts       # 特效模板
│   │   └── ...
│   ├── views/              # 页面视图
│   ├── App.vue             # 根组件
│   └── main.ts             # 入口文件
├── src-tauri/              # Tauri Rust 后端
│   ├── src/
│   │   └── main.rs         # Rust 入口（含 AI 流式接口）
│   └── Cargo.toml
├── public/                 # 公共资源
├── package.json
└── vite.config.ts
```

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| [Tauri v2](https://v2.tauri.app/) | 桌面应用框架（Rust 后端） |
| [Vue 3](https://vuejs.org/) | 前端 UI 框架 |
| [TypeScript](https://www.typescriptlang.org/) | 类型安全 |
| [Pinia](https://pinia.vuejs.org/) | 状态管理 |
| [Vite](https://vitejs.dev/) | 构建工具 |
| [Naive UI](https://www.naiveui.com/) | UI 组件库 |
| [ECharts](https://echarts.apache.org/) | 图表渲染 |
| [Three.js](https://threejs.org/) | 3D 渲染 |
| [html2canvas](https://html2canvas.hertzen.com/) | 截图导出 |
| [PptxGenJS](https://github.com/gitbrent/PptxGenJS) | PPTX 导出 |

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。
