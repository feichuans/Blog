---
isPub: true
title: Buffin Assistant 过程区折叠设计
tags:
  - buffin
  - eyrie
  - agent-ui
  - collapse
  - frontend
  - streaming
confidence: high
sourceCount: 2
lastConfirmed: 2026-08-08
dateCreated: 2026-08-08T15:24:00+08:00
dateModified: 2026-08-08T15:24:00+08:00
---

## For future Claude

这页沉淀 Buffin 桌面端「assistant 回复过程区折叠」的最终设计（2026-08-08，经 Deepseek V4 Flash 设计 + Claude Opus 5 独立评审交叉验证，代码证据抽查属实）。核心：无协议层 phase 时用「尾部反向扫」判定正文区，异常/中断路径不折叠，纯前端实现。实现此功能或讨论 session 折叠/分层呈现时先读这页，与 [[Codex App 过程输出与最终回答分层]] 对照。

# Buffin Assistant 过程区折叠设计

> [!abstract] 当前结论
> 折叠单位是**单条 assistant 消息内部**：尾部正文（narrative）始终展开，之前的过程区（reasoning / 中间文本 / 工具调用 / control-receipt）折叠为一行 ToolGroup 风格摘要。正文判定用**尾部反向扫**（不是「最后一个 text part」）。仅正常完成（status=completed）且开关开启时自动折叠；interrupted / failed / 待响应交互禁止折叠。纯前端，不改 @buffin/api / daemon / provider。

## 需求演进（用户原话要点）

1. 「session 单次会话结束的时候，把上面输出合并成一小块，输出一个总结，类似 CodeX 分层回答」
2. 「只把最后一次，状态变更成已完成时，把最后一次以外的内容进行折叠，纯前端」
3. 「做成设置项，可能是一个开关」
4. 最终澄清：「折叠的是 assistant 回复，不是 user 回复。assistant 回复有工具调用、思考、正文输出，最后一段正文最长最有价值。把上面的输出折叠，就像现有 ToolGroup 一样，用户可收缩展开。纯前端展示，不需要派生新的数据模型」
5. 补充：「还要考虑错误情况——用户手动暂停或出错时，折叠行为应该怎样」

## 已知客观事实（代码证据）

### 正文判定的三种失效形状（Claude 评审发现，抽查属实）

- **run 以 tool-call 结尾**：`mapTurnStatus`（apps/daemon/src/agent/providers/codex/protocol.ts:774-779）对 unknown/inProgress 一律判 `failed`，中断/失败 run 常以工具收尾 → 「最后一个 text part」是中间文本，语义反了
- **零 text part**：`handleControlCompleted`（session-store.ts:451-482）无 open message 时新建只含 control-receipt 的 complete message → 正文区为空，整条被藏
- **late delta**：`run.completed` 后迟到事件仍被 reduce（session-runtime-store.ts:102-111 无 terminal gate）→ 新建 text part 使原正文塌进折叠区

### status 链路现状

- 三个 provider（codex/claude/scripted）全部发送 `run.completed` 的 status，类型为必填 4 值 union（apps/daemon/src/agent/types.ts:589-591；发出点 protocol.ts:283、translator.ts:358、scripted/runner.ts:106/215）
- wire 契约已有 `status?: string`（packages/api/src/session-events.ts:41），**协议包不用改**
- 前端丢弃点：`handleRunCompleted(state, _event, ...)`（session-store.ts:199-219）形参 `_event` 从未解引用，所有 message 一律标 `complete`
- 陷阱①：`interrupted` 混合用户中断与进程崩溃（drizzle-repository.ts:114-120 把 crashed 和 interrupted 都映到 Interrupted，仅 `reason` 能区分）
- 陷阱②：中断不发 `input.resolved`（service.ts:1196-1199），前端 `inputAction` 永久停在 `pending` —— 待响应判定必须用 message 终态短路，而非仅 `isRunning`（deriveSessionDomain 已有同款先例 session-domain.ts:19-24）
- 手动中断链路完整：use-session-actions.ts:48 → interruptCurrentRun → terminateAndBroadcast(run.id, 'interrupted')（service.ts:1200）；**pause/resume 不存在**

### 组件现状

- `ToolRowBase` 受控/非受控双支持、懒挂载 + 关闭动画保挂载（ToolRowBase.tsx:55-69），6 例权威测试
- 折叠动效用 Base UI Collapsible + CSS 高度过渡（styles/index.css:184-194），**不是 framer-motion AnimatePresence**（后者只用于消息列表 SessionThread.tsx:80）
- `useAutoOpenDisclosure`（use-auto-open-disclosure.ts:8-10）只有 `setOpen(true)`，**只能自动开不能自动关**，且 `userToggledRef` 是 per-mount（切 tab 丢 override）
- `PartGroup` 的 tool-group 变体没有 `partIndex`（SessionThread.tsx:669），而 text/reasoning 有（:654/:663）——按 partIndex 切分需先补齐
- `findActiveNarrativePartIndex`（thread-presentation.ts:47-60）是从末尾反扫找 narrative part 的现成先例

## 设计决策

### 1. 折叠单位与判定：尾部反向扫

```
过程区（可折叠）           正文区（始终展开）
reasoning / 中间text /     →   尾部连续 narrative
tool-call × N / receipts
```

判定：从 parts 末尾反扫，遇非 text/reasoning 即停；**若尾部第一个就不是 narrative，整个过程区不折叠**（安全默认，覆盖 tool-call 结尾、零 text、late delta 三种失效形状）。与 `findActiveNarrativePartIndex` 同构，零新概念。

### 2. 触发条件

```text
自动折叠 ⇔ message 终态 = completed ∧ 开关 on ∧ 无待响应交互 ∧ 尾部为 narrative
```

- `interrupted` / `failed` → 不折叠，保留错误上下文（对齐 Codex App 的 `isTurnCancelled → shouldAllowCollapse: false`，见 [[Codex App 过程输出与最终回答分层]]）
- 待响应 ask-user/approval（复用 `isPendingInteraction`，session-domain.ts:55-59）→ 不折叠；注意渲染侧 `?? 'pending'` 兜底（SessionThread.tsx:289/316），undefined 必须同默认，否则待响应表单被折叠
- 纯文本回复（过程区为空）→ 不渲染折叠块，退化为现状

### 3. 组件与动画

- 同级复用 `ToolRowBase`（不包 ToolGroup），header 显示统计摘要（命令数 / 文件数 / 耗时，result 缺失按完成计，过滤 `status !== 'completed'`）
- 折叠动画：Base UI Collapsible + CSS 高度过渡
- 冲突处理：ToolRowBase 首次展开才挂载 → 默认折叠时过程区 MarkdownPart 从未挂载，`usePlaybackBuffer` 的 catch-up 会在完成帧硬切（影响限于 run 刚结束一帧）

### 4. 状态与开关

- 折叠状态放 **SessionRuntimeStore**（同 composerText 待遇，跨 tab 存活 override）；rollback resync 重建消息时 GC（session-runtime-store.ts:94-100）
- 开关 `autoCollapseTurns`（默认 on）：存 `device-chrome-store`（现成订阅层）或 `prefs` 补订阅层；**关闭时追溯展开**已自动折叠的区域
- 手动展开/收起优先级高于开关（user override 恒胜）

## 与 Codex 协议层 phase 方案的关系

| 维度 | Codex App（[[Codex App 过程输出与最终回答分层]]） | Buffin 本方案 |
|---|---|---|
| 分层依据 | 协议层 `agentMessage.phase = commentary \| final_answer` | 呈现层「尾部反向扫」位置判定 |
| 折叠时机 | final answer 首个 item 开始 | message 正常完成后 |
| 依赖 | 需要 provider 支持 phase（Claude 等不保证） | 零协议依赖，全 provider 一致 |
| 异常路径 | turn cancelled 不折叠 | interrupted/failed 不折叠（同源语义） |
| 成本 | provider 归一化 + phase 持久化 | 前端一行 status 恢复 + 纯派生 |

两者不冲突：本方案是 phase 缺失时的替代路径；若未来接入 phase，折叠时机可提前到 final answer 开始，判定降级为增强而非必需。

## 边界情况清单

- 纯文本回复：不折叠，退化为现状
- run 以 tool-call 结尾 / 零 text part：不折叠
- truncated 工具输出（session-store.ts:23）：在折叠 header 提示
- 滚动跳变：`use-auto-scroll-bottom` 按 scrollHeight 判 following（:115），折叠使其骤减，需复核
- rollback resync：按 messageId 存的折叠态需 GC
- AskUserTool 中断后仍渲染可���交表单（SessionThread.tsx:286-299 未 gate 终态，既有问题会被「pending 不折叠」放大）

## 实施范围

纯前端：`SessionThread.tsx`（折叠容器 + header）、`session-store.ts`（恢复终态 status）、settings 新条目、i18n（en/zh-Hans/zh-Hant）。对应 GitHub issue：#215（buffin-ai/buffin）。

## 相关页面

- [[Codex App 过程输出与最终回答分层]]
- [[Buffin Session 呈现两轴模型]]
- [[流式 UI 的数据完成态与播放完成态分离]]
- [[Eyrie Agent Session UI 组件设计]]
- [[Eyrie Session UI 优化方案]]

## 来源

- Deepseek V4 Flash 设计 agent（herdr w19，2026-08-06，只读调研 + 4 项修订）
- Claude Opus 5 独立评审（herdr w19，plan 只读模式，2026-08-08，NOT READY 后修正，评审全文写入 ~/.claude/plans/agent-claude-code-buffin-stateful-tiger.md）
- Buffin 源码抽查（session-store.ts / thread-presentation.ts / SessionThread.tsx / use-auto-scroll-bottom.ts / protocol.ts / translator.ts / runner.ts / drizzle-repository.ts / service.ts，2026-08-08）
- GitHub issue buffin-ai/buffin#215
- [[Buffin Session 界面性能]] — 折叠已落地，但 mountChildren + keepMounted 让折叠内容仍占 DOM