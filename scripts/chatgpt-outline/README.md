# ChatGPT 问答与章节导航

为 ChatGPT 长对话增加可搜索的问答与章节目录。当前版本：**1.2.1**。

[安装脚本](https://raw.githubusercontent.com/LeafHotaru/userscripts/main/scripts/chatgpt-outline/chatgpt-outline.user.js) · [反馈问题](https://github.com/LeafHotaru/userscripts/issues)

安装链接需要仓库公开；也可将本目录 `.user.js` 文件的完整内容复制到脚本管理器中新建脚本并保存。

## 功能

- 按提问组织回答，列出回答内的 h1–h6 章节标题。
- 搜索提问或章节，切换“问答章节”与“仅提问”模式。
- 折叠回答章节，点击目录跳转并突出目标位置。
- 提供当前位置提示、左右位置切换、深浅色适配。
- 提供“更早消息”“最新”“刷新”按钮。
- 包含 Dot 对话角色识别及可视化网格内部标题过滤逻辑。

## 使用

支持 `https://chatgpt.com/*` 与 `https://chat.openai.com/*`。
安装后刷新对话页面，点击“☰ 目录”展开导航。

| 操作 | 快捷键 |
| --- | --- |
| 展开或收起目录 | `Alt + Shift + O` |
| 焦点在目录内时收起 | `Esc` |

## 数据与权限

使用 `GM_getValue`、`GM_setValue` 保存展开状态、左右位置和显示模式。对话文本仅在当前页面内存中索引；脚本没有上传对话内容的网络请求，不使用外部依赖。脚本更新由脚本管理器通过配置的 GitHub 地址检查和下载。

## 限制

- 仅索引已载入或浏览过的消息；更早的历史需向上滚动加载。
- 虚拟化页面可能暂时卸载消息，需重新加载后再跳转。
- 依赖 ChatGPT 页面 DOM，网站更新可能影响识别；Dot 识别也依赖页面结构。
- 当前初始化只检查 JavaScript 语法，未重新进行真实页面兼容性测试。

## 版本记录

### 1.2.1

- 将现有脚本作为仓库初始版本导入。
- 添加 GPL-3.0-or-later 声明、项目链接与 GitHub 更新地址；保留原有功能逻辑。

## 许可证

[GPL-3.0-or-later](../../LICENSE)。
