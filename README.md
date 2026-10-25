# userscripts

LeafHotaru 的用户脚本集合，每个脚本独立安装、独立维护版本。

## 脚本列表

| 脚本 | 功能 | 安装 | 说明 |
| --- | --- | --- | --- |
| ChatGPT 问答与章节导航 | 长对话提问、回答和章节目录，搜索、折叠、位置提示 | [Greasy Fork 安装](https://greasyfork.org/zh-CN/scripts/602151) | [使用说明](scripts/chatgpt-outline/README.md) |

## 安装

1. 在浏览器中安装 Tampermonkey 等用户脚本管理器。
2. 点击上表的安装链接，并在脚本管理器中确认安装。
3. 打开或刷新目标网站。

GPT 大纲脚本已发布到 Greasy Fork，推荐使用上表的 Greasy Fork 入口安装。源码及开发版本保留在本仓库。

## 目录约定

每个脚本放在 `scripts/<script-id>/` 下，包含同名 `.user.js` 文件和独立 `README.md`。仓库根目录维护脚本索引与统一许可证。后续脚本沿用此结构，无需建立新仓库。

## 维护

- 新增脚本时，补齐名称、描述、匹配网站、版本、权限与 `@license`，更新上方索引。
- 每个脚本独立维护 `@version`；发布更新时递增版本号。
- 保持已发布脚本的 `@name`、`@namespace` 和文件路径稳定。
- `.user.js` 是可直接安装的源码，无需构建；提交前可使用 `node --check <文件路径>` 检查语法。
- 反馈问题时请附脚本名称、版本、浏览器及复现步骤，避免提交私人对话或账号信息。

## 许可证

除非另有说明，本仓库代码采用 **GNU GPL v3.0 或更新版本（GPL-3.0-or-later）**。
完整条款见 [LICENSE](LICENSE)，各脚本的 `@license` 与源码声明明确允许使用后续 GPL 版本。
