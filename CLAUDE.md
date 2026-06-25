# CLAUDE.md

## 하네스 / Harness: uTradeHub 关务自动化

**目标:** 把 uTradeHub 自动化项目（PDF→LLM抽取→人工门→Playwright填韩国关务门户）的开发任务，路由给专才 agent 团队并集成，守住人工门（永不自动 발급/제출）。

**触发:** uTradeHub / 구매확인서 / 关务自动化相关的**开发任务**请使用 `utradehub-orchestrator` 技能；它负责路由、派发、生成-检验与集成。简单问题可直接回答，无需走编排器。

**变更历史:**

| 日期 | 变更内容 | 对象 | 原因 |
|---|---|---|---|
| 2026-06-25 | 初始构建：5 专才 agent（playwright-reliability / extraction-eval / web-ux / release-packager / qa-verify）+ orchestrator/line-item-entry/golden-fixture 技能；混合模型、子Agent 执行模式 | 全体 | 组建 AI Agent 团队 |
