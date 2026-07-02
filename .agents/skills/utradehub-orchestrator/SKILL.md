---
name: utradehub-orchestrator
description: uTradeHub 关务自动化项目的 AI Agent 团队编排器。把开发任务路由给 playwright-reliability / extraction-eval / web-ux / release-packager / qa-verify 五个专才并集成结果，守住人工门。触发场景：uTradeHub/구매확인서/关务自动化的任何开发任务——行项目被丢弃、抽取字段错或缺、preview/人工门 UI 改动、打安装包/发布、加跨适配器新字段、质检验证。后续场景：再跑一次、重新派发、只改某一部分、基于上次结果继续、改进上次结果、更新、复测。
---

# uTradeHub Orchestrator — 团队编排器

把 uTradeHub 自动化项目的开发任务，按"触及哪条接缝"路由给对应专才，组织生成-检验，最后交人工门把关。你是 Supervisor，**你不亲自改业务代码，你调度**。

## 执行模式：混合（当前以子Agent 执行，可升级团队）

- **默认子Agent 执行**：`Agent` 工具 + `run_in_background: true` 并行，结果回主会话——本环境现成可跑。
- **团队升级路径**：当 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 且 `TeamCreate` 可用时，把下面 Fan-out 与生成-检验两段替换为 `TeamCreate`+`SendMessage`+`TaskCreate`，让专才实时协商共享 data contract。此为局部替换，其余不变。

## 架构：复合模式
Supervisor（主干）+ Pipeline（领域流）+ Fan-out/Fan-in（跨切特性）+ Producer-Reviewer（QA 门）+ Expert-Pool（日常单点）。

## 团队构成

| 专才 | subagent_type | 接缝 | 模型 | 角色 |
|---|---|---|---|---|
| playwright-reliability | playwright-reliability | `playwright-driver.ts` `site-contract.ts` | opus | 生成者 |
| extraction-eval | extraction-eval | `pdf-text.ts` `llm-extractor.ts` `model.ts` | opus | 生成者 |
| web-ux | web-ux | `web/src/App.tsx` | sonnet | 生成者 |
| release-packager | release-packager | `packaging/*` `.github/workflows/*` | sonnet | 生成者 |
| qa-verify | qa-verify | 横切（只读+跑） | opus | 检验者 |

> 领域 steward（韩国门户/HS码/选择器实测、真栈放行）= **人工（你）**，不设 agent。

## 调度流程（核心）

**路由表——先判断任务触及哪条接缝：**

| 工作形状 | 架构模式 | 派发方式 |
|---|---|---|
| 单域 bug（如行项目丢失、某字段抽错） | Expert-Pool | 唤起 1 个对应生成者（子Agent） |
| 跨适配器新特性（如加新字段，横跨抽取+UI+门户） | Fan-out/Fan-in | 单条消息并行派发多个生成者（`run_in_background:true`） |
| 任一改动完成后 | Producer-Reviewer | 唤起 qa-verify 独立复核 |
| 发布/对外动作 | 人工门 | 停手，交人工显式批准 |

### Phase 0：上下文确认
1. 查 `_workspace/` 是否存在。
2. 决定模式：不存在→初次；存在+局部修改请求→部分重跑（只唤相关专才，覆盖对应产物）；存在+新输入→新跑（先把旧 `_workspace/` 移到 `_workspace_{YYYYMMDD_HHMMSS}/`）。

### Phase 1：准备
1. 分析任务，判定触及的接缝（对照路由表）。
2. 建 `_workspace/`，输入存 `_workspace/00_input/`。
3. 关联或新建 OpenSpec change（正式治理层）；`_workspace/` 仅存中间产物与审计留痕。

### Phase 2：派发（按路由表）
- **单域**（Expert-Pool）：以对应 `subagent_type` 唤起 1 个生成者，prompt 含任务 + `_workspace/00_input/` 路径 + 该专才模型。
- **跨切**（Fan-out）：**单条消息内**并行 `Agent(..., run_in_background:true)` 多个生成者；各自写 `_workspace/{phase}_{agent}_{artifact}.md`。
- 模型按团队构成表显式传 `model` 参数（opus/sonnet 混合）。

### Phase 3：生成-检验（Producer-Reviewer）
1. 每个生成者完成后，唤起 `qa-verify` 做增量 QA（边界 shape 比对 + `npm run verify` + 人工门红线检查）。
2. qa-verify FAIL → 把打回项回灌对应生成者重做，**最多 2~3 轮**防死循环；仍 FAIL 则带证据上报人工。
3. 跨切场景 Fan-in：Read 各产物，校验三方共享 data contract（以 `src/core/model.ts` schema 为准）。

### Phase 4：集成与人工门
1. 集成各专才改动，确认无冲突。
2. **人工门**：凡需真栈验证（live 门户跑通）或发布（打 tag），一律停手交你——这是 harness 替代不了的硬约束。

### Phase 5：整理
1. 保留 `_workspace/`（审计留痕，不删中间产物）。
2. 更新 OpenSpec change。
3. 向用户汇总：改了什么、QA 结论、待人工动作。

## 数据传递
- 中间产物：`_workspace/{phase}_{agent}_{artifact}.md`（绝对路径，不用相对路径）。
- 结果收集：子Agent 返回值 + Read 产物文件。
- 正式治理：OpenSpec `changes/<id>/`。

## 错误处理
| 情况 | 策略 |
|---|---|
| 生成者 1 个失败 | 重试 1 次；再败则记录缺口、带其余结果继续，报告注明 |
| 过半失败 | 通知用户，确认是否继续 |
| qa-verify 反复 FAIL | 2~3 轮后停，带证据交人工 |
| 数据冲突 | 标注出处并存，不删除 |
| 疑似触及提交路径/人工门 | 立即停手，交人工裁决 |

## 测试场景
**正常流**：用户报"某些 PO 行项目又丢了" → Phase 1 判定单域(automation) → Expert-Pool 唤 playwright-reliability 修复+加回读行数断言 → qa-verify PASS（含 verify 输出 + 无提交路径）→ 人工真栈放行 → 更新 change。
**错误流**：跨切加字段 → Fan-out 三生成者并行 → web-ux 失败 → 重试 1 次仍败 → 带其余两者结果继续，报告注明 web-ux 缺口 → qa-verify 对已完成部分给结论 → 人工决定是否补 web-ux。
