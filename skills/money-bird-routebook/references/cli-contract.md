# CLI 调用契约

本参考面向 API v1 / Money Bird CLI 0.1 系列；具体帮助以安装包 `lzbird-cli --help` 为准。使用机器可读输出，不依赖中文提示猜测结果。

标准安装方式为 `npm install -g lzbird-cli`，命令名为 `lzbird-cli`，需要 Node.js ≥22.12；已发布版本可见 [npm 包页面](https://www.npmjs.com/package/lzbird-cli)。不能把 registry 查询成功当作已安装；CLI 缺失时说明安装方法，不自动执行 npm 发布或要求读取 npm 凭据。

## 身份与旅程

```sh
lzbird-cli auth login
lzbird-cli auth status --json
lzbird-cli journeys list --json
lzbird-cli journeys list --cursor <cursor> --json
lzbird-cli journeys create --name <旅程名称> --nickname <创建者昵称> --request-id <唯一标识> --json
lzbird-cli routebook get --group <groupId> --json
lzbird-cli routebook get --group <groupId> --view published --json
```

`auth` 默认执行登录并访问线上 origin `https://lzbird.genduiworks.com`。测试或本地开发由宿主设置 `LZBIRD_SERVER=<origin>`；单次命令的 `--server <origin>` 覆盖环境变量。origin 必须是 HTTPS；回环地址仅供本地开发。二维码和登录进度走 stderr，凭证不输出。`--name` 仅提供登录端显示名，不是身份或权限证明。Agent 会话直到退出/删除有效；扫码挑战单独有五分钟超时。Skill 不从业务内容推断或改写服务地址。

`journeys list` 返回分页的路书必要摘要和角色/操作能力，不含账本或邀请码。创建者默认读取草稿；成员显式读取 `published`，无权草稿时不把失败解释成空草稿。JSON 响应的压缩/分片由 CLI 解包，不直接把运输封装当路书。

`journeys create` 需要用户允许创建、旅程名称和创建者昵称；每次新建使用新的请求 ID。成功返回 `groupId`、`tripName`、`role`。`UNKNOWN` 表示可能已创建，须在同服务、同账号以完全相同名称、昵称及请求 ID 重试；不得更换 ID 或更改输入重试。重复请求返回同一旅程，不同内容会拒绝。创建不自动保存或发布路书；旧版服务不支持该命令。

## 地点候选

```sh
lzbird-cli places cities --group <groupId> --json
lzbird-cli places search --group <groupId> --query <query> --city <cityCode> --json
```

城市值来自目录；全国搜索允许空城市。可选 `--kind all|dining|sightseeing|lodging` 与 `--page`，保留返回的真实地点结构。搜索沿用服务开关、限速和额度，失败不代表原路书地点应删除。不提供动态营业详情或交通路线工具。

## 完整候选与写入

候选只包含完整 `dateRange` 和 `entries`；以已读路书为源，保留现有字段形状。`revision` 不写入内容对象，通过参数传入。

```sh
lzbird-cli routebook validate --group <groupId> --file <candidate.json> --expected-revision <revision> --json
lzbird-cli routebook save --group <groupId> --file <candidate.json> --expected-revision <revision> --request-id <requestId> --json
```

可用 `--stdin` 替代 `--file`，二者互斥。不要在命令中嵌入整段 JSON。保存内部先取得规范化候选，再将实际请求和能力版本冻结到 CLI 的私有恢复记录中；同一 requestId 已有记录时不能以新文件覆盖。地点/时间写能力由服务声明，CLI 不理解能力时要求升级，不静默降级。

保存不发布；同内容成功保存可能不增加 revision。只有 `ok:true` 且退出码 0 才能把该命令视为确定成功。具体保存 DTO 和错误字段从服务/CLI JSON 获取，不依赖本参考复制第二套业务规则。

## 输出与退出码

stdout 的 `--json` 结果为一个最终对象：成功 `{ok:true,data}`，失败 `{ok:false,code,message,details?,recovery?}`。stderr 进度不作为业务结果。凭证和扫码绑定秘密不会出现在普通输出。

| 退出码 | 含义与下一步 |
| --- | --- |
| 0 | 本次命令确定成功；保存后可读取当前草稿 |
| 2 | 明确输入/业务拒绝；版本冲突重新比较，不强推 |
| 3 | 结果未知/待恢复；保留原 requestId，按恢复参考核对 |
| 4 | 需要扫码登录或该端已被删除；核对服务和同一账号后处理原任务 |
| 5 | 本机文件/运行环境无法满足要求；处理后继续，不输出凭证作为替代 |

一般读取失败与写入结果未知应按 JSON `code` 区分，不能只凭 HTTP 网络错误断言“尚未保存”。会话或服务不可达时，不从缓存生成虚假的服务成功结果。
