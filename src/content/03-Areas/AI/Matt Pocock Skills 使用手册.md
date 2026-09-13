---
isPub: true
title: Matt Pocock Skills 使用手册
tags:
  - AI
  - agent
  - skills
  - mattpocock
confidence: high
sourceCount: 3
lastConfirmed: 2026-09-07
dateCreated: 2026-06-18T01:06:00+08:00
dateModified: 2026-09-07T09:45:00+08:00
---

## For future Claude

这页是 [mattpocock/skills](https://github.com/mattpocock/skills) 的本机对照地图。2026-09-07 对照 GitHub 主分支 **v1.2.3**（提交 `3cca18b`，2026-09-04）和本机 `~/.agents/skills`：仓库 **37** 个 `SKILL.md`，Claude 插件正式收录 **25** 个，开发中 **8** 个，杂项 **4** 个，弃用桶已空。选工作流、核旧名、装或更新这套 skill 时先读本页。

# Matt Pocock Skills 使用手册

## 当前版本结论

**Matt Pocock Skills** 是一组小型、可组合的工程工作流，不接管整个开发过程。它针对四类失败：

1. 需求和 Agent 没对齐：用 grilling 把设计树问完。
2. 项目里同一个词指三件事：维护 `CONTEXT.md` 和 ADR。
3. 代码对不对没有反馈：TDD、诊断循环、Standards + Spec 双轴审查。
4. 代码库越写越糊：找 deep module、接口和缝。

| 桶 | 数量 | 进 Claude 插件 | 建议 |
|---|---:|:---:|---|
| 工程 + 效率（稳定） | **25** | 是 | 日常用 |
| 开发中 | **8** | 否 | 可试，会变或消失 |
| 杂项 | **4** | 否 | 特定工具才装 |
| 弃用 | **0** | — | 删掉，不留尸 |
| 合计 `SKILL.md` | **37** | | 以 GitHub 主分支为准 |

2026-09-07 本机：`npx skills add mattpocock/skills -g --all` 已把这 37 条装到 `~/.agents/skills`，Pi / Claude 目录是指向那里的符号链接。37 份 `SKILL.md` 与主分支字节一致。

> [!warning]
> [skills.sh/mattpocock/skills](https://skills.sh/mattpocock/skills) 的展示数量可能和仓库 `SKILL.md` 数不一致（历史发布、旧名、索引缓存）。以 GitHub 主分支和本机 `~/.agents/skills` 为准。skills.sh 条数 **uncertain**。

## 安装

两条路，不要两条一起走，否则每条 skill 会出现两次。

### Claude Code 插件（只读、随作者更新）

```bash
claude plugins install mattpocock-skills
```

已在 Claude Code 官方 marketplace，不用先加源。插件只带上面那 **25** 条稳定 skill，不含开发中和杂项。

### 可编辑副本（Codex / Pi / 其他）

```bash
npx skills@latest add mattpocock/skills
```

本机 2026-09-07 用的是全局全量：

```bash
npx skills@latest add mattpocock/skills -g --all
```

更新已装副本：`npx skills update`。每个仓库先跑一次 `/setup-matt-pocock-skills`：选 issue tracker（GitHub / Linear / 本地文件）、triage 标签、文档落点。

来源：[仓库 README](https://github.com/mattpocock/skills)

## 调用模型

一条轴：谁能启动它。

| 类型 | 谁能启动 | 写法 | description 写给谁 |
|---|---|---|---|
| 用户显式 | 只有人打出名字 | Claude：`disable-model-invocation: true`；Codex：`agents/openai.yaml` 里 `policy.allow_implicit_invocation: false` | 人（一行摘要，不要写「Use when…」触发清单） |
| 模型可调用 | 人或模型 | 省略上面两项 | 模型（保留触发语义） |

用户显式 skill 可以去调模型可调用 skill，**不能**再调另一个用户显式 skill。跨 skill 的真正调用要写成「Call the Skill tool with `"grilling"`」，不要指望正文里写 `/grilling` 就会开火。前置条件若是用户显式 skill（例如 `setup-matt-pocock-skills`），只能让人去跑，不能让 Skill tool 去调。

稳定插件 **25** 条现在是 **14 用户显式 + 11 模型可调用**（不是 2026-07 的 14+14）。本机 37 条合计 **22 用户显式 + 15 模型可调用**。

来源：[invocation.md](https://github.com/mattpocock/skills/blob/main/.agents/invocation.md)

## 稳定工程 Skill：18 个

### 用户显式：9 个

| Skill                           | 作用                                                                          | 适用场景                                                |
| ------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------- |
| `ask-matt`                      | 路由：该走哪条 skill / 流程；含会话阶段边界（continue / clear / handoff / subagent / compact） | 不知道下一步该 grill、spec、prototype 还是 implement           |
| `setup-matt-pocock-skills`      | 给仓库配 issue tracker、triage 标签、领域文档目录                                         | 每个仓库第一次用这套                                          |
| `grill-with-docs`               | 追问方案，同时改 `CONTEXT.md` 和 ADR                                                 | 有工作目录；重大功能或架构前                                      |
| `triage`                        | 按状态机处理**别人丢进来的** issue/PR                                                   | 原始 bug/需求 → Agent 可执行任务；`to-tickets` 产出的票不要再 triage |
| `improve-codebase-architecture` | 扫 deep module 机会，出 HTML 报告，再追问你挑哪一条                                         | 定期治理，不是救火                                           |
| `to-spec`                       | 把已经谈完的内容收成 spec 并挂到 tracker                                                 | 对话已结束，只需沉淀规格                                        |
| `to-tickets`                    | 拆成带阻塞边的 tracer-bullet tickets                                               | 多任务、多人或多 Agent                                      |
| `implement`                     | 按 spec/票实现，内部跑 `tdd`，提交前跑 `code-review`                                     | 需求和票已经就绪                                            |
| `wayfinder`                     | 超大工作画决策票地图，一次解一个决策（产出决策不是交付物）                                               | 目标大、未知多；地图清了再交回 `to-spec`，不要直接 implement            |

### 模型可调用：9 个

| Skill                       | 作用                                     | 适用场景                                                                |
| --------------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| `prototype`                 | 用可丢弃原型回答一个设计问题                         | 逻辑/状态：单个可双击打开的 HTML；UI：同一路由上多套可切换变体。原型当主键源，落到 `prototype/<name>` 分支 |
| `diagnosing-bugs`           | 先有变红的反馈环，再缩小、假设、插桩、修、回归；展示命令和产物前先打码密钥  | 难 bug、性能回退、偶发失败                                                     |
| `research`                  | 后台对高可信一手源调研，落成带引用的 Markdown            | API/框架事实，不要用它替代思考                                                   |
| `tdd`                       | 红—绿—重构的垂直切片；只在事先和你约定的 seam 上测          | 新功能或 bug 适合先测                                                       |
| `domain-modeling`           | 主动挑战术语、用场景压测、当场改 `CONTEXT.md`/ADR      | 词含糊；只读 `CONTEXT.md` 不算走这条                                           |
| `codebase-design`           | deep module 词汇：小接口、干净缝、从接口测试           | 模块形状、缝该开在哪                                                          |
| `code-review`               | 相对某基点并行审 **Standards** 和 **Spec**      | 分支、PR、工作区 diff                                                      |
| `resolving-merge-conflicts` | 按双方原始意图逐块解冲突，然后做完操作，不用 `--abort`       | 已经处于 merge/rebase 冲突                                                |
| `wizard`                    | 生成交互式 bash，带人走只有人能点的步骤（密钥、第三方后台、一次性迁移） | Agent 自己做不了的那截；能自己做就不要走这条                                           |
|                             |                                        |                                                                     |

来源：[Engineering README](https://github.com/mattpocock/skills/blob/main/skills/engineering/README.md)、[plugin.json](https://github.com/mattpocock/skills/blob/main/.claude-plugin/plugin.json)

## 稳定效率 Skill：7 个

| Skill | 调用 | 作用 |
|---|---|---|
| `grill-me` | 用户显式 | 无工作目录时的追问；不写 `CONTEXT.md` |
| `grilling` | 模型可调用 | 真正的面试原语：按设计树一轮问完当前 **frontier**，事实派子代理查，决策留给你。`grill-me` / `grill-with-docs` / `triage` / `wayfinder` / `improve-codebase-architecture` 内部都走它 |
| `handoff` | 用户显式 | 把当前会话压成可带走的 markdown。窄用途：换 harness、换目录、交给同事、阶段中途分叉 |
| `teach` | 用户显式 | 在当前目录做跨 session 教学工作区 |
| `to-questionnaire` | 用户显式 | 答案在**别人**脑子里：追问的是「发给谁、要收回什么」，写成问卷 |
| `wait-what` | 用户显式 | 上一句没听懂，用 `CONTEXT.md` 里的词重新讲。修一句，不防下一句 |
| `writing-for-agents` | 模型可调用 | 写给 Agent 看的文档：skill、`AGENTS.md`/`CLAUDE.md`、指针文档。旧名 `writing-great-skills` |

### `grill-me` 与 `grill-with-docs`

| 维度 | `grill-me` | `grill-with-docs` |
|---|---|---|
| 工作目录 | 没有（或不该留纸面） | 有���就该用这条 |
| 是否改 `CONTEXT.md` / ADR | 否 | 是 |
| 面试原语 | 都是 `grilling` | 都是 `grilling` |

有仓库却走 `grill-me`，等于放弃纸面。答案在别人那里走 `to-questionnaire`，不要硬问自己。

## 杂项 Skill：4 个（不进插件）

| Skill | 作用 | 判断 |
|---|---|---|
| `git-guardrails-claude-code` | Claude Code hook，拦住高风险 git | 只对 Claude Code |
| `setup-pre-commit` | Husky + lint-staged + 类型检查 + 测试 | JS/TS 仓库实用 |
| `scaffold-exercises` | 课程练习目录脚手架 | 主要给课程作者 |
| `migrate-to-shoehorn` | 测试里的 `as` 迁到 `@total-typescript/shoehorn` | 高度特定 |

来源：[Misc README](https://github.com/mattpocock/skills/blob/main/skills/misc/README.md)

## 开发中 Skill：8 个

不进插件和顶层 README，无独立 docs 页，可能改掉或删掉。单独装：`npx skills@latest add mattpocock/skills --skill=<name>`。

| Skill | 作用 | 判断 |
|---|---|---|
| `loop-me` | 跨 session 追问自己，写出工作流 spec | 实验 |
| `claude-handoff` | 把当前对话交给新的 Claude 后台 agent（`claude --bg`） | Claude 专用 |
| `setup-ts-deep-modules` | dependency-cruiser 强制 TS 包只从入口进入 | 大 TS monorepo 可试 |
| `implement-spec` | 整份 spec 一张分支；票当任务图，就绪前沿并行子代理，收成一个 PR | 新；和逐票 `implement` 不同 |
| `retro` | 会后改 steering / 规范 / 检查 / 工具 | **stub**，还不能当功能用 |
| `writing-fragments` | 访谈采矿，先不结构 | 写作探索 |
| `writing-shape` | 把素材按段收成文章 | 写作收敛 |
| `writing-beats` | 按节拍组织素材 | 叙事 |

来源：[In Progress README](https://github.com/mattpocock/skills/blob/main/skills/in-progress/README.md)

## 已不存在的名字

弃用桶现在是空的：退休即删除，changeset 里写替代。下面这些名字不要再装。

| 旧名称 | 现状 |
|---|---|
| `design-an-interface` | 并入 `codebase-design` |
| `qa` | 并入 `triage` |
| `request-refactor-plan` | 用 `improve-codebase-architecture` → `to-spec` / `to-tickets` |
| `ubiquitous-language` | 并入 `domain-modeling`、`grill-with-docs` |
| `edit-article` | 主分支已无此目录 |
| `obsidian-vault` | 主分支已无此目录 |
| `writing-great-skills` | 改名为 `writing-for-agents`，无别名 |
| `to-prd` | `to-spec` |
| `to-issues` | `to-tickets` |
| `review` | `code-review` |
| `decision-mapping` / `pathfinder` | `wayfinder` |

## 相对 2026-07-13 手册的变化

当时写的是 39 条（28 稳定 + 7 开发中 + 4 弃用）。2026-09-07 核验后：

| 变化 | 说明 |
|---|---|
| `wizard` | 从开发中毕业，进工程、模型可调用 |
| `to-questionnaire` | 新稳定效率 skill |
| `wait-what` | 新稳定效率 skill |
| `writing-for-agents` | 可被模型调用（Codex 1.2.2 起） |
| `implement-spec`、`retro` | 新开发中 |
| grilling | 不再一次一题；一轮问完当前 frontier |
| `prototype` | 逻辑原型改为单个 HTML，不再是终端小程序 |
| `diagnosing-bugs` | 先打码密钥（v1.2.3） |
| `ask-matt` | 增加 Phase boundaries 和 `PHASE-BOUNDARIES.md` |

## 推荐工作流

主路径（`ask-matt` 的 idea → ship）：

```text
grill-with-docs
  → 需要可运行答案时：handoff → prototype → handoff 回来
  → 多 session：to-spec → to-tickets → 每张票单独 implement（票间 clear）
  → 单 session：当场 implement
implement 内部：tdd → code-review → commit
```

grilling / spec / tickets 尽量留在**同一扇窗口**，不要中途 compact。每张 `implement` 再开干净窗口。窗口靠近 smart zone（文档现写约 150k）时，在阶段边界 compact 或 handoff，不要硬撑。

| 场景 | 路径 |
|---|---|
| 小型功能 | `grill-with-docs` → `to-spec` → `implement` |
| 大型、多 session | `grill-with-docs` → `to-spec` → `to-tickets` → 每票 `implement` |
| 巨型、未知多 | `wayfinder`（决策票）→ `research` / `prototype` → 清了再 `to-spec` |
| Bug | `diagnosing-bugs` → `tdd` 回归 → 修 → `code-review` |
| 架构治理 | `improve-codebase-architecture` → `codebase-design` → `grill-with-docs` |
| 别人丢来的 issue | `triage` → 就绪后 `implement` |
| 答案在别人那里 | `to-questionnaire` → 收回来再 `grill-with-docs` / `to-spec` |
| 上一句没听懂 | `wait-what` |
| 只有人能点的步骤 | `wizard` |

## 本机状态（2026-09-07）

| 项 | 值 |
|---|---|
| 版本 | 仓库 **v1.2.3**，主分支 `3cca18b`（2026-09-04） |
| 实体目录 | `~/.agents/skills`（37 条） |
| Pi | `~/.pi/agent/skills` 全是符号链接 |
| 旧副本备份 | `~/Documents/skills-backup/2026-09-07-pre-matt-only/` |
| 不在这套里的 | `pi-goal-writer` 仍在 pi-goal 包内；`~/Documents/skills` 个人源未动 |

新开一轮 Pi 会话才会按这 37 条重新加载。

## 核心判断

最有价值的不是单个文件，而是这条循环：

```text
对齐 → 规格 → 任务切片 → 小步实现 → 自动反馈 → 双轴审查 → 架构持续治理
```

它和 [[Agent Skills 与 SKILL.md 工作流]] 一致：skill 是可组合、可版本化的工作流资产，不是更长的 Prompt。

## 历史记录

### 2026-07-13 主张（已被本页取代）

当时对照主分支记为 **39** 个 `SKILL.md`：28 稳定、7 开发中、4 弃用；稳定恰好 14 用户显式 + 14 模型可调用。当时仍把 `wizard` 放在开发中，把 `writing-great-skills` 当作稳定效率 skill，并收录已不存在的 `edit-article` / `obsidian-vault`。grilling 仍按「一次只问一题」描述。2026-09-07 以 v1.2.3 覆盖上述数字和分类。

## 原始材料

- [mattpocock/skills GitHub](https://github.com/mattpocock/skills)
- [v1.2.3 plugin.json](https://github.com/mattpocock/skills/blob/main/.claude-plugin/plugin.json)
- [CHANGELOG](https://github.com/mattpocock/skills/blob/main/CHANGELOG.md)
- [skills.sh 页面](https://skills.sh/mattpocock/skills)
- [Engineering README](https://github.com/mattpocock/skills/blob/main/skills/engineering/README.md)
- [Productivity README](https://github.com/mattpocock/skills/blob/main/skills/productivity/README.md)
- [In Progress README](https://github.com/mattpocock/skills/blob/main/skills/in-progress/README.md)
- [Misc README](https://github.com/mattpocock/skills/blob/main/skills/misc/README.md)
- [Deprecated README](https://github.com/mattpocock/skills/blob/main/skills/deprecated/README.md)
- [Invocation 设计](https://github.com/mattpocock/skills/blob/main/.agents/invocation.md)

## 相关

- [[Agent Skills 与 SKILL.md 工作流]]
- [[pi-skills-handbook]]
- [[teach-skill-design]]