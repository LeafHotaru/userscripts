# ChatGPT Conversation Outline

[Install from Greasy Fork](https://greasyfork.org/en/scripts/602151) · [中文说明](README.md)

Version **1.3.0**. A searchable outline of questions, answers, and headings for long ChatGPT conversations.

## Features

- Search questions and headings, collapse answer sections, and jump to messages.
- Switch between all headings and questions only.
- Highlight the current position, move the panel to either side, and follow light/dark mode.
- Use Earlier, Latest, and Refresh to navigate loaded history.
- Includes English and Chinese UI. The page language takes priority over the browser language; Chinese locales use Chinese, and other locales use English. Reload after changing ChatGPT's language. Conversation text is never translated.

## Usage

Install a userscript manager such as Tampermonkey, install the script, and refresh ChatGPT. Supported hosts: chatgpt.com and chat.openai.com.

Use **Alt+Shift+O** to toggle the panel. **Escape** closes it while focus is inside the panel.

Only loaded or previously viewed messages are indexed. Scroll up to load earlier history. ChatGPT DOM changes can affect detection, including Dot message roles.

## Privacy

Only panel preferences are persisted through GM_getValue and GM_setValue. Conversation content stays in page memory; the script makes no requests to upload it. Script updates are handled by your userscript manager.

## License

[GPL-3.0-or-later](../../LICENSE).
