# site-contract Specification

## Purpose
TBD - created by archiving change site-automation-shell. Update Purpose after archive.
## Requirements
### Requirement: 集中声明的站点契约
uTradeHub 的全部选择器、角色名、韩文 label 与基础默认值 SHALL 定义在单一声明式模块；流程/执行代码 SHALL NOT 内联裸选择器，只引用契约键。

#### Scenario: 关键步骤的契约齐全且非空
- **WHEN** 读取站点契约
- **THEN** login、open-form、basic-info、supplier、line-items、save 各步骤的关键选择器键均存在且非空字符串

#### Scenario: 改版只改一处
- **WHEN** 站点某个选择器发生变化
- **THEN** 仅修改契约模块即可修复，流程与执行代码无需改动

### Requirement: 漂移检测给出指向具体步骤的错误
当某个契约锚点在页面上缺失时，漂移检测 SHALL 产出指明步骤与锚点的清晰错误（`DriftError`），SHALL NOT 让其退化为含糊的通用超时。

#### Scenario: 锚点缺失
- **WHEN** 某个被契约声明为关键锚点的元素在页面上不存在
- **THEN** 返回/抛出 `DriftError`，其中标明出问题的步骤名与锚点标识

#### Scenario: 锚点齐全
- **WHEN** 全部关键锚点存在
- **THEN** 漂移检测通过，不产生错误

