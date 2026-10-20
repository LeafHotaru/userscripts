// ==UserScript==
// @name         ChatGPT 问答与章节导航
// @namespace    local.chatgpt.history-navigator
// @version      1.2.1
// @description  为 ChatGPT 长对话增加提问、回答和章节目录，支持搜索、折叠及当前位置提示。
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @noframes
// @license      GPL-3.0-or-later
// @author       LeafHotaru
// @homepageURL  https://github.com/LeafHotaru/userscripts
// @supportURL   https://github.com/LeafHotaru/userscripts/issues
// @updateURL    https://raw.githubusercontent.com/LeafHotaru/userscripts/main/scripts/chatgpt-outline/chatgpt-outline.user.js
// @downloadURL  https://raw.githubusercontent.com/LeafHotaru/userscripts/main/scripts/chatgpt-outline/chatgpt-outline.user.js
// ==/UserScript==

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 LeafHotaru
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.


(() => {
  'use strict';
  const HOST_ID = 'cgn-history-navigator';
  if (document.getElementById(HOST_ID)) return;

  // Only appearance preferences are persisted. Conversation text stays in memory.
  const readPref = (name, fallback) => {
    try { return typeof GM_getValue === 'function' ? GM_getValue(name, fallback) : fallback; }
    catch { return fallback; }
  };
  const writePref = (name, value) => {
    try { if (typeof GM_setValue === 'function') GM_setValue(name, value); }
    catch { /* Navigation still works if extension storage is unavailable. */ }
  };
  let opened = Boolean(readPref('opened', window.innerWidth >= 1000));
  let side = readPref('side', 'right') === 'left' ? 'left' : 'right';
  let mode = readPref('mode', 'all') === 'questions' ? 'questions' : 'all';
  let route = location.pathname;
  let activePage = document.querySelector('[data-app-shell-active-page="true"]');
  let sequence = [];
  const records = new Map();
  const anonymousKeys = new WeakMap();
  let lastCandidates = new Map();
  let staleRouteNodes = new WeakMap();
  const folded = new Set();
  let nextAnonymous = 0;
  let query = '';
  let renderSignature = '';
  let refreshTimer = 0;
  let scrollFrame = 0;
  let activeKey = '';
  let jumpSerial = 0;
  let noticeTimer = 0;
  let flashTimer = 0;
  let entries = [];
  let buttons = new Map();

  const host = document.createElement('div');
  host.id = HOST_ID;
  // Shadow DOM prevents ChatGPT styles and our styles from affecting each other.
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
      :host { all:initial; --bg:#fff; --fg:#20252b; --muted:#69717d; --line:#e2e6ec;
        --hover:#f0f4f8; --accent:#087e66; --selected:#e1f3ee; --shadow:0 12px 38px #0002;
        color-scheme:light; font:13px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif; }
      :host([data-dark]) { --bg:#202123; --fg:#eceef1; --muted:#a8afb9; --line:#3c4149;
        --hover:#30363c; --accent:#75dcc1; --selected:#233e37; --shadow:0 12px 38px #0006; color-scheme:dark; }
      * { box-sizing:border-box; }
      [hidden] { display:none!important; }
      button,input,select { font:inherit; color:inherit; }
      button { cursor:pointer; border:0; background:transparent; }
      button:focus-visible,input:focus-visible,select:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
      button:hover { background:var(--hover); }
      .panel { position:fixed; z-index:2147483600; top:80px; bottom:110px; right:14px;
        width:304px; max-height:760px; display:flex; flex-direction:column; background:var(--bg);
        color:var(--fg); border:1px solid var(--line); border-radius:14px; box-shadow:var(--shadow); overflow:hidden; }
      :host([data-side="left"]) .panel { right:auto; left:14px; }
      header { display:flex; align-items:center; gap:5px; padding:12px 10px 8px 14px; }
      .title { margin:0; font-size:14px; font-weight:650; flex:1; }
      .icon { border-radius:7px; min-width:30px; height:30px; padding:4px; }
      .tools { padding:0 12px 9px; display:flex; gap:7px; }
      input { width:100%; min-width:0; padding:7px 9px; border:1px solid var(--line); border-radius:7px; background:var(--bg); }
      select { max-width:90px; border:1px solid var(--line); border-radius:7px; background:var(--bg); }
      .stats { color:var(--muted); font-size:11px; padding:0 14px 8px; }
      nav { flex:1; min-height:0; overflow:auto; overscroll-behavior:contain; padding:0 7px 12px; scrollbar-width:thin; }
      .group { border-top:1px solid var(--line); padding:7px 0; }
      .question-row { display:flex; align-items:flex-start; gap:2px; }
      .go { display:block; width:100%; text-align:left; border-radius:7px; padding:7px 8px;
        overflow-wrap:anywhere; font-size:12px; line-height:1.55; }
      .question { font-weight:650; flex:1; min-width:0; }
      .fold { flex:0 0 26px; height:30px; border-radius:6px; color:var(--muted); }
      .answer { color:var(--muted); font-size:11px; }
      .heading { padding-left:calc(14px + var(--depth,0)*11px); border-left:2px solid transparent; }
      .go[aria-current="location"] { background:var(--selected); color:var(--accent); border-left-color:var(--accent); }
      .empty { color:var(--muted); padding:20px 10px; text-align:center; }
      footer { border-top:1px solid var(--line); padding:8px 12px; color:var(--muted); font-size:11px; }
      .footer-actions { display:flex; gap:5px; margin-bottom:5px; }
      .footer-actions button { color:var(--fg); padding:4px 7px; border:1px solid var(--line); border-radius:6px; }
      .toggle { position:fixed; z-index:2147483600; right:14px; top:90px; border:1px solid var(--line);
        border-radius:12px; padding:10px 12px; background:var(--bg); color:var(--fg); box-shadow:var(--shadow); }
      :host([data-side="left"]) .toggle { right:auto; left:14px; }
      .flash { position:fixed; z-index:2147483599; border:2px solid var(--accent); border-radius:7px;
        background:#33c8a315; pointer-events:none; }
      @media(max-width:700px) {
        .panel { width:min(304px,calc(100vw - 24px)); top:64px; bottom:100px; right:12px; }
        :host([data-side="left"]) .panel { left:12px; }
        .toggle { top:auto; bottom:100px; right:12px; }
      }
      @media(prefers-reduced-motion:reduce) { * { scroll-behavior:auto!important; } }
    `;
  shadow.append(style);
  const create = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const makeButton = (text, title, onClick, className = 'icon') => {
    const el = create('button', className, text);
    el.type = 'button';
    el.title = title;
    el.setAttribute('aria-label', title);
    el.addEventListener('click', onClick);
    return el;
  };
  const panel = create('aside', 'panel');
  panel.setAttribute('aria-label', 'ChatGPT 问答与章节导航');
  const header = create('header');
  const title = create('h2', 'title', '问答导航');
  title.title = 'ChatGPT 问答与章节导航 v1.2.1';
  header.append(title);
  header.append(makeButton('⇄', '切换导航栏位置', () => {
    side = side === 'right' ? 'left' : 'right';
    writePref('side', side);
    syncAppearance();
  }));
  header.append(makeButton('−', '收起导航栏', () => setOpened(false)));
  const tools = create('div', 'tools');
  const search = create('input');
  search.type = 'search';
  search.placeholder = '搜索提问或章节';
  search.setAttribute('aria-label', '搜索提问或章节');
  search.addEventListener('input', () => { query = normalize(search.value); render(true); });
  const select = create('select');
  select.setAttribute('aria-label', '目录显示范围');
  for (const [value, label] of [['all', '问答章节'], ['questions', '仅提问']]) {
    const option = create('option', '', label);
    option.value = value;
    select.append(option);
  }
  select.value = mode;
  select.addEventListener('change', () => { mode = select.value; writePref('mode', mode); render(true); });
  tools.append(search, select);
  const stats = create('div', 'stats');
  const list = create('nav');
  list.setAttribute('aria-label', '对话目录');
  const footer = create('footer');
  const actions = create('div', 'footer-actions');
  actions.append(makeButton('更早消息', '滚动到已载入消息的开头，以触发页面加载更早消息', () => {
    const first = sequence.map(key => records.get(key)).find(rec => locateMessage(rec));
    if (first) jump(first.key);
    else showNotice('请先打开一个对话。');
  }, ''));
  actions.append(makeButton('最新', '跳到最新已载入的消息', () => {
    const last = sequence.map(key => records.get(key)).reverse().find(rec => locateMessage(rec));
    if (last) jump(last.key);
  }, ''));
  actions.append(makeButton('刷新', '重新读取当前页面目录', () => refresh(), ''));
  const help = create('div', '', '仅索引已载入/浏览过的消息；向上滚动可补充更早历史。');
  const notice = create('div');
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  footer.append(actions, help, notice);
  panel.append(header, tools, stats, list, footer);
  const toggle = makeButton('☰ 目录', '打开问答导航（Alt+Shift+O）', () => setOpened(true), 'toggle');
  toggle.setAttribute('aria-expanded', String(opened));
  const flash = create('div', 'flash');
  flash.hidden = true;
  shadow.append(panel, toggle, flash);
  document.body.append(host);

  function syncAppearance() {
    const root = document.documentElement;
    const explicit = root.getAttribute('data-theme');
    const dark = explicit === 'dark' || root.classList.contains('dark') ||
      (explicit !== 'light' && !root.classList.contains('light') && matchMedia('(prefers-color-scheme: dark)').matches);
    host.toggleAttribute('data-dark', dark);
    host.setAttribute('data-side', side);
    panel.hidden = !opened;
    toggle.hidden = opened;
    toggle.setAttribute('aria-expanded', String(opened));
  }
  function setOpened(value) {
    opened = value;
    writePref('opened', value);
    syncAppearance();
    if (value) { render(true); search.focus(); }
    else toggle.focus();
  }
  function normalize(text) { return (text || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase(); }
  function cleanText(el) { return (el?.textContent || '').replace(/\s+/g, ' ').trim(); }
  function short(text, length = 90) { return text.length > length ? text.slice(0, length) + '…' : text; }
  function showNotice(text) {
    clearTimeout(noticeTimer);
    notice.textContent = text;
    noticeTimer = setTimeout(() => { notice.textContent = ''; }, 6000);
  }
  function attrSelector(attribute, value) { return `[${attribute}="${CSS.escape(value)}"]`; }

  // Dot uses the same Markdown renderer for messages from *both* sides. The
  // assistant-message text-style attribute describes formatting, not authorship.
  const isDotPage = () => /^\/dots(?:\/|$)/.test(location.pathname);
  const DOT_REPLY = 'button[aria-label="回复"], button[aria-label="回复消息"], button[title="回复消息"], ' +
    'button[aria-label="Reply"], button[title="Reply"]';
  const DOT_REACTION = 'button[aria-label="选择一个表情回应"], button[title="添加表情回应"], ' +
    'button[aria-label="Add reaction"], button[aria-label="React"], button[title="Add reaction"]';

  function explicitRoleOf(el) {
    // Search upward first. The message's author metadata is stronger evidence
    // than the style applied to its Markdown content.
    for (let parent = el; parent && parent !== document.body; parent = parent.parentElement) {
      for (const attr of ['data-message-author-role', 'data-message-author', 'data-sender', 'data-role']) {
        const value = parent.getAttribute(attr);
        if (value === 'user' || value === 'assistant') return value;
      }
      if (parent.matches('[data-user-message-bubble]')) return 'user';
      const unitKey = parent.getAttribute('data-chatgpt-search-unit-key') || '';
      if (unitKey.endsWith(':user')) return 'user';
      if (unitKey.endsWith(':assistant')) return 'assistant';
    }
    return null;
  }

  function dotMessageMeta(el) {
    if (!isDotPage() || !el) return null;
    // Find the smallest container that owns exactly one reply/reaction toolbar.
    // Stop at a multi-message ancestor instead of associating a neighboring
    // message's toolbar with this message.
    for (let parent = el, depth = 0; parent && parent !== document.body && depth < 20;
      parent = parent.parentElement, depth++) {
      const replies = parent.querySelectorAll(DOT_REPLY);
      const reactions = parent.querySelectorAll(DOT_REACTION);
      if (replies.length > 1 || reactions.length > 1) return null;
      if (replies.length === 1 && reactions.length === 1) {
        return { container: parent, reply: replies[0], reaction: reactions[0] };
      }
    }
    return null;
  }

  function dotHasReadReceipt(container, content) {
    // The "已读 14:33" receipt is outside user message content; don't classify
    // a quoted "已读" inside an assistant response as a user message.
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    for (let textNode = walker.nextNode(); textNode; textNode = walker.nextNode()) {
      if (content.contains(textNode)) continue;
      const text = (textNode.nodeValue || '').trim();
      if (/^(?:已读|已送达|已发送|read|seen|delivered|sent)(?:\s+\d{1,2}:\d{2})?$/i.test(text)) return true;
    }
    return false;
  }

  function dotRoleOf(el) {
    const meta = dotMessageMeta(el);
    if (meta) {
      if (dotHasReadReceipt(meta.container, el)) return 'user';
      // Verified on the Dot conversation: user toolbar = Reply, React;
      // assistant toolbar = React, Reply. The buttons' DOM order distinguishes
      // the authors even though both messages use assistant-message styling.
      return (meta.reply.compareDocumentPosition(meta.reaction) & Node.DOCUMENT_POSITION_FOLLOWING)
        ? 'user' : 'assistant';
    }
    // Fallback for messages whose toolbar hasn't mounted: only use directional
    // layout evidence, never silently assign unknown Dot messages to assistant.
    for (let parent = el, depth = 0; parent && parent !== document.body && depth < 14;
      parent = parent.parentElement, depth++) {
      if (parent.querySelectorAll(DOT_REPLY).length > 1) break;
      const classes = parent.classList;
      if (['ml-auto', 'self-end', 'justify-self-end', 'flex-row-reverse'].some(c => classes.contains(c))) return 'user';
      if (['mr-auto', 'self-start', 'justify-self-start'].some(c => classes.contains(c))) return 'assistant';
    }
    return null;
  }

  function roleOf(el) {
    if (!el) return null;
    const explicit = explicitRoleOf(el);
    if (explicit) return explicit;
    if (isDotPage()) return dotRoleOf(el);
    if (el.matches('[data-markdown-text-style="assistant-message"]')) return 'assistant';
    return null;
  }
  function messageScope() { return activePage || document; }
  function isActiveContent(el, cache = new WeakMap()) {
    if (!el || el === document.documentElement) return true;
    if (cache.has(el)) return cache.get(el);
    const css = getComputedStyle(el);
    const visible = !el.matches(`#${HOST_ID}, [hidden], [aria-hidden="true"], [inert], [data-app-shell-active-page="false"]`) &&
      css.display !== 'none' && css.visibility !== 'hidden' && css.visibility !== 'collapse' &&
      isActiveContent(el.parentElement, cache);
    cache.set(el, visible);
    return visible;
  }
  function candidates(scope = messageScope()) {
    // Current renderer, plus the older article/message renderer.
    const roots = new Set();
    const visibility = new WeakMap();
    return Array.from(scope.querySelectorAll(
      '[data-message-author-role="user"], [data-message-author-role="assistant"], ' +
      '[data-user-message-bubble], [data-markdown-text-style="assistant-message"], ' +
      '[data-chatgpt-search-unit-key$=":user"], [data-chatgpt-search-unit-key$=":assistant"]'
    )).map(el => contentRoot(el, roleOf(el))).filter(el => {
      if (!isActiveContent(el, visibility)) return false;
      if (roots.has(el)) return false;
      roots.add(el);
      return true;
    });
  }
  function messageIdentity(node, role) {
    // A Dot message's toolbar container normally survives Markdown rerenders.
    // Anchor its anonymous key there rather than to a transient text element.
    const identityRoot = isDotPage() ? (dotMessageMeta(node)?.container || node) : node;
    const unit = identityRoot.closest('[data-chatgpt-search-unit-key]');
    const turn = identityRoot.closest('[data-turn-key]');
    const legacy = identityRoot.closest('[data-testid^="conversation-turn-"], article');
    const idNode = identityRoot.closest('[data-message-id], [data-chatgpt-selection-message-id]');
    const searchIds = identityRoot.closest('[data-chatgpt-search-message-ids]')?.getAttribute('data-chatgpt-search-message-ids') || '';
    const messageId = idNode?.getAttribute('data-message-id') || idNode?.getAttribute('data-chatgpt-selection-message-id') || searchIds.trim().split(/\s+/)[0];
    const unitKey = unit?.getAttribute('data-chatgpt-search-unit-key') || '';
    const turnKey = turn?.getAttribute('data-turn-key') || '';
    const legacyKey = legacy?.getAttribute('data-testid') || legacy?.id || '';
    // fallback-turn indices change when older history is inserted. Prefer message IDs.
    let key = messageId ? `id:${role}:${messageId}` : unitKey ? `unit:${role}:${unitKey}` : '';
    if (!key && (turnKey || legacyKey)) {
      const siblings = candidates(turn || legacy).filter(el => roleOf(el) === role);
      key = `turn:${turnKey || legacyKey}:${role}:${siblings.indexOf(node)}`;
    }
    if (!key) {
      if (!anonymousKeys.has(identityRoot)) anonymousKeys.set(identityRoot, `anonymous:${++nextAnonymous}`);
      key = anonymousKeys.get(identityRoot);
    }
    return { key, unitKey, turnKey, legacyKey, messageId };
  }
  function contentRoot(node, role) {
    if (role === 'user') return node.querySelector('[data-user-message-bubble]') ||
      // Dot's user Markdown looks identical to assistant Markdown. Selecting the
      // inner text also deduplicates parent author nodes and their descendants.
      (isDotPage() && node.querySelector('[data-markdown-text-style="assistant-message"], .markdown')) ||
      node.querySelector('[data-message-author-role="user"]') || node;
    return node.querySelector('[data-markdown-text-style="assistant-message"], .markdown') || node;
  }
  function headingNodes(root) {
    return Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter(el =>
      !el.closest('pre,code,[hidden],[aria-hidden="true"]') &&
      !el.closest('[data-d-component="grid-item"]') &&
      !el.classList.contains('sr-only') && cleanText(el)
    );
  }
  function mergeSequence(observed) {
    // Keep browsed messages if the page virtualizes them, and insert newly loaded
    // older messages before their nearest already-known successor.
    const next = sequence.filter(key => records.has(key));
    observed.forEach((key, index) => {
      if (next.includes(key)) return;
      const successor = observed.slice(index + 1).find(value => next.includes(value));
      const predecessor = observed.slice(0, index).reverse().find(value => next.includes(value));
      if (successor) next.splice(next.indexOf(successor), 0, key);
      else if (predecessor) next.splice(next.indexOf(predecessor) + 1, 0, key);
      else next.push(key);
    });
    sequence = next;
  }
  function refresh() {
    if (!host.isConnected) document.body.append(host);
    const nextPage = document.querySelector('[data-app-shell-active-page="true"]');
    if (nextPage !== activePage) {
      activePage = nextPage;
      records.clear(); sequence = []; folded.clear();
      staleRouteNodes = new WeakMap(); lastCandidates = new Map();
      query = ''; search.value = ''; activeKey = ''; renderSignature = '';
      jumpSerial++; flash.hidden = true;
    }
    // Keep-alive pages switch by active container, independently of URL timing.
    // Never quarantine a cached page's still-valid messages when it is reactivated.
    if (activePage) route = location.pathname;
    else if (route !== location.pathname) {
      const previousId = route.match(/\/c\/([^/]+)/)?.[1];
      const nextId = location.pathname.match(/\/c\/([^/]+)/)?.[1];
      // Sending the first prompt promotes the new-chat page to /c/<id> while
      // retaining that prompt's DOM. It is not a switch to another conversation.
      const promotedDraft = !previousId && nextId && [...records.values()].some(rec =>
        rec.role === 'user' && rec.node?.isConnected
      );
      const sameConversation = previousId && previousId === nextId;
      route = location.pathname;
      if (!promotedDraft && !sameConversation) {
        // The URL may change before React replaces the previous conversation DOM.
        staleRouteNodes = new WeakMap(lastCandidates);
        records.clear(); sequence = []; folded.clear();
        query = ''; search.value = ''; activeKey = ''; renderSignature = '';
        jumpSerial++; flash.hidden = true;
      }
    }
    syncAppearance();
    const observed = [];
    const turnsWithContent = new Set();
    const seenCandidates = new Map();
    for (const node of candidates()) {
      const role = roleOf(node) || roleOf(node.closest('[data-message-author-role], [data-chatgpt-search-unit-key]'));
      if (!role) continue;
      const identity = messageIdentity(node, role);
      if (observed.includes(identity.key)) continue;
      const root = contentRoot(node, role);
      const text = cleanText(root);
      // An empty markdown node is a mount placeholder, not evidence of generation.
      if (role === 'assistant' && !text && !root.querySelector('img,video,audio,canvas,svg,iframe')) {
        records.delete(identity.key);
        continue;
      }
      const fingerprint = `${identity.key}|${text}`;
      seenCandidates.set(node, fingerprint);
      if (staleRouteNodes.get(node) === fingerprint) continue;
      const headings = role === 'assistant' ? headingNodes(root).map((el, index) => ({
        text: cleanText(el), level: Number(el.tagName.slice(1)), node: el, index
      })) : [];
      records.set(identity.key, {
        ...identity, role, text: role === 'user' ? text : '',
        label: role === 'user' ? short(text || '图片 / 附件提问') : `回答${headings.length || !text ? '' : ' · ' + short(text, 58)}`,
        node: root, headings
      });
      observed.push(identity.key);
      if (identity.turnKey) turnsWithContent.add(`${identity.turnKey}:${role}`);
    }
    lastCandidates = seenCandidates;
    // A regenerated or edited turn must not retain deleted answer variants.
    for (const [key, rec] of records) {
      if (rec.turnKey && turnsWithContent.has(`${rec.turnKey}:${rec.role}`) && !observed.includes(key)) {
        records.delete(key); folded.delete(key);
      }
    }
    mergeSequence(observed);
    render();
    scheduleActive();
  }
  function groups() {
    const result = [];
    let group;
    for (const key of sequence) {
      const rec = records.get(key);
      if (!rec) continue;
      if (rec.role === 'user' || !group) {
        group = { question: rec.role === 'user' ? rec : null, answers: [] };
        result.push(group);
      }
      if (rec.role === 'assistant') group.answers.push(rec);
    }
    return result;
  }
  function entryKey(key, index) { return index === undefined ? key : `${key}/heading/${index}`; }
  function addGo(parent, rec, label, className, heading) {
    const key = entryKey(rec.key, heading?.index);
    const button = makeButton(label, heading?.text || rec.text || rec.label, () => jump(rec.key, heading?.index), `go ${className}`);
    button.title = short(button.title, 1000);
    if (heading) button.style.setProperty('--depth', String(heading.depth));
    if (key === activeKey) button.setAttribute('aria-current', 'location');
    buttons.set(key, button);
    parent.append(button);
  }
  function render(force = false) {
    // Entries are refreshed even if labels are unchanged: React can replace nodes.
    entries = sequence.flatMap(key => {
      const rec = records.get(key);
      if (!rec) return [];
      return [{ key, rec }, ...rec.headings.map(h => ({ key: entryKey(key, h.index), rec, heading: h.index }))];
    });
    const questionCount = sequence.filter(key => records.get(key)?.role === 'user').length;
    const headingCount = sequence.reduce((n, key) => n + (records.get(key)?.headings.length || 0), 0);
    stats.textContent = `已索引 ${questionCount} 个提问 · ${headingCount} 个章节`;
    const signature = JSON.stringify([sequence.map(key => {
      const rec = records.get(key);
      return [key, rec.label, rec.text, rec.headings.map(h => [h.text, h.level])];
    }), mode, query, [...folded]]);
    if (!force && signature === renderSignature) return;
    renderSignature = signature;
    const previousScroll = list.scrollTop;
    const focused = [...buttons].find(([, button]) => button === shadow.activeElement)?.[0];
    buttons = new Map();
    const fragment = document.createDocumentFragment();
    let questionNumber = 0;
    let visibleGroups = 0;
    for (const group of groups()) {
      const q = group.question;
      if (q) questionNumber++;
      const qMatches = !query || (q && normalize(q.text).includes(query));
      const answerMatches = mode === 'all' && group.answers.some(rec =>
        normalize(rec.label).includes(query) || rec.headings.some(h => normalize(h.text).includes(query))
      );
      if (!qMatches && !answerMatches) continue;
      if (mode === 'questions' && !q) continue;
      visibleGroups++;
      const section = create('section', 'group');
      const groupKey = q?.key || group.answers[0]?.key;
      const collapsed = !query && folded.has(groupKey);
      if (q) {
        const row = create('div', 'question-row');
        addGo(row, q, `${questionNumber}. ${q.label}`, 'question');
        if (mode === 'all' && group.answers.length) {
          const fold = makeButton(collapsed ? '▸' : '▾', collapsed ? '展开回答章节' : '折叠回答章节', () => {
            if (folded.has(groupKey)) folded.delete(groupKey); else folded.add(groupKey);
            render(true);
          }, 'fold');
          fold.setAttribute('aria-expanded', String(!collapsed));
          row.append(fold);
        }
        section.append(row);
      }
      if (mode === 'all' && !collapsed) {
        for (const rec of group.answers) {
          const labelMatches = normalize(rec.label).includes(query);
          const visibleHeadings = rec.headings.filter(h => qMatches || labelMatches || normalize(h.text).includes(query));
          if (query && !qMatches && !labelMatches && !visibleHeadings.length) continue;
          addGo(section, rec, rec.label, 'answer');
          const minLevel = Math.min(6, ...rec.headings.map(h => h.level));
          for (const h of visibleHeadings) addGo(section, rec, h.text, 'heading', { ...h, depth: h.level - minLevel });
        }
      }
      fragment.append(section);
    }
    if (!visibleGroups) fragment.append(create('div', 'empty', query ? '没有匹配的提问或章节' : '打开对话后，这里会显示提问和回答章节。'));
    list.replaceChildren(fragment);
    list.scrollTop = previousScroll;
    if (focused) buttons.get(focused)?.focus({ preventScroll: true });
  }
  function locateMessage(rec) {
    if (!rec) return null;
    if (rec.node?.isConnected && messageScope().contains(rec.node) && isActiveContent(rec.node)) return rec.node;
    let scope;
    if (rec.messageId) scope = messageScope().querySelector(
      `${attrSelector('data-message-id', rec.messageId)},${attrSelector('data-chatgpt-selection-message-id', rec.messageId)},[data-chatgpt-search-message-ids~="${CSS.escape(rec.messageId)}"]`
    );
    if (!scope && !rec.messageId && rec.unitKey) scope = messageScope().querySelector(attrSelector('data-chatgpt-search-unit-key', rec.unitKey));
    if (!scope && rec.turnKey) scope = messageScope().querySelector(attrSelector('data-turn-key', rec.turnKey));
    if (!scope && rec.legacyKey) scope = messageScope().querySelector(
      `${attrSelector('data-testid', rec.legacyKey)},${attrSelector('id', rec.legacyKey)}`
    );
    if (!scope || !isActiveContent(scope)) return null;
    const node = roleOf(scope) === rec.role ? scope : candidates(scope).find(el => messageIdentity(el, rec.role).key === rec.key);
    return node ? contentRoot(node, rec.role) : null;
  }
  function locateTarget(rec, headingIndex) {
    const root = locateMessage(rec);
    if (!root) return null;
    return headingIndex === undefined ? root : headingNodes(root)[headingIndex] || null;
  }
  function scrollParent(el) {
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight + 2) return parent;
    }
    return document.scrollingElement;
  }
  function scrollToTarget(el, smooth = true) {
    const parent = scrollParent(el);
    const rect = el.getBoundingClientRect();
    const behavior = smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto';
    if (parent === document.scrollingElement) window.scrollTo({ top: window.scrollY + rect.top - 90, behavior });
    else {
      const bounds = parent.getBoundingClientRect();
      // Works with both ordinary and column-reverse scroll containers (negative scrollTop).
      parent.scrollTo({ top: parent.scrollTop + rect.top - bounds.top - 90, behavior });
    }
  }
  function showFlash(el) {
    const rect = el.getBoundingClientRect();
    flash.style.cssText = `left:${Math.max(0, rect.left - 4)}px;top:${Math.max(0, rect.top - 4)}px;width:${Math.min(rect.width + 8, innerWidth)}px;height:${Math.min(rect.height + 8, 140)}px`;
    flash.hidden = false;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flash.hidden = true; }, 1200);
  }
  async function jump(key, headingIndex) {
    const serial = ++jumpSerial;
    const rec = records.get(key);
    if (!rec) return;
    let target = locateTarget(rec, headingIndex);
    if (!target && rec.turnKey) {
      const placeholder = messageScope().querySelector(attrSelector('data-turn-key', rec.turnKey));
      if (placeholder) {
        scrollToTarget(placeholder, false);
        // Give a virtualized turn time to mount before locating the actual heading.
        for (let i = 0; i < 24 && !target; i++) {
          await new Promise(resolve => setTimeout(resolve, 120));
          if (serial !== jumpSerial) return;
          target = locateTarget(rec, headingIndex);
        }
      }
    }
    if (serial !== jumpSerial) return;
    if (!target) { showNotice('这条消息暂未挂载，请向上滚动加载历史后再点击。'); return; }
    scrollToTarget(target);
    activeKey = entryKey(key, headingIndex);
    markActive();
    setTimeout(() => { if (serial === jumpSerial && target.isConnected) showFlash(target); }, 450);
    if (innerWidth <= 700) setOpened(false);
  }
  function markActive() {
    for (const [key, button] of buttons) {
      if (key === activeKey) button.setAttribute('aria-current', 'location');
      else button.removeAttribute('aria-current');
    }
  }
  function scheduleActive() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateActive);
  }
  function updateActive() {
    scrollFrame = 0;
    if (!opened) return;
    // Use current connected nodes only. Avoid re-querying unmounted cached turns on every scroll.
    const live = entries.map(entry => ({
      entry, node: entry.heading === undefined ? entry.rec.node : entry.rec.headings[entry.heading]?.node
    })).filter(item => item.node?.isConnected);
    let above;
    let below;
    for (const item of live) {
      const rect = item.node.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      if (rect.top <= 130 && (!above || rect.top >= above.top)) above = { key: item.entry.key, top: rect.top };
      else if (rect.top > 130 && (!below || rect.top < below.top)) below = { key: item.entry.key, top: rect.top };
    }
    const key = above?.key || below?.key || '';
    if (key !== activeKey) { activeKey = key; markActive(); }
  }
  function scheduleRefresh() {
    // Throttle rather than debounce: an uninterrupted token stream must still update the outline.
    if (!refreshTimer) refreshTimer = setTimeout(() => { refreshTimer = 0; refresh(); }, 280);
  }
  const observer = new MutationObserver(mutations => {
    if (mutations.some(m => !host.contains(m.target))) scheduleRefresh();
  });
  observer.observe(document.body, {
    childList: true, subtree: true, characterData: true, attributes: true,
    attributeFilter: ['data-app-shell-active-page', 'style', 'class', 'inert', 'data-message-author-role', 'data-message-author', 'data-sender', 'data-role', 'data-message-id', 'data-chatgpt-search-message-ids', 'data-chatgpt-selection-message-id', 'data-turn-key', 'data-chatgpt-search-unit-key', 'data-user-message-bubble', 'data-markdown-text-style', 'aria-label', 'title', 'hidden', 'aria-hidden']
  });
  new MutationObserver(syncAppearance).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncAppearance);
  document.addEventListener('scroll', event => {
    if (event.composedPath().includes(host)) return;
    flash.hidden = true;
    scheduleActive();
  }, { capture: true, passive: true });
  window.addEventListener('resize', scheduleActive, { passive: true });
  document.addEventListener('keydown', event => {
    if (event.altKey && event.shiftKey && event.code === 'KeyO' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault(); setOpened(!opened);
    } else if (event.key === 'Escape' && opened && event.composedPath().includes(host)) setOpened(false);
  });
  // No history API monkey-patching: works across client-side conversation switches.
  setInterval(() => { if (route !== location.pathname) refresh(); }, 700);
  refresh();
})();
