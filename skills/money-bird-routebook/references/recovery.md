# 原保存请求恢复

恢复对象是 CLI 发出前已经冻结的原保存请求，包含服务、账号、旅程、requestId、expectedRevision、完整内容和能力标记。通过 CLI 处理，不直接读取或编辑其私有文件。

## 查原结果

```sh
lzbird-cli routebook operation --group <groupId> --request-id <requestId> --json
lzbird-cli routebook recover --group <groupId> --request-id <requestId> --json
```

- `succeeded` 表示该原操作成功，返回的是原结果；当前草稿可能已被别人进一步修改，另外读取并区分展示。
- `unknown` 只表示尚未取得成功回执，不证明保存未发生。继续保留原请求，不生成另一个 ID 重试。
- 当前端被删除时，先在同一服务扫码登录同一账号。换成其他账号不能处理原账号请求。
- 查询失败时保持待核对，不告诉用户“没有保存”或“已撤销保存”。

## 重发冻结原请求

用户任务允许继续原保存时，使用：

```sh
lzbird-cli routebook recover --group <groupId> --request-id <requestId> --retry-original --json
```

此命令使用已冻结的原内容和原 expectedRevision，不能先重新 validate，也不能从用户后来编辑过的候选文件重建；新 CAS 可能阻止新写入，但不能遮住已经成功的原回执。相同 ID 换内容应明确拒绝。

没有可用冻结记录时，不猜测原内容重建。先查询可取得的原结果；仍未知则向用户说明缺少可靠恢复材料，保留当前稿和候选进行人工比较。

## 冲突后产生新操作

明确 `CONFLICT` 时重新读取当前稿，对照用户要求、原基线和候选。保留其他端已提交的变化，形成新候选与新请求 ID。不能仅修改版本号让旧候选覆盖新稿。

退出、关闭终端、删除登录端或取消等待都不回滚已经提交的保存。在途请求仍可能完成，以原回执或真实读回为准。
