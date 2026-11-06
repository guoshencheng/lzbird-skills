# 旅账鸟鸟 Skills

面向 AI 助手的旅账鸟鸟技能集合，目前包含：

- `money-bird-routebook`：使用CLI完整查询个人/本人分享路书、规划和编辑行程，上传本地图片到既有活动，并由AI按路线自选风格与详略，调用当前助手的图像工具生成默认带旅账鸟鸟小程序品牌的分享图。

## 准备 CLI

需要Node.js ≥22.12。推荐CLI 0.3.0，包含完整读取、独立分享及活动图片上传；图片上传还要求服务声明agentMediaVersion:1。旧安装不会自动升级。安装并核对：

```sh
npm install -g lzbird-cli@0.3.0
lzbird-cli --version
lzbird-cli auth login
```

CLI 默认连接线上服务。登录时用支持 CLI 扫码确认的旅账鸟鸟小程序扫描二维码并确认。需要连接其他环境时，可通过 `LZBIRD_SERVER` 指定服务 origin；单次命令的 `--server` 优先。

## 在 Codex 中安装

路书Skill本次增量已同步公开仓库，可在Codex中请求使用 `$skill-installer`，从 `guoshencheng/lzbird-skills` 仓库安装 `skills/money-bird-routebook`；个人安装不会自动更新。此处列出的部署Skill仍为另一个本地任务，不属于本次公开发布。安装后在下一次对话中启用；也可以在支持兼容 Skill 目录格式的其他助手中按其安装方法使用。

## 使用

例如，告诉助手“帮我规划两天澳门行程，先给我预览”或“创建旅程并把路线保存到路书”。预览只输出方案；用户要求保存后才写入。个人路书按活动增量保存，分享路书按整稿明确保存，二者目标不能混用。

可直接告诉助手“查我的杭州路书，帮我做张分享图，风格和详略你来选”。助手先完整读取同版数据，自选/组合视觉提示词；默认带“旅账鸟鸟 · 微信小程序”品牌，关键集合时间保留。有已保存分享的真实行程码时，随Skill提供的HTML2Image工具会生成含现成Logo/缩小后的原小程序码/行程码/一句查看指引的1080×300紧凑卡，给图片AI作为素材原样放入。工具需Node和本机Chrome/Chromium，不依赖项目源码；只渲染指引卡，路线主体仍由模型生成。出图不创建或修改分享。需要当前助手具备图像生成工具；缺工具时只交付提示词并明确未生成。

本次完整读取、分享和提示词出图指引已随公开路书Skill发布；运行 `lzbird-cli shares --help` 核对已安装CLI，服务需要返回 `sharingVersion: 1`。具体命令与恢复规则见[分享参考](https://github.com/guoshencheng/lzbird-skills/blob/main/skills/money-bird-routebook/references/sharing.md)。CLI0.3.0包含当前读取、分享和图片上传命令，旧安装应明确升级。

用户明确要求“把这张本地图片附到已有活动”时，Skill读取同版目标与活动ID，再用CLI `images add`单张追加，保留原图和其他字段。只生成海报不自动上传；个人旅程仅创建者、独立分享仅本人可上传。超时未知保留原requestId，按[图片上传与恢复](https://github.com/guoshencheng/lzbird-skills/blob/main/skills/money-bird-routebook/references/images.md)处理。

公开内容包含路书Skill入口、cli-contract/recovery/sharing/images/share-image/image-styles参考、品牌素材和指引卡脚本；本地部署Skill不在本次公开范围。

本目录包含 Skill 与说明；CLI 安装、扫码身份、实际服务访问和部署授权独立于 Skill。不要向仓库提交账号凭证、私有运行配置或个人旅程数据。
