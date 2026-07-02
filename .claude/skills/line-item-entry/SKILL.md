---
name: line-item-entry
description: 【非用户入口·内部步骤手册】仅由 playwright-reliability 专才在改写 src/adapters/playwright-driver.ts 录入逻辑过程中，用 Skill 工具按名调用；不响应任何用户请求（用户请求一律由 utradehub-orchestrator 路由）。内容为该专才编码时遵循的竞态消除动作清单：alert 记录器安装、blockUI 重载的事件式等待、字段按值重断言、录入后回读栅格行数校验。
---

# Line-Item Entry — 行项目录入竞态消除流程

uTradeHub 行项目录入是本项目竞态最密集处。本流程把已踩过的坑固化为可复用纪律，避免每次重新流血。

## 三类已知竞态（先对号入座）
1. **原生 `alert()` 冻结**：품명 > 35 byte 触发 `window.alert(...)` 冻结 JS 线程，fill 序列被打乱→단가 空→行被拒丢弃。
2. **`저장/추가` 后 DOM 重载**：jQuery blockUI 回发重载录入行 DOM（且还原被 no-op 的 alert）；死等不够长就填到已分离的输入框，静默丢弃。
3. **异步 echo 覆盖**：단가 `onblur`→`setSumAmt()`→AJAX 回写 `#qty/#untPrc`；因 onblur 早于数量输入，服务器回的陈旧 `qty=1` 可能晚到，覆盖真实数量。

## 每行录入的标准序列（按此顺序）
1. **装 alert 记录器**：本行 fill 前 `installAlertRecorder()` 把 `window.alert` 换 no-op 记录器。**每行都要重装**（重载会还原原生 alert）。
2. **填字段**。
3. **沉降重算**：`settleRecalc()` 等 networkidle + overlay 消失，让异步 echo 落地。
4. **按值重断言**：`ensureNumericValue()` 对 단가/수량 按值（comma 不敏感）重断言；若被 echo 改过则改回，再触发 blur+沉降，**让正确值成为提交前最后一次写入**。
5. **点 저장/추가**。
6. **等表单就绪**：`waitForItemFormReady()` 等 blockUI overlay 出现再消失、HS 输入重新可见——**事件式等待，禁止 `waitForTimeout` 死等**。

## 必加的不变量（核心）
- **加完一行后回读栅格行数**：`断言 栅格行数 == 已加行数`。让丢行**当场暴露**，而非保存后人工核对才发现。`refillIfEmpty` 抓不到"1"这种非空错值，回读行数能。
- 行失败时记录哪一行、什么校验信息（韩文），不静默跳过。

## 原则
- 修竞态 = 先复现（截图 + step 日志）→ 定位落点顺序 → 改成事件式 → 加不变量。遵 superpowers `systematic-debugging`。
- 间歇性失败 = 顺序竞态信号，不是 flaky。
- **人工门红线**：行项目录入属于建草稿流程，结束于 `임시저장`；**永不**自动提交 `발급/제출`。
