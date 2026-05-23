# Noah IDE

![Noah IDE](https://img.shields.io/badge/Noah%20IDE-v0.1.0-blue)

可视化 Web 演示文稿设计工具 — 拖拽组件、AI 生成、动画引擎、数据绑定，一站式完成。

## 功能特性

- **拖拽式编辑** — 18+ 组件类型，自由拖拽布局
- **AI 智能生成** — 输入主题，AI 自动生成完整演示文稿
- **动画引擎** — 基于 Anime.js 的入场/循环动画
- **数据绑定** — ECharts 图表、MQTT 实时数据
- **多种导出** — 导出为独立 HTML 或打包演示文稿
- **3D 场景** — Three.js 集成，支持 3D 可视化

## 下载

[👉 下载最新版本](https://github.com/MingKaiShang/noah-ide/releases/latest)

- Noah-IDE_v0.1.0_x64.exe — 便携版（直接运行）
- Noah-IDE_0.1.0_x64-setup.exe — 安装包（NSIS 安装程序）

## 系统要求

- Windows 10/11 64位
- WebView2 运行时（Windows 11 自带，Windows 10 需安装）

## 技术栈

| 前端 | 后端 | 桌面 |
|------|------|------|
| Vue 3 + TypeScript | Rust | Tauri v2 |
| Pinia 状态管理 | Vite 构建 | WebView2 |
| Anime.js 动画 | ECharts 图表 | NSIS 打包 |

## 快速开始

`ash
# 开发
pnpm install
pnpm tauri dev

# 构建
pnpm tauri build
`

## 作者

**商明凯** — [GitHub](https://github.com/MingKaiShang)