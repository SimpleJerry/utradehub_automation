#!/usr/bin/env node
// uTradeHub harness 护栏 (PreToolUse).
// 读 stdin 的 hook JSON。退出码 2 = 阻断工具调用；退出码 0 = 放行(stderr 作为警告/上下文显示)。
// 任何解析异常都放行——护栏绝不能把正常开发搞挂。
import { readFileSync } from 'node:fs';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0);
}

const tool = input.tool_name || '';
const ti = input.tool_input || {};
const block = (msg) => { console.error(msg); process.exit(2); };
const warn = (msg) => { console.error(msg); process.exit(0); };

// 取被编辑文件路径 + 新内容
function edited() {
  const path = ti.file_path || '';
  let content = '';
  if (tool === 'Write') content = ti.content || '';
  else if (tool === 'Edit') content = ti.new_string || '';
  else if (tool === 'MultiEdit') content = (ti.edits || []).map((e) => e.new_string || '').join('\n');
  return { path, content };
}

// 剥离注释，避免 "// 永不点击 발급" 这类文档误触发红线
function stripComments(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*|#|<!--)/.test(l))
    .join('\n');
}

if (tool === 'Edit' || tool === 'Write' || tool === 'MultiEdit') {
  const { path, content } = edited();
  const code = stripComments(content);

  // 1) 人工门红线 (BLOCK): 对 발급/제출/submit/issue 控件的实际点击动作
  const hasClickAction = /(\.(click|press|tap)\s*\(|dispatchevent\s*\(\s*['"]?click)/i.test(code);
  const hasSubmitToken = /(발급|제출|btn[_-]?(issue|submit)|\bissue\b|\bsubmit\b)/i.test(code);
  const byTextSubmit = /getby(role|text)\s*\([^)]*(발급|제출)/i.test(code);
  if ((hasClickAction && hasSubmitToken) || byTextSubmit) {
    block(
      [
        '⛔ 人工门红线: 检测到疑似自动点击 발급/제출/submit/issue 的代码改动。',
        `   文件: ${path}`,
        '   本项目必须停在 임시저장(草稿)，绝不自动提交(发급/제출)。',
        '   若确为误报(仅文案/变量名/检测用字符串)，请人工核实后单独批准本次改动。',
      ].join('\n'),
    );
  }

  // 2) driver 死等 (WARN)
  if (/playwright-driver\.ts$/i.test(path) && /waitfortimeout/i.test(code)) {
    warn('⚠ driver 纪律(仅警告): 新增了 waitForTimeout 死等。请改用事件式等待(waitForItemFormReady / settleRecalc)，参见 line-item-entry 技能。');
  }

  // 3) 抽取-fixture 联动 (WARN)
  if (/(llm-extractor|pdf-text)\.ts$/i.test(path)) {
    warn('🔗 提醒(仅警告): 改动了抽取核心。请同步更新 test/fixtures/pdf-extract 的 golden fixture 并复测准确率，参见 golden-fixture 技能。');
  }

  process.exit(0);
}

if (tool === 'Bash') {
  const cmd = ti.command || '';
  // 4) verify 门 (WARN): 仅 git commit 前提醒
  if (/git\s+commit/.test(cmd)) {
    warn('✅ 提醒(仅警告): 提交前请确认 `npm run verify` 通过(typecheck + lint + format:check + test)。');
  }
  process.exit(0);
}

process.exit(0);
