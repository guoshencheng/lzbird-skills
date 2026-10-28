# 旅账鸟鸟 Skills

面向 AI 助手的旅账鸟鸟技能集合。目前包含 `money-bird-routebook`，可使用旅账鸟鸟 CLI 创建旅程、读取路书、查询地点、规划行程，并按用户要求保存草稿。

## 准备 CLI

需要 Node.js 22.12 或更高版本。安装已发布的 CLI：

```sh
npm install -g lzbird-cli@0.1.0
lzbird-cli auth login
```

CLI 默认连接线上服务。登录时用支持 CLI 扫码确认的旅账鸟鸟小程序扫描二维码并确认。需要连接其他环境时，可通过 `LZBIRD_SERVER` 指定服务 origin；单次命令的 `--server` 优先。

## 在 Codex 中安装

在 Codex 中请求使用 `$skill-installer`，从 `guoshencheng/lzbird-skills` 仓库安装 `skills/money-bird-routebook`。安装后在下一次对话中启用；也可以在支持兼容 Skill 目录格式的其他助手中按其安装方法使用。

## 使用

例如，告诉助手“帮我规划两天澳门行程，先给我预览”或“创建旅程并把路线保存到草稿”。保存以用户要求为准；发布路书仍需在旅账鸟鸟应用中操作。

```text
skills/
└── money-bird-routebook/
    ├── SKILL.md
    └── references/
        ├── cli-contract.md
        └── recovery.md
```

本仓库仅包含 Skill 与说明；CLI 安装、扫码身份和实际服务访问独立于 Skill。不要向仓库提交账号凭证或个人旅程数据。
