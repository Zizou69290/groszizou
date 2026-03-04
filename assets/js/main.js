const menuToggle = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");
const pageParams = new URLSearchParams(window.location.search);
const requestedEditReviewId = String(pageParams.get("edit") || "").trim();

if (menuToggle && menu) {
  menuToggle.addEventListener("click", () => {
    menu.classList.toggle("open");
  });
}

const reviewsGrid = document.getElementById("reviews-grid");
const managerSection = document.getElementById("manager");
const managerList = document.getElementById("manager-list");
const form = document.getElementById("review-form");
const formTitle = document.getElementById("form-title");
const addBtn = document.getElementById("new-review");
const cancelBtn = document.getElementById("cancel-form");
const blocksList = document.getElementById("blocks-list");
const addBlockBtn = document.getElementById("add-block-btn");
const previewBox = document.getElementById("review-preview");
const filterButtonsHost = document.querySelector(".filters");
const reviewsSortSelect = document.getElementById("reviews-sort");
const reviewsUserFilterSelect = document.getElementById("reviews-user-filter");
const reviewsSearchInput = document.getElementById("reviews-search");
const managerReviewsSortSelect = document.getElementById("manager-reviews-sort");

const topList = document.getElementById("tops-manager-list");
const topForm = document.getElementById("top-form");
const topFormTitle = document.getElementById("top-form-title");
const newTopBtn = document.getElementById("new-top");
const cancelTopBtn = document.getElementById("cancel-top-form");
const addTopItemBtn = document.getElementById("add-top-item");
const topItemsList = document.getElementById("top-items-list");
const managerTopsSortSelect = document.getElementById("manager-tops-sort");

const authUsername = document.getElementById("auth-username");
const authPassword = document.getElementById("auth-password");
const loginBtn = document.getElementById("auth-login");
const registerBtn = document.getElementById("auth-register");
const logoutBtn = document.getElementById("auth-logout");
const authStatus = document.getElementById("auth-status");

const toolColor = document.getElementById("tool-color");
const toolColorApply = document.getElementById("tool-color-apply");
const toolSize = document.getElementById("tool-size");
const toolSizeApply = document.getElementById("tool-size-apply");
const toolHighlight = document.getElementById("tool-highlight");
const toolHighlightApply = document.getElementById("tool-highlight-apply");
const wrapToolButtons = document.querySelectorAll("[data-wrap-tag]");
const blockActionButtons = document.querySelectorAll("[data-block-action]");
const contentModeButtons = document.querySelectorAll("[data-content-mode]");
const blocksEditorSection = document.getElementById("blocks-editor-section");
const richEditorSection = document.getElementById("rich-editor-section");
const richEditor = document.getElementById("rich-editor");
const richCmdButtons = document.querySelectorAll("[data-rich-cmd]");
const richMediaSizeButtons = document.querySelectorAll("[data-media-size]");
const richMediaAlignButtons = document.querySelectorAll("[data-media-align]");
const richLinkBtn = document.getElementById("rich-link-btn");
const richImageBtn = document.getElementById("rich-image-btn");
const richVideoBtn = document.getElementById("rich-video-btn");
const richAudioBtn = document.getElementById("rich-audio-btn");
const richColsBtn = document.getElementById("rich-cols-btn");
const richSpoilerBtn = document.getElementById("rich-spoiler-btn");
const richColor = document.getElementById("rich-color");
const richSize = document.getElementById("rich-size");
const reviewBodyHtml = document.getElementById("review-body-html");
const metaAuthorRow = document.getElementById("meta-author-row");
const metaDirectorRow = document.getElementById("meta-director-row");
const metaStudioRow = document.getElementById("meta-studio-row");

const DEFAULT_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'><defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#1a2a36'/><stop offset='1' stop-color='#243b4a'/></linearGradient></defs><rect width='1200' height='630' fill='url(#g)'/><text x='50%' y='50%' text-anchor='middle' fill='#b8c2cc' font-size='54' font-family='Arial, sans-serif'>Sans cover</text></svg>"
  );

let selectedFilter = "all";
let selectedSort = "date-desc";
let selectedUserFilter = "all";
let selectedReviewsSearch = "";
let selectedManagerReviewSort = "date-desc";
let selectedManagerTopSort = "date-desc";
let editingId = null;
let editingTopId = null;
let cachedReviews = [];
let activeTextArea = null;
let editingAccent = "";
let currentContentMode = "blocks";
let currentUser = null;
const ADMIN_USERNAME = "admin";
let selectedRichMediaWrapper = null;
let richMediaResizeState = null;
let pendingEditReviewId = requestedEditReviewId || "";
const blockEditorHistory = new WeakMap();

function isAdminUser(user) {
  return String(user?.username || "").trim().toLowerCase() === ADMIN_USERNAME;
}

const fmtDate = (iso) => {
  if (!iso || !iso.includes("-")) return "Date libre";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

const escapeHtml = (text) =>
  String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function ownerBadge(username) {
  if (!username) return "";
  return `<span class="owner-badge"><span>${escapeHtml(username)}</span></span>`;
}

function normalizeUsernameValue(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeSearchValue(value) {
  return String(value || "").trim().toLowerCase();
}

function readExternalLinksFromForm() {
  if (!form) return [];
  const pairs = [
    { label: form.elements.linkLabel1?.value, url: form.elements.linkUrl1?.value },
    { label: form.elements.linkLabel2?.value, url: form.elements.linkUrl2?.value },
    { label: form.elements.linkLabel3?.value, url: form.elements.linkUrl3?.value }
  ];
  return pairs
    .map((entry) => ({
      label: String(entry.label || "").trim(),
      url: String(entry.url || "").trim()
    }))
    .filter((entry) => entry.label && entry.url);
}

function fillExternalLinksInForm(review) {
  if (!form) return;
  const links = Array.isArray(review?.externalLinks) ? review.externalLinks : [];
  const get = (idx, key) => String(links[idx]?.[key] || "").trim();
  if (form.elements.linkLabel1) form.elements.linkLabel1.value = get(0, "label");
  if (form.elements.linkUrl1) form.elements.linkUrl1.value = get(0, "url");
  if (form.elements.linkLabel2) form.elements.linkLabel2.value = get(1, "label");
  if (form.elements.linkUrl2) form.elements.linkUrl2.value = get(1, "url");
  if (form.elements.linkLabel3) form.elements.linkLabel3.value = get(2, "label");
  if (form.elements.linkUrl3) form.elements.linkUrl3.value = get(2, "url");
}

async function openRequestedReviewForEdit() {
  if (!pendingEditReviewId || !window.ReviewsStore?.getById) return;
  const reviewId = pendingEditReviewId;
  pendingEditReviewId = "";
  let item = cachedReviews.find((entry) => entry.id === reviewId) || null;
  if (!item) {
    try {
      item = await window.ReviewsStore.getById(reviewId);
    } catch {
      item = null;
    }
  }
  if (!item) return;
  openForm(item);
}

function renderRichText(text) {
  let html = escapeHtml(text);
  const codeBlocks = [];
  html = html.replace(/\[code\]([\s\S]*?)\[\/code\]/gi, (_, code) => {
    const token = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre class="forum-code"><code>${code}</code></pre>`);
    return token;
  });
  html = html.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<strong>$1</strong>");
  html = html.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<em>$1</em>");
  html = html.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<span class="u-text">$1</span>');
  html = html.replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<span style="text-decoration:line-through">$1</span>');
  html = html.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, '<blockquote class="forum-quote">$1</blockquote>');
  html = html.replace(/\[left\]([\s\S]*?)\[\/left\]/gi, '<div style="text-align:left">$1</div>');
  html = html.replace(/\[center\]([\s\S]*?)\[\/center\]/gi, '<div style="text-align:center">$1</div>');
  html = html.replace(/\[right\]([\s\S]*?)\[\/right\]/gi, '<div style="text-align:right">$1</div>');
  html = html.replace(/\[justify\]([\s\S]*?)\[\/justify\]/gi, '<div style="text-align:justify">$1</div>');
  html = html.replace(/\[color=(#[0-9a-f]{3,8})\]([\s\S]*?)\[\/color\]/gi, '<span style="color:$1">$2</span>');
  html = html.replace(/\[size=(\d{1,2})\]([\s\S]*?)\[\/size\]/gi, '<span style="font-size:$1px">$2</span>');
  html = html.replace(/\[mark=(#[0-9a-f]{3,8})\]([\s\S]*?)\[\/mark\]/gi, '<span style="background-color:$1;padding:0 .15em">$2</span>');
  html = html.replace(
    /\[url=(https?:\/\/[^\]\s]+)\]([\s\S]*?)\[\/url\]/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>'
  );
  html = html.replace(
    /\[url\](https?:\/\/[^\[]+)\[\/url\]/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  html = html.replace(/\[img\](https?:\/\/[^\[]+)\[\/img\]/gi, '<img src="$1" alt="image" />');
  html = html.replace(/\[hr\]/gi, "<hr>");
  html = html.replace(/\[list\]([\s\S]*?)\[\/list\]/gi, (_, inner) => {
    const items = String(inner || "")
      .split(/\[\*\]/i)
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length ? `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>` : "";
  });
  html = html.replace(/\[list=1\]([\s\S]*?)\[\/list\]/gi, (_, inner) => {
    const items = String(inner || "")
      .split(/\[\*\]/i)
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length ? `<ol>${items.map((item) => `<li>${item}</li>`).join("")}</ol>` : "";
  });
  html = html.replace(/\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi, '<button class="spoiler-text" type="button">$1</button>');
  html = html.replace(/\n/g, "<br>");
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`__CODE_BLOCK_${idx}__`, block);
  });
  return html;
}

function bindSpoilers(root) {
  root.querySelectorAll(".spoiler-text").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("revealed");
    });
  });
}

function wrapSelection(openTag, closeTag) {
  const textarea = getTargetBlockTextarea();
  if (!textarea) return;
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const value = textarea.value;
  const selected = value.slice(start, end);
  const next = `${value.slice(0, start)}${openTag}${selected}${closeTag}${value.slice(end)}`;
  textarea.value = next;
  textarea.focus();
  textarea.selectionStart = start + openTag.length;
  textarea.selectionEnd = end + openTag.length;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function scoreToStars(score) {
  if (!Number.isFinite(score)) return "☆☆☆☆☆";
  const full = Math.max(0, Math.min(5, Math.round(score / 2)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function reviewCard(item) {
  const article = document.createElement("article");
  article.className = "review-card";
  article.dataset.type = item.category;
  article.tabIndex = 0;
  article.setAttribute("role", "link");
  const accent = item.accent || "#f25f29";
  const target = `review.html?id=${encodeURIComponent(item.id)}`;

  const ownerMeta = item.ownerUsername ? `, par ${ownerBadge(item.ownerUsername)}` : "";
  article.innerHTML = `
    <img src="${item.cover || DEFAULT_COVER}" alt="${escapeHtml(item.title || "Review")}" />
    <div class="card-body">
      <p class="meta">Publié le ${fmtDate(item.date)}${ownerMeta}</p>
      <h3>${escapeHtml(item.title || "Sans titre")}</h3>
      <p>${escapeHtml(item.summary || "Aucun résumé.")}</p>
      <div class="card-footer">
        <span class="score" style="color:${accent}">${scoreToStars(item.score)}${Number.isFinite(item.score) ? ` (${item.score}/10)` : ""}</span>
      </div>
    </div>
  `;

  article.addEventListener("click", () => {
    window.location.href = target;
  });
  article.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      window.location.href = target;
    }
  });
  return article;
}

function managerRow(item) {
  const row = document.createElement("div");
  row.className = "manager-row";
  const ownerMeta = item.ownerUsername ? ` &middot; ${ownerBadge(item.ownerUsername)}` : "";
  row.innerHTML = `
    <div>
      <strong>${escapeHtml(item.title || "Sans titre")}</strong>
      <span>${window.ReviewsStore.categories[item.category] || item.category} &middot; ${fmtDate(item.date)}${ownerMeta}</span>
    </div>
    <div class="row-actions">
      <button class="action-btn secondary" data-action="edit">Éditer</button>
      <button class="action-btn danger" data-action="delete">Supprimer</button>
    </div>
  `;

  row.querySelector('[data-action="edit"]').addEventListener("click", () => openForm(item));
  row.querySelector('[data-action="delete"]').addEventListener("click", async () => {
    if (!window.confirm(`Supprimer "${item.title || "Sans titre"}" ?`)) return;
    try {
      await window.ReviewsStore.remove(item.id);
      await renderAll();
    } catch (error) {
      window.alert(`Suppression impossible : ${error.message}`);
    }
  });
  return row;
}

function topRow(item) {
  const row = document.createElement("div");
  row.className = "manager-row";
  const ownerMeta = item.ownerUsername ? ` &middot; ${ownerBadge(item.ownerUsername)}` : "";
  row.innerHTML = `
    <div>
      <strong>${escapeHtml(item.title || "Sans titre")}</strong>
      <span>${window.ReviewsStore.categories[item.category] || item.category || "Autre"}${item.year ? ` &middot; ${item.year}` : ""}${ownerMeta}</span>
    </div>
    <div class="row-actions">
      <button class="action-btn secondary" data-action="edit-top">Éditer</button>
      <button class="action-btn danger" data-action="delete-top">Supprimer</button>
    </div>
  `;

  row.querySelector('[data-action="edit-top"]').addEventListener("click", () => openTopForm(item));
  row.querySelector('[data-action="delete-top"]').addEventListener("click", async () => {
    if (!window.confirm(`Supprimer le top "${item.title || "Sans titre"}" ?`)) return;
    try {
      await window.ReviewsStore.removeTop(item.id);
      await renderTopsManager();
    } catch (error) {
      window.alert(`Suppression impossible : ${error.message}`);
    }
  });
  return row;
}

function updateBlockIndex() {
  if (!blocksList) return;
  [...blocksList.querySelectorAll(".block-item")].forEach((row, idx) => {
    const index = row.querySelector(".block-index");
    if (index) index.textContent = `Bloc ${idx + 1}`;
  });
}

function getBlockFieldsHtml(type, block) {
  if (type === "text") {
    return `<textarea class="block-content" rows="5" placeholder="Ton texte...">${escapeHtml(block.content || "")}</textarea>`;
  }
  if (type === "image-text-left" || type === "image-text-right") {
    return `
      <input class="block-url" type="url" placeholder="URL image" value="${escapeHtml(block.url || "")}" />
      <input class="block-caption" type="text" placeholder="Légende image (optionnel)" value="${escapeHtml(block.caption || "")}" />
      <textarea class="block-content" rows="5" placeholder="Texte à côté de l'image...">${escapeHtml(block.content || "")}</textarea>
    `;
  }
  if (type === "two-images") {
    return `
      <input class="block-url" type="url" placeholder="URL image gauche" value="${escapeHtml(block.url || "")}" />
      <input class="block-caption" type="text" placeholder="Légende image gauche (optionnel)" value="${escapeHtml(block.caption || "")}" />
      <input class="block-url-2" type="url" placeholder="URL image droite" value="${escapeHtml(block.url2 || "")}" />
      <input class="block-caption-2" type="text" placeholder="Légende image droite (optionnel)" value="${escapeHtml(block.caption2 || "")}" />
    `;
  }
  return `
    <input class="block-url" type="url" placeholder="URL" value="${escapeHtml(block.url || "")}" />
    <input class="block-caption" type="text" placeholder="Légende (optionnel)" value="${escapeHtml(block.caption || "")}" />
  `;
}

function insertAtSelection(text) {
  const textarea = getTargetBlockTextarea();
  if (!textarea) return;
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const value = textarea.value;
  textarea.value = `${value.slice(0, start)}${text}${value.slice(end)}`;
  textarea.focus();
  const cursor = start + text.length;
  textarea.selectionStart = cursor;
  textarea.selectionEnd = cursor;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function wrapLinesAsList(ordered = false) {
  const textarea = getTargetBlockTextarea();
  if (!textarea) return;
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const value = textarea.value;
  const selected = value.slice(start, end).trim();
  if (!selected) {
    const tag = ordered ? "[list=1]\n[*]Item 1\n[*]Item 2\n[/list]" : "[list]\n[*]Item 1\n[*]Item 2\n[/list]";
    insertAtSelection(tag);
    return;
  }
  const items = selected
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `[*]${line}`)
    .join("\n");
  const open = ordered ? "[list=1]" : "[list]";
  const wrapped = `${open}\n${items}\n[/list]`;
  textarea.value = `${value.slice(0, start)}${wrapped}${value.slice(end)}`;
  textarea.focus();
  textarea.selectionStart = start;
  textarea.selectionEnd = start + wrapped.length;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function getTargetBlockTextarea() {
  if (document.activeElement instanceof HTMLTextAreaElement && document.activeElement.classList.contains("block-content")) {
    activeTextArea = document.activeElement;
    return activeTextArea;
  }
  if (activeTextArea && blocksList?.contains(activeTextArea)) return activeTextArea;
  const fallback = blocksList?.querySelector(".block-content");
  if (fallback instanceof HTMLTextAreaElement) {
    activeTextArea = fallback;
    return fallback;
  }
  return null;
}

function initBlockHistory(textarea) {
  if (!(textarea instanceof HTMLTextAreaElement)) return null;
  let state = blockEditorHistory.get(textarea);
  if (!state) {
    state = { stack: [textarea.value], index: 0, applying: false };
    blockEditorHistory.set(textarea, state);
  }
  return state;
}

function recordBlockHistory(textarea) {
  const state = initBlockHistory(textarea);
  if (!state || state.applying) return;
  const value = textarea.value;
  if (state.stack[state.index] === value) return;
  state.stack = state.stack.slice(0, state.index + 1);
  state.stack.push(value);
  if (state.stack.length > 300) state.stack.shift();
  state.index = state.stack.length - 1;
}

function applyBlockHistoryStep(textarea, direction) {
  const state = initBlockHistory(textarea);
  if (!state) return false;
  const nextIndex = state.index + direction;
  if (nextIndex < 0 || nextIndex >= state.stack.length) return false;
  state.index = nextIndex;
  state.applying = true;
  textarea.value = state.stack[state.index];
  textarea.focus();
  const end = textarea.value.length;
  textarea.selectionStart = end;
  textarea.selectionEnd = end;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  state.applying = false;
  return true;
}

function handleBlockTextareaKeydown(event) {
  const textarea = event.currentTarget;
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  if (!(event.ctrlKey || event.metaKey)) return;
  const key = String(event.key || "").toLowerCase();
  if (key === "z" && !event.shiftKey) {
    if (applyBlockHistoryStep(textarea, -1)) {
      event.preventDefault();
    }
    return;
  }
  if (key === "y" || (key === "z" && event.shiftKey)) {
    if (applyBlockHistoryStep(textarea, 1)) {
      event.preventDefault();
    }
  }
}

function applyBlockAction(action) {
  if (!action) return;
  if (action === "quote") return wrapSelection("[quote]\n", "\n[/quote]");
  if (action === "code") return wrapSelection("[code]\n", "\n[/code]");
  if (action === "strike") return wrapSelection("[s]", "[/s]");
  if (action === "left") return wrapSelection("[left]", "[/left]");
  if (action === "center") return wrapSelection("[center]", "[/center]");
  if (action === "right") return wrapSelection("[right]", "[/right]");
  if (action === "justify") return wrapSelection("[justify]", "[/justify]");
  if (action === "hr") return insertAtSelection("\n[hr]\n");
  if (action === "undo") {
    const textarea = getTargetBlockTextarea();
    if (!textarea) return;
    applyBlockHistoryStep(textarea, -1);
    return;
  }
  if (action === "redo") {
    const textarea = getTargetBlockTextarea();
    if (!textarea) return;
    applyBlockHistoryStep(textarea, 1);
    return;
  }
  if (action === "clear") {
    const textarea = getTargetBlockTextarea();
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    if (end <= start) return;
    const value = textarea.value;
    const selected = value.slice(start, end);
    const cleaned = selected
      .replace(/\[\/?(?:b|i|u|s|spoiler|quote|left|center|right|justify|url|list|list=1)\]/gi, "")
      .replace(/\[(?:color|size|mark)=[^\]]+\]/gi, "")
      .replace(/\[\/(?:color|size|mark)\]/gi, "")
      .replace(/\[\*\]/gi, "");
    textarea.value = `${value.slice(0, start)}${cleaned}${value.slice(end)}`;
    textarea.selectionStart = start;
    textarea.selectionEnd = start + cleaned.length;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  if (action === "ul") return wrapLinesAsList(false);
  if (action === "ol") return wrapLinesAsList(true);
  if (action === "url") {
    const url = window.prompt("URL du lien");
    if (!url) return;
    const textarea = getTargetBlockTextarea();
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = textarea.value.slice(start, end).trim();
    const bb = selected ? `[url=${url.trim()}]${selected}[/url]` : `[url]${url.trim()}[/url]`;
    return insertAtSelection(bb);
  }
  if (action === "img") {
    const url = window.prompt("URL de l'image");
    if (!url) return;
    return insertAtSelection(`[img]${url.trim()}[/img]`);
  }
}

function applyRichTextColor(color) {
  if (!richEditor || !color) return;
  richEditor.focus();
  const selection = window.getSelection();
  const selected = selection ? String(selection.toString() || "").trim() : "";
  if (selected) {
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("foreColor", false, color);
  } else {
    document.execCommand("insertHTML", false, `<span style="color:${escapeHtml(color)}">Texte</span>`);
  }
  renderPreview();
}

function applyRichTextSize(px) {
  if (!richEditor || !px) return;
  const size = Math.max(10, Math.min(72, Number(px) || 16));
  richEditor.focus();
  const selection = window.getSelection();
  const selected = selection ? String(selection.toString() || "").trim() : "";
  if (selected) {
    document.execCommand("insertHTML", false, `<span style="font-size:${size}px">${escapeHtml(selected)}</span>`);
  } else {
    document.execCommand("insertHTML", false, `<span style="font-size:${size}px">Texte</span>`);
  }
  renderPreview();
}

function placeRichCaretAtPoint(clientX, clientY) {
  if (!richEditor) return false;
  const selection = window.getSelection();
  if (!selection) return false;
  let range = null;

  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(clientX, clientY);
    if (pos && pos.offsetNode) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
    }
  } else if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(clientX, clientY);
    if (range) range.collapse(true);
  }

  if (!range) {
    const node = document.elementFromPoint(clientX, clientY);
    if (node && richEditor.contains(node)) {
      range = document.createRange();
      const target = node.nodeType === Node.TEXT_NODE ? node : node.lastChild || node;
      if (target.nodeType === Node.TEXT_NODE) {
        const len = target.textContent?.length || 0;
        range.setStart(target, len);
      } else {
        range.selectNodeContents(target);
        range.collapse(false);
      }
    } else {
      range = document.createRange();
      range.selectNodeContents(richEditor);
      range.collapse(false);
    }
  }

  if (!richEditor.contains(range.startContainer) && range.startContainer !== richEditor) return false;

  selection.removeAllRanges();
  selection.addRange(range);
  richEditor.focus();
  return true;
}

function shouldIgnoreRichCaretPlacement(target) {
  return target instanceof HTMLElement && Boolean(target.closest("img,video,audio,iframe,.video-wrap,.rich-media-resize-handle"));
}

function scheduleRichCaretPlacement(clientX, clientY) {
  const run = () => placeRichCaretAtPoint(clientX, clientY);
  run();
  requestAnimationFrame(run);
  setTimeout(run, 0);
}

function readBlocks() {
  if (!blocksList) return [];
  return [...blocksList.querySelectorAll(".block-item")]
    .map((row) => {
      const type = row.querySelector(".block-type").value;
      if (type === "text") {
        const content = row.querySelector(".block-content")?.value.trim() || "";
        return content ? { type, content, url: "", caption: "" } : null;
      }
      if (type === "image-text-left" || type === "image-text-right") {
        const url = row.querySelector(".block-url")?.value.trim() || "";
        const caption = row.querySelector(".block-caption")?.value.trim() || "";
        const content = row.querySelector(".block-content")?.value.trim() || "";
        return url || content ? { type, content, url, caption } : null;
      }
      if (type === "two-images") {
        const url = row.querySelector(".block-url")?.value.trim() || "";
        const caption = row.querySelector(".block-caption")?.value.trim() || "";
        const url2 = row.querySelector(".block-url-2")?.value.trim() || "";
        const caption2 = row.querySelector(".block-caption-2")?.value.trim() || "";
        return url || url2 ? { type, content: "", url, caption, url2, caption2 } : null;
      }
      const url = row.querySelector(".block-url")?.value.trim() || "";
      const caption = row.querySelector(".block-caption")?.value.trim() || "";
      return url ? { type, content: "", url, caption } : null;
    })
    .filter(Boolean);
}

function renderPreview() {
  if (!previewBox || !form) return;
  const title = form.elements.title.value.trim() || "Sans titre";
  const summary = form.elements.summary.value.trim() || "Aucun résumé.";
  const score = form.elements.score.value === "" ? null : Number(form.elements.score.value);
  const blocks = readBlocks();

  previewBox.innerHTML = "";
  const head = document.createElement("div");
  head.className = "preview-head";
  head.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${scoreToStars(score)}${Number.isFinite(score) ? ` (${score}/10)` : ""}</span>`;
  previewBox.appendChild(head);

  const summaryNode = document.createElement("p");
  summaryNode.className = "media-note";
  summaryNode.textContent = summary;
  previewBox.appendChild(summaryNode);

  const flow = document.createElement("div");
  flow.className = "preview-flow";

  if (currentContentMode === "rich") {
    const html = getRichHtml();
    if (!html) {
      const empty = document.createElement("p");
      empty.className = "media-note";
      empty.textContent = "Commence à rédiger pour voir le rendu.";
      flow.appendChild(empty);
    } else {
      const node = document.createElement("div");
      node.className = "rich-preview media-render rich-content";
      node.innerHTML = html;
      bindSpoilers(node);
      flow.appendChild(node);
    }
    previewBox.appendChild(flow);
    return;
  }

  blocks.forEach((block) => {
    const node = document.createElement("div");
    node.className = "preview-block";
    if (block.type === "text") {
      node.innerHTML = renderRichText(block.content);
      bindSpoilers(node);
    } else if (block.type === "image-text-left" || block.type === "image-text-right") {
      node.textContent = `${block.type === "image-text-left" ? "IMAGE GAUCHE + TEXTE" : "TEXTE + IMAGE DROITE"} · ${block.url || "Sans image"}`;
    } else if (block.type === "two-images") {
      node.textContent = `2 IMAGES · ${block.url || "Sans image gauche"} | ${block.url2 || "Sans image droite"}`;
    } else {
      node.textContent = `${block.type.toUpperCase()} · ${block.url}`;
      if (block.caption) {
        const cap = document.createElement("small");
        cap.textContent = ` (${block.caption})`;
        node.appendChild(cap);
      }
    }
    flow.appendChild(node);
  });
  if (!blocks.length) {
    const empty = document.createElement("p");
    empty.className = "media-note";
    empty.textContent = "Ajoute des blocs pour voir le rendu.";
    flow.appendChild(empty);
  }
  previewBox.appendChild(flow);
}

function getRichHtml() {
  if (richEditor) {
    const clone = richEditor.cloneNode(true);
    clone.querySelectorAll(".rich-media-resize-handle").forEach((node) => node.remove());
    clone.querySelectorAll(".rich-media-selected").forEach((node) => node.classList.remove("rich-media-selected"));
    return String(clone.innerHTML || "").trim();
  }
  const html = reviewBodyHtml?.value || "";
  return String(html || "").trim();
}

function setRichHtml(html) {
  const value = String(html || "");
  if (richEditor) richEditor.innerHTML = value;
  if (reviewBodyHtml) reviewBodyHtml.value = value;
}

function normalizeYouTubeEmbed(url) {
  try {
    const u = new URL(url);
    const host = String(u.hostname || "").toLowerCase();
    const path = String(u.pathname || "");
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      if (u.searchParams.get("v")) return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
      if (host.includes("youtu.be")) return `https://www.youtube.com/embed/${path.replace("/", "")}`;
      if (path.startsWith("/shorts/")) {
        const id = path.split("/")[2] || "";
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (path.startsWith("/embed/")) {
        return `https://www.youtube.com/embed/${path.split("/")[2] || ""}`;
      }
    }
  } catch {
    return url;
  }
  return url;
}

function setContentMode(mode) {
  currentContentMode = mode === "rich" ? "rich" : "blocks";
  if (blocksEditorSection) blocksEditorSection.classList.toggle("hidden", currentContentMode !== "blocks");
  if (richEditorSection) richEditorSection.classList.toggle("hidden", currentContentMode !== "rich");
  contentModeButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.contentMode === currentContentMode));
  renderPreview();
}

function getSelectedMediaWrapper() {
  if (selectedRichMediaWrapper && richEditor?.contains(selectedRichMediaWrapper)) return selectedRichMediaWrapper;
  if (!richEditor) return null;
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return null;
  let node = selection.anchorNode;
  if (!node) return null;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  if (!(node instanceof HTMLElement)) return null;
  if (!richEditor.contains(node)) return null;
  return getMediaWrapperFromNode(node);
}

function getMediaWrapperFromNode(node) {
  if (!(node instanceof HTMLElement)) return null;
  if (!richEditor || !richEditor.contains(node)) return null;
  const mediaFromNode = node.closest("img,video,audio,iframe");
  const media = mediaFromNode instanceof HTMLElement && richEditor.contains(mediaFromNode) ? mediaFromNode : null;
  if (media instanceof HTMLElement && richEditor.contains(media)) {
    const tag = media.tagName.toLowerCase();
    const shell = media.closest(".rich-media-shell");
    if (shell instanceof HTMLElement && richEditor.contains(shell)) return shell;
    if (tag === "iframe") {
      const wrap = media.closest(".video-wrap");
      if (wrap instanceof HTMLElement && richEditor.contains(wrap)) return wrap;
    }
    // For image/video/audio always use a dedicated shell to avoid selecting
    // a larger block container (figure/p/div) that can include wrapped empty space.
    return ensureRichMediaShell(media);
  }
  const explicitWrap = node.closest(".video-wrap,.rich-media-shell");
  if (explicitWrap instanceof HTMLElement && richEditor.contains(explicitWrap)) return explicitWrap;
  const figure = node.closest("figure");
  if (figure instanceof HTMLElement && richEditor.contains(figure)) {
    const mediaInFigure = figure.querySelectorAll("img,video,audio,iframe").length;
    if (mediaInFigure === 1) return figure;
  }
  return null;
}

function ensureRichMediaShell(media) {
  if (!(media instanceof HTMLElement)) return null;
  if (!richEditor || !richEditor.contains(media)) return null;
  const parent = media.parentElement;
  if (parent?.classList.contains("rich-media-shell")) return parent;
  const shell = document.createElement("span");
  shell.className = "rich-media-shell";
  shell.style.display = "block";
  media.parentNode?.insertBefore(shell, media);
  shell.appendChild(media);
  migrateMediaPresentationToShell(media, shell);
  return shell;
}

function migrateMediaPresentationToShell(media, shell) {
  if (!(media instanceof HTMLElement) || !(shell instanceof HTMLElement)) return;
  const figure = shell.closest("figure");
  if (!(figure instanceof HTMLElement) || !figure.contains(media)) return;
  const isSingleMediaFigure = figure.querySelectorAll("img,video,audio,iframe").length === 1;
  if (!isSingleMediaFigure) return;

  const clsToMove = [
    "rich-media-size-small",
    "rich-media-size-medium",
    "rich-media-size-large",
    "rich-media-float-left",
    "rich-media-float-right",
    "rich-media-center"
  ];
  clsToMove.forEach((cls) => {
    if (figure.classList.contains(cls)) {
      shell.classList.add(cls);
      figure.classList.remove(cls);
    }
  });

  if (!shell.style.width && figure.style.width) shell.style.width = figure.style.width;
  if (!shell.style.maxWidth && figure.style.maxWidth) shell.style.maxWidth = figure.style.maxWidth;
  if (!shell.style.display && figure.style.display) shell.style.display = figure.style.display;
  figure.style.width = "";
  figure.style.maxWidth = "";
  figure.style.display = "";
}

function getWrapperMediaElement(wrapper) {
  if (!(wrapper instanceof HTMLElement)) return null;
  const tag = wrapper.tagName.toLowerCase();
  if (tag === "img" || tag === "video" || tag === "audio" || tag === "iframe") return wrapper;
  const direct = [...wrapper.children].find((child) => {
    const childTag = child.tagName?.toLowerCase?.() || "";
    return childTag === "img" || childTag === "video" || childTag === "audio" || childTag === "iframe";
  });
  if (direct instanceof HTMLElement) return direct;
  const nested = wrapper.querySelector("img,video,audio,iframe");
  return nested instanceof HTMLElement ? nested : null;
}

function ensureMediaFillsWrapper(wrapper) {
  const media = getWrapperMediaElement(wrapper);
  if (!media || media === wrapper) return;
  const tag = media.tagName.toLowerCase();
  if (tag === "img" || tag === "video") {
    media.style.width = "100%";
    media.style.height = "auto";
    media.style.maxWidth = "none";
    return;
  }
  if (tag === "audio") {
    media.style.width = "100%";
    return;
  }
  if (tag === "iframe") {
    media.style.width = "100%";
    media.style.maxWidth = "none";
  }
}

function clearSelectedMedia() {
  if (!selectedRichMediaWrapper) return;
  selectedRichMediaWrapper.classList.remove("rich-media-selected");
  [...selectedRichMediaWrapper.children].forEach((child) => {
    if (child.classList?.contains("rich-media-resize-handle")) child.remove();
  });
  selectedRichMediaWrapper = null;
}

function ensureResizeHandle(wrapper) {
  if (!wrapper || !(wrapper instanceof HTMLElement)) return;
  let handle = null;
  [...wrapper.children].forEach((child) => {
    if (child.classList?.contains("rich-media-resize-handle")) handle = child;
  });
  if (handle) return;
  handle = document.createElement("button");
  handle.type = "button";
  handle.className = "rich-media-resize-handle";
  handle.setAttribute("aria-label", "Redimensionner le média");
  handle.addEventListener("mousedown", (event) => event.preventDefault());
  handle.addEventListener("pointerdown", startMediaResize);
  wrapper.appendChild(handle);
  positionResizeHandle(wrapper, handle);
}

function positionResizeHandle(wrapper, explicitHandle = null) {
  if (!(wrapper instanceof HTMLElement)) return;
  const handle =
    explicitHandle ||
    [...wrapper.children].find((child) => child.classList?.contains("rich-media-resize-handle"));
  if (!(handle instanceof HTMLElement)) return;

  const media = getWrapperMediaElement(wrapper);
  if (media && media !== wrapper) {
    const left = media.offsetLeft + media.offsetWidth - 7;
    const top = media.offsetTop + media.offsetHeight - 7;
    handle.style.left = `${Math.max(0, left)}px`;
    handle.style.top = `${Math.max(0, top)}px`;
    handle.style.right = "auto";
    handle.style.bottom = "auto";
    return;
  }

  handle.style.left = "auto";
  handle.style.top = "auto";
  handle.style.right = "-7px";
  handle.style.bottom = "-7px";
}

function selectMedia(wrapper) {
  if (!wrapper || !richEditor?.contains(wrapper)) return;
  if (selectedRichMediaWrapper && selectedRichMediaWrapper !== wrapper) {
    selectedRichMediaWrapper.classList.remove("rich-media-selected");
    [...selectedRichMediaWrapper.children].forEach((child) => {
      if (child.classList?.contains("rich-media-resize-handle")) child.remove();
    });
  }
  selectedRichMediaWrapper = wrapper;
  selectedRichMediaWrapper.classList.add("rich-media-selected");
  ensureMediaFillsWrapper(selectedRichMediaWrapper);
  ensureResizeHandle(selectedRichMediaWrapper);
  positionResizeHandle(selectedRichMediaWrapper);
}

function startMediaResize(event) {
  const handle = event.currentTarget;
  if (!(handle instanceof HTMLElement) || !richEditor) return;
  const wrapper = handle.parentElement;
  if (!(wrapper instanceof HTMLElement) || !richEditor.contains(wrapper)) return;
  event.preventDefault();
  event.stopPropagation();
  selectMedia(wrapper);
  const editorRect = richEditor.getBoundingClientRect();
  const rect = wrapper.getBoundingClientRect();
  richMediaResizeState = {
    wrapper,
    startX: event.clientX,
    startWidth: rect.width,
    minWidth: 120,
    maxWidth: Math.max(140, editorRect.width - 24)
  };
  window.addEventListener("pointermove", onMediaResizeMove);
  window.addEventListener("pointerup", stopMediaResize);
}

function onMediaResizeMove(event) {
  if (!richMediaResizeState) return;
  const { wrapper, startX, startWidth, minWidth, maxWidth } = richMediaResizeState;
  const deltaX = event.clientX - startX;
  const nextWidth = Math.max(minWidth, Math.min(maxWidth, Math.round(startWidth + deltaX)));
  wrapper.classList.remove("rich-media-size-small", "rich-media-size-medium", "rich-media-size-large");
  wrapper.style.display = "block";
  wrapper.style.width = `${nextWidth}px`;
  wrapper.style.maxWidth = "100%";
  ensureMediaFillsWrapper(wrapper);
  positionResizeHandle(wrapper);
  renderPreview();
}

function stopMediaResize() {
  if (!richMediaResizeState) return;
  richMediaResizeState = null;
  window.removeEventListener("pointermove", onMediaResizeMove);
  window.removeEventListener("pointerup", stopMediaResize);
}

function applyMediaSize(size) {
  const target = getSelectedMediaWrapper();
  if (!target) return;
  selectMedia(target);
  target.style.display = "block";
  target.style.width = "";
  target.style.maxWidth = "";
  target.classList.remove("rich-media-size-small", "rich-media-size-medium", "rich-media-size-large");
  const cls = size === "small" ? "rich-media-size-small" : size === "medium" ? "rich-media-size-medium" : "rich-media-size-large";
  target.classList.add(cls);
  ensureMediaFillsWrapper(target);
  positionResizeHandle(target);
  renderPreview();
}

function applyMediaAlign(align) {
  const target = getSelectedMediaWrapper();
  if (!target) return;
  selectMedia(target);
  target.style.display = "block";
  target.classList.remove("rich-media-float-left", "rich-media-float-right", "rich-media-center");
  const cls = align === "left" ? "rich-media-float-left" : align === "right" ? "rich-media-float-right" : "rich-media-center";
  target.classList.add(cls);
  positionResizeHandle(target);
  renderPreview();
}

function insertRichSpoiler() {
  if (!richEditor) return;
  const selection = window.getSelection();
  const selected = selection ? String(selection.toString() || "").trim() : "";
  const content = selected || "Spoiler";
  richEditor.focus();
  document.execCommand("insertHTML", false, `<button class="spoiler-text" type="button">${escapeHtml(content)}</button>`);
  renderPreview();
}

function configureMetaFields(category) {
  if (!form) return;

  const show = (el, visible) => {
    if (!el) return;
    el.classList.toggle("hidden", !visible);
  };

  const authorLabel = metaAuthorRow?.querySelector(".field-label-text");
  const directorLabel = metaDirectorRow?.querySelector(".field-label-text");
  const studioLabel = metaStudioRow?.querySelector(".field-label-text");

  if (category === "film" || category === "serie") {
    show(metaAuthorRow, false);
    show(metaStudioRow, false);
    show(metaDirectorRow, true);
    if (directorLabel) directorLabel.textContent = "Réalisation";
  } else if (category === "jeu") {
    show(metaAuthorRow, false);
    show(metaDirectorRow, false);
    show(metaStudioRow, true);
    if (studioLabel) studioLabel.textContent = "Studio de développement";
  } else if (category === "livre") {
    show(metaDirectorRow, false);
    show(metaStudioRow, false);
    show(metaAuthorRow, true);
    if (authorLabel) authorLabel.textContent = "Auteur";
  } else if (category === "musique") {
    show(metaDirectorRow, false);
    show(metaStudioRow, false);
    show(metaAuthorRow, true);
    if (authorLabel) authorLabel.textContent = "Artiste";
  } else {
    show(metaAuthorRow, true);
    show(metaDirectorRow, true);
    show(metaStudioRow, true);
    if (authorLabel) authorLabel.textContent = "Auteur / Artiste";
    if (directorLabel) directorLabel.textContent = "Réalisation";
    if (studioLabel) studioLabel.textContent = "Studio / Développeur";
  }
}

function createBlockRow(block = { type: "text", content: "", url: "", caption: "" }) {
  const row = document.createElement("div");
  row.className = "block-item";
  row.innerHTML = `
    <div class="block-head">
      <strong class="block-index">Bloc</strong>
      <select class="block-type">
        <option value="text">Texte</option>
        <option value="image">Image</option>
        <option value="image-text-left">Image gauche + Texte droite</option>
        <option value="image-text-right">Texte gauche + Image droite</option>
        <option value="two-images">2 images côte à côte</option>
        <option value="video">Vidéo</option>
        <option value="audio">Audio</option>
      </select>
      <div class="row-actions">
        <button type="button" class="action-btn secondary block-up">&uarr;</button>
        <button type="button" class="action-btn secondary block-down">&darr;</button>
        <button type="button" class="action-btn danger block-delete">Supprimer</button>
      </div>
    </div>
    <div class="block-fields"></div>
  `;

  const typeSelect = row.querySelector(".block-type");
  const fields = row.querySelector(".block-fields");
  const renderFields = () => {
    fields.innerHTML = getBlockFieldsHtml(typeSelect.value, block);
    fields.querySelectorAll("input,textarea").forEach((el) => {
      el.addEventListener("input", () => {
        if (el instanceof HTMLTextAreaElement && el.classList.contains("block-content")) {
          recordBlockHistory(el);
        }
        renderPreview();
      });
      if (el.classList.contains("block-content")) {
        const remember = () => {
          if (el instanceof HTMLTextAreaElement) {
            activeTextArea = el;
            initBlockHistory(el);
          }
        };
        el.addEventListener("focus", remember);
        el.addEventListener("click", remember);
        el.addEventListener("keydown", handleBlockTextareaKeydown);
        remember();
      }
    });
  };

  typeSelect.value = block.type || "text";
  renderFields();
  typeSelect.addEventListener("change", () => {
    block.type = typeSelect.value;
    renderFields();
    renderPreview();
  });
  row.querySelector(".block-delete").addEventListener("click", () => {
    row.remove();
    updateBlockIndex();
    renderPreview();
  });
  row.querySelector(".block-up").addEventListener("click", () => {
    const prev = row.previousElementSibling;
    if (prev && blocksList) {
      blocksList.insertBefore(row, prev);
      updateBlockIndex();
      renderPreview();
      row.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
  row.querySelector(".block-down").addEventListener("click", () => {
    const next = row.nextElementSibling;
    if (next && blocksList) {
      blocksList.insertBefore(next, row);
      updateBlockIndex();
      renderPreview();
      row.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
  return row;
}

function setBlocks(blocks) {
  if (!blocksList) return;
  blocksList.innerHTML = "";
  if (!Array.isArray(blocks) || !blocks.length) {
    blocksList.appendChild(createBlockRow({ type: "text", content: "" }));
  } else {
    blocks.forEach((block) => blocksList.appendChild(createBlockRow(block)));
  }
  updateBlockIndex();
  renderPreview();
}

function topReviewOptions(selectedId = "") {
  const options = [`<option value="">Aucune review liée</option>`];
  cachedReviews.forEach((review) => {
    const selected = review.id === selectedId ? " selected" : "";
    options.push(`<option value="${review.id}"${selected}>${escapeHtml(review.title || "Sans titre")}</option>`);
  });
  return options.join("");
}

function updateTopItemIndex() {
  if (!topItemsList) return;
  [...topItemsList.querySelectorAll(".block-item")].forEach((row, idx) => {
    const index = row.querySelector(".block-index");
    if (index) index.textContent = `Item ${idx + 1}`;
  });
}

function createTopItemRow(item = { title: "", comment: "", reviewId: "" }) {
  const row = document.createElement("div");
  row.className = "block-item";
  row.innerHTML = `
    <div class="block-head">
      <strong class="block-index">Item</strong>
      <div class="row-actions">
        <button type="button" class="action-btn secondary top-up">&uarr;</button>
        <button type="button" class="action-btn secondary top-down">&darr;</button>
        <button type="button" class="action-btn danger top-delete">Supprimer</button>
      </div>
    </div>
    <div class="block-fields">
      <label>Review liée (optionnel)
        <select class="top-review">${topReviewOptions(item.reviewId || "")}</select>
      </label>
      <input class="top-title" type="text" placeholder="Titre" value="${escapeHtml(item.title || "")}" />
      <input class="top-comment" type="text" placeholder="Commentaire (optionnel)" value="${escapeHtml(item.comment || "")}" />
    </div>
  `;

  const reviewSelect = row.querySelector(".top-review");
  const titleInput = row.querySelector(".top-title");
  reviewSelect.addEventListener("change", () => {
    const match = cachedReviews.find((r) => r.id === reviewSelect.value);
    if (match && !titleInput.value.trim()) {
      titleInput.value = match.title || "";
    }
  });
  row.querySelector(".top-delete").addEventListener("click", () => {
    row.remove();
    updateTopItemIndex();
  });
  row.querySelector(".top-up").addEventListener("click", () => {
    const prev = row.previousElementSibling;
    if (prev && topItemsList) {
      topItemsList.insertBefore(row, prev);
      updateTopItemIndex();
    }
  });
  row.querySelector(".top-down").addEventListener("click", () => {
    const next = row.nextElementSibling;
    if (next && topItemsList) {
      topItemsList.insertBefore(next, row);
      updateTopItemIndex();
    }
  });
  return row;
}

function setTopItems(items) {
  if (!topItemsList) return;
  topItemsList.innerHTML = "";
  if (!items || !items.length) {
    topItemsList.appendChild(createTopItemRow());
  } else {
    items.forEach((item) => topItemsList.appendChild(createTopItemRow(item)));
  }
  updateTopItemIndex();
}

function readTopItems() {
  if (!topItemsList) return [];
  return [...topItemsList.querySelectorAll(".block-item")]
    .map((row) => ({
      reviewId: row.querySelector(".top-review")?.value || "",
      title: row.querySelector(".top-title")?.value.trim() || "",
      comment: row.querySelector(".top-comment")?.value.trim() || ""
    }))
    .filter((item) => item.title || item.reviewId);
}

function getReviewPublicationTimestamp(item) {
  const updated = Number(item?.updatedAt);
  if (Number.isFinite(updated) && updated > 0) return updated;
  const parsed = Date.parse(String(item?.date || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getReviewSortScore(item) {
  return Number.isFinite(Number(item?.score)) ? Number(item.score) : null;
}

function sortReviews(items, mode = selectedSort) {
  const sorted = [...items];
  sorted.sort((a, b) => {
    const dateA = getReviewPublicationTimestamp(a);
    const dateB = getReviewPublicationTimestamp(b);
    const scoreA = getReviewSortScore(a);
    const scoreB = getReviewSortScore(b);
    if (mode === "date-asc") return dateA - dateB;
    if (mode === "score-desc") {
      const left = scoreA ?? Number.NEGATIVE_INFINITY;
      const right = scoreB ?? Number.NEGATIVE_INFINITY;
      if (left !== right) return right - left;
      return dateB - dateA;
    }
    if (mode === "score-asc") {
      const left = scoreA ?? Number.POSITIVE_INFINITY;
      const right = scoreB ?? Number.POSITIVE_INFINITY;
      if (left !== right) return left - right;
      return dateB - dateA;
    }
    return dateB - dateA;
  });
  return sorted;
}

function reviewMatchesSearch(item, rawQuery) {
  const query = normalizeSearchValue(rawQuery);
  if (!query) return true;
  const haystack = [
    item?.title,
    item?.summary,
    item?.category,
    item?.author,
    item?.director,
    item?.studio,
    item?.genre,
    item?.ownerUsername
  ]
    .map((value) => normalizeSearchValue(value))
    .join(" ");
  return haystack.includes(query);
}

function getTopPublicationTimestamp(item) {
  const updated = Number(item?.updatedAt);
  if (Number.isFinite(updated) && updated > 0) return updated;
  return 0;
}

function sortManagerTops(items, mode = selectedManagerTopSort) {
  const sorted = [...items];
  sorted.sort((a, b) => {
    const dateA = getTopPublicationTimestamp(a);
    const dateB = getTopPublicationTimestamp(b);
    if (mode === "date-asc") return dateA - dateB;
    return dateB - dateA;
  });
  return sorted;
}

function buildUserFilterOptions(reviews) {
  if (!reviewsUserFilterSelect) return;
  const users = [...new Set(reviews.map((r) => normalizeUsernameValue(r.ownerUsername)).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
  if (selectedUserFilter !== "all" && !users.includes(selectedUserFilter)) {
    selectedUserFilter = "all";
  }
  reviewsUserFilterSelect.innerHTML = `<option value="all">Tous</option>`;
  users.forEach((username) => {
    const option = document.createElement("option");
    option.value = username;
    option.textContent = username;
    option.selected = selectedUserFilter === username;
    reviewsUserFilterSelect.appendChild(option);
  });
}

function buildFilterButtons(reviews) {
  if (!filterButtonsHost) return;
  const categories = [...new Set(reviews.map((r) => r.category).filter(Boolean))];
  if (selectedFilter !== "all" && !categories.includes(selectedFilter)) {
    selectedFilter = "all";
  }
  filterButtonsHost.innerHTML = `<button class="filter-btn${selectedFilter === "all" ? " active" : ""}" data-filter="all">Tout</button>`;
  categories.forEach((cat) => {
    const name = window.ReviewsStore.categories[cat] || cat;
    filterButtonsHost.insertAdjacentHTML(
      "beforeend",
      `<button class="filter-btn${selectedFilter === cat ? " active" : ""}" data-filter="${cat}">${name}</button>`
    );
  });
  filterButtonsHost.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      filterButtonsHost.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      selectedFilter = button.dataset.filter;
      await renderAll();
    });
  });
}

async function renderAll() {
  let reviews = [];
  try {
    reviews = await window.ReviewsStore.getAll();
  } catch (error) {
    if (reviewsGrid || managerList) window.alert(`Impossible de charger les reviews : ${error.message}`);
    return;
  }

  const sortedReviews = sortReviews(reviews);
  const managerVisibleReviews = managerList
    ? (isAdminUser(currentUser)
      ? sortReviews(sortedReviews, selectedManagerReviewSort)
      : sortReviews(sortedReviews.filter((item) => !item.ownerId || item.ownerId === currentUser?.uid), selectedManagerReviewSort))
    : sortedReviews;
  cachedReviews = managerVisibleReviews;
  buildFilterButtons(sortedReviews);
  buildUserFilterOptions(sortedReviews);

  if (reviewsGrid) {
    reviewsGrid.innerHTML = "";
    sortedReviews
      .filter((item) => selectedFilter === "all" || item.category === selectedFilter)
      .filter((item) => selectedUserFilter === "all" || normalizeUsernameValue(item.ownerUsername) === selectedUserFilter)
      .filter((item) => reviewMatchesSearch(item, selectedReviewsSearch))
      .forEach((item) => reviewsGrid.appendChild(reviewCard(item)));
  }
  if (managerList) {
    managerList.innerHTML = "";
    managerVisibleReviews.forEach((item) => managerList.appendChild(managerRow(item)));
  }
}

async function renderTopsManager() {
  if (!topList) return;
  try {
    const tops = await window.ReviewsStore.getAllTops();
    const managerVisibleTops = isAdminUser(currentUser)
      ? tops
      : tops.filter((item) => !item.ownerId || item.ownerId === currentUser?.uid);
    const managerSortedTops = sortManagerTops(managerVisibleTops, selectedManagerTopSort);
    topList.innerHTML = "";
    managerSortedTops.forEach((item) => topList.appendChild(topRow(item)));
  } catch (error) {
    window.alert(`Impossible de charger les tops : ${error.message}`);
  }
}

function openForm(item = null) {
  if (!form) return;
  editingId = item ? item.id : null;
  form.classList.remove("hidden");
  formTitle.textContent = item ? "Modifier la review" : "Ajouter une review";
  form.elements.title.value = item?.title || "";
  form.elements.category.value = item?.category || "jeu";
  form.elements.date.value = item?.date || "";
  form.elements.score.value = Number.isFinite(item?.score) ? String(item.score) : "";
  form.elements.cover.value = item?.cover || "";
  form.elements.poster.value = item?.poster || "";
  editingAccent = item?.accent || "";
  form.elements.summary.value = item?.summary || "";
  form.elements.author.value = item?.author || "";
  form.elements.director.value = item?.director || "";
  form.elements.studio.value = item?.studio || "";
  form.elements.releaseYear.value = item?.releaseYear || "";
  form.elements.genre.value = item?.genre || "";
  if (form.elements.bgMusic) form.elements.bgMusic.value = item?.bgMusic || "";
  fillExternalLinksInForm(item);
  configureMetaFields(form.elements.category.value || "jeu");
  setRichHtml(item?.bodyHtml || "");
  const nextMode = item?.contentMode || (item?.bodyHtml ? "rich" : "blocks");
  setContentMode(nextMode);
  setBlocks(item?.blocks || []);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeForm() {
  if (!form) return;
  editingId = null;
  editingAccent = "";
  form.reset();
  form.classList.add("hidden");
  setContentMode("blocks");
  setRichHtml("");
  if (blocksList) blocksList.innerHTML = "";
  renderPreview();
}

function openTopForm(item = null) {
  if (!topForm) return;
  editingTopId = item ? item.id : null;
  topForm.classList.remove("hidden");
  topFormTitle.textContent = item ? "Modifier un top" : "Ajouter un top";
  topForm.elements.title.value = item?.title || "";
  topForm.elements.category.value = item?.category || "autre";
  topForm.elements.year.value = item?.year || "";
  topForm.elements.cover.value = item?.cover || "";
  topForm.elements.subtitle.value = item?.subtitle || "";
  setTopItems(item?.items || []);
  topForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeTopForm() {
  if (!topForm) return;
  editingTopId = null;
  topForm.reset();
  topForm.classList.add("hidden");
  if (topItemsList) topItemsList.innerHTML = "";
}

if (form) {
  form.elements.title.addEventListener("input", renderPreview);
  form.elements.score.addEventListener("input", renderPreview);
  form.elements.summary.addEventListener("input", renderPreview);
  form.elements.category.addEventListener("change", () => configureMetaFields(form.elements.category.value || "jeu"));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = form.elements.title.value.trim() || "Sans titre";
    const selectedCategory = form.elements.category.value || "jeu";
    const authorValue = form.elements.author.value.trim();
    const directorValue = form.elements.director.value.trim();
    const studioValue = form.elements.studio.value.trim();
    const payload = {
      id: editingId || window.ReviewsStore.slugify(title),
      title,
      category: selectedCategory,
      date: form.elements.date.value,
      score: form.elements.score.value === "" ? null : Number(form.elements.score.value),
      cover: form.elements.cover.value.trim(),
      poster: form.elements.poster.value.trim(),
      accent: editingAccent,
      summary: form.elements.summary.value.trim(),
      author: selectedCategory === "livre" || selectedCategory === "musique" ? authorValue : "",
      director: selectedCategory === "film" || selectedCategory === "serie" ? directorValue : "",
      studio: selectedCategory === "jeu" ? studioValue : "",
      releaseYear: form.elements.releaseYear.value.trim(),
      genre: form.elements.genre.value.trim(),
      bgMusic: form.elements.bgMusic?.value.trim() || "",
      externalLinks: readExternalLinksFromForm(),
      contentMode: currentContentMode,
      bodyHtml: currentContentMode === "rich" ? getRichHtml() : "",
      blocks: currentContentMode === "blocks" ? readBlocks() : []
    };
    try {
      await window.ReviewsStore.upsert(payload);
    } catch (error) {
      window.alert(`Sauvegarde impossible : ${error.message}`);
      return;
    }
    closeForm();
    await renderAll();
  });
}

if (topForm) {
  topForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = topForm.elements.title.value.trim() || "Sans titre";
    const payload = {
      id: editingTopId || window.ReviewsStore.slugify(title),
      title,
      category: topForm.elements.category.value || "autre",
      year: topForm.elements.year.value.trim(),
      cover: topForm.elements.cover.value.trim(),
      subtitle: topForm.elements.subtitle.value.trim(),
      items: readTopItems()
    };
    try {
      await window.ReviewsStore.upsertTop(payload);
    } catch (error) {
      window.alert(`Sauvegarde top impossible : ${error.message}`);
      return;
    }
    closeTopForm();
    await renderTopsManager();
  });
}

if (addBtn) addBtn.addEventListener("click", () => openForm());
if (cancelBtn) cancelBtn.addEventListener("click", closeForm);
if (addBlockBtn) {
  addBlockBtn.addEventListener("click", () => {
    if (!blocksList) return;
    blocksList.appendChild(createBlockRow({ type: "text" }));
    updateBlockIndex();
    renderPreview();
  });
}
if (newTopBtn) newTopBtn.addEventListener("click", () => openTopForm());
if (cancelTopBtn) cancelTopBtn.addEventListener("click", closeTopForm);
if (addTopItemBtn) {
  addTopItemBtn.addEventListener("click", () => {
    if (!topItemsList) return;
    topItemsList.appendChild(createTopItemRow());
    updateTopItemIndex();
  });
}

wrapToolButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tag = btn.dataset.wrapTag;
    if (!tag) return;
    wrapSelection(`[${tag}]`, `[/${tag}]`);
  });
});
blockActionButtons.forEach((btn) => {
  btn.addEventListener("click", () => applyBlockAction(btn.dataset.blockAction || ""));
});
if (toolColorApply) toolColorApply.addEventListener("click", () => wrapSelection(`[color=${toolColor?.value || "#f2f2ee"}]`, "[/color]"));
if (toolSizeApply) {
  const apply = () => wrapSelection(`[size=${toolSize?.value || "16"}]`, "[/size]");
  toolSizeApply.addEventListener("click", apply);
}
if (toolHighlightApply) {
  toolHighlightApply.addEventListener("click", () => wrapSelection(`[mark=${toolHighlight?.value || "#f7b538"}]`, "[/mark]"));
}

if (reviewsSortSelect) {
  reviewsSortSelect.value = selectedSort;
  reviewsSortSelect.addEventListener("change", async () => {
    selectedSort = reviewsSortSelect.value || "date-desc";
    await renderAll();
  });
}

if (reviewsUserFilterSelect) {
  reviewsUserFilterSelect.addEventListener("change", async () => {
    selectedUserFilter = reviewsUserFilterSelect.value || "all";
    await renderAll();
  });
}

if (reviewsSearchInput) {
  reviewsSearchInput.addEventListener("input", async () => {
    selectedReviewsSearch = reviewsSearchInput.value || "";
    await renderAll();
  });
}

if (managerReviewsSortSelect) {
  managerReviewsSortSelect.value = selectedManagerReviewSort;
  managerReviewsSortSelect.addEventListener("change", async () => {
    selectedManagerReviewSort = managerReviewsSortSelect.value || "date-desc";
    await renderAll();
  });
}

if (managerTopsSortSelect) {
  managerTopsSortSelect.value = selectedManagerTopSort;
  managerTopsSortSelect.addEventListener("change", async () => {
    selectedManagerTopSort = managerTopsSortSelect.value || "date-desc";
    await renderTopsManager();
  });
}

contentModeButtons.forEach((btn) => {
  btn.addEventListener("click", () => setContentMode(btn.dataset.contentMode || "blocks"));
});

if (richEditor) {
  richEditor.addEventListener(
    "dblclick",
    (event) => {
      if (shouldIgnoreRichCaretPlacement(event.target)) return;
      event.preventDefault();
      scheduleRichCaretPlacement(event.clientX, event.clientY);
    },
    true
  );
  richEditor.addEventListener(
    "mousedown",
    (event) => {
      if (event.detail !== 2) return;
      if (shouldIgnoreRichCaretPlacement(event.target)) return;
      event.preventDefault();
      scheduleRichCaretPlacement(event.clientX, event.clientY);
    },
    true
  );
  richEditor.addEventListener(
    "mouseup",
    (event) => {
      if (event.detail !== 2) return;
      if (shouldIgnoreRichCaretPlacement(event.target)) return;
      event.preventDefault();
      scheduleRichCaretPlacement(event.clientX, event.clientY);
    },
    true
  );
  richEditor.addEventListener("mousedown", (event) => {
    const target = getMediaWrapperFromNode(event.target);
    if (target) {
      selectMedia(target);
      return;
    }
    clearSelectedMedia();
  });
  richEditor.addEventListener("input", () => {
    if (selectedRichMediaWrapper && !richEditor.contains(selectedRichMediaWrapper)) {
      selectedRichMediaWrapper = null;
    }
    if (reviewBodyHtml) reviewBodyHtml.value = richEditor.innerHTML;
    renderPreview();
  });
}

richCmdButtons.forEach((btn) => {
  btn.addEventListener("mousedown", (event) => event.preventDefault());
  btn.addEventListener("click", () => {
    if (!richEditor) return;
    richEditor.focus();
    document.execCommand(btn.dataset.richCmd || "", false, btn.dataset.richValue || null);
    renderPreview();
  });
});

if (richColor) {
  const apply = () => applyRichTextColor(richColor.value || "#f2f2ee");
  richColor.addEventListener("input", apply);
  richColor.addEventListener("change", apply);
}

if (richSize) {
  const apply = () => applyRichTextSize(richSize.value || "16");
  richSize.addEventListener("change", apply);
}

if (richSpoilerBtn) {
  richSpoilerBtn.addEventListener("mousedown", (event) => event.preventDefault());
  richSpoilerBtn.addEventListener("click", insertRichSpoiler);
}

richMediaSizeButtons.forEach((btn) => {
  btn.addEventListener("mousedown", (event) => event.preventDefault());
  btn.addEventListener("click", () => applyMediaSize(btn.dataset.mediaSize || "medium"));
});

richMediaAlignButtons.forEach((btn) => {
  btn.addEventListener("mousedown", (event) => event.preventDefault());
  btn.addEventListener("click", () => applyMediaAlign(btn.dataset.mediaAlign || "center"));
});

if (richLinkBtn) {
  richLinkBtn.addEventListener("mousedown", (event) => event.preventDefault());
  richLinkBtn.addEventListener("click", () => {
    if (!richEditor) return;
    const url = window.prompt("URL du lien");
    if (!url) return;
    richEditor.focus();
    document.execCommand("createLink", false, url.trim());
    renderPreview();
  });
}

if (richImageBtn) {
  richImageBtn.addEventListener("mousedown", (event) => event.preventDefault());
  richImageBtn.addEventListener("click", () => {
    const url = window.prompt("URL de l'image");
    if (!url || !richEditor) return;
    richEditor.focus();
    document.execCommand("insertHTML", false, `<figure><img src="${escapeHtml(url.trim())}" alt="image" /></figure>`);
    renderPreview();
  });
}

if (richVideoBtn) {
  richVideoBtn.addEventListener("mousedown", (event) => event.preventDefault());
  richVideoBtn.addEventListener("click", () => {
    const url = window.prompt("URL vidéo (YouTube ou fichier vidéo)");
    if (!url || !richEditor) return;
    richEditor.focus();
    const cleaned = url.trim();
    const embed = normalizeYouTubeEmbed(cleaned);
    if (embed.includes("youtube.com/embed/")) {
      document.execCommand("insertHTML", false, `<div class="video-wrap"><iframe src="${escapeHtml(embed)}" title="video" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`);
    } else {
      document.execCommand("insertHTML", false, `<video controls src="${escapeHtml(cleaned)}"></video>`);
    }
    renderPreview();
  });
}

if (richAudioBtn) {
  richAudioBtn.addEventListener("mousedown", (event) => event.preventDefault());
  richAudioBtn.addEventListener("click", () => {
    const url = window.prompt("URL audio");
    if (!url || !richEditor) return;
    richEditor.focus();
    document.execCommand("insertHTML", false, `<audio controls src="${escapeHtml(url.trim())}"></audio>`);
    renderPreview();
  });
}

if (richColsBtn) {
  richColsBtn.addEventListener("mousedown", (event) => event.preventDefault());
  richColsBtn.addEventListener("click", () => {
    if (!richEditor) return;
    richEditor.focus();
    document.execCommand(
      "insertHTML",
      false,
      "<table><tbody><tr><td><p>Colonne 1</p></td><td><p>Colonne 2</p></td></tr></tbody></table><p></p>"
    );
    renderPreview();
  });
}

if (window.ReviewsStore.onAuthChanged) {
  window.ReviewsStore.onAuthChanged(async (user) => {
    const unlocked = Boolean(user);
    currentUser = unlocked ? window.ReviewsStore.getCurrentUser() : null;
    if (managerSection) managerSection.classList.toggle("hidden", !unlocked);
    if (logoutBtn) logoutBtn.classList.toggle("hidden", !unlocked);
    if (authStatus) {
      authStatus.textContent = unlocked
        ? `Connecté en tant que @${currentUser?.username || "utilisateur"}`
        : "Non connecté";
    }
    if (unlocked) {
      await renderAll();
      await renderTopsManager();
      await openRequestedReviewForEdit();
    } else {
      if (managerList) managerList.innerHTML = "";
      if (topList) topList.innerHTML = "";
    }
  });
}

if (loginBtn && authUsername && authPassword) {
  const login = async () => {
    try {
      await window.ReviewsStore.loginWithCredentials(authUsername.value, authPassword.value);
      authPassword.value = "";
    } catch (error) {
      window.alert(`Connexion impossible : ${error.message}`);
    }
  };
  loginBtn.addEventListener("click", login);
  authUsername.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      login();
    }
  });
  authPassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      login();
    }
  });
}

if (registerBtn && authUsername && authPassword) {
  registerBtn.addEventListener("click", async () => {
    try {
      await window.ReviewsStore.registerWithCredentials(authUsername.value, authPassword.value);
      authPassword.value = "";
      window.alert("Compte créé. Tu es maintenant connecté.");
    } catch (error) {
      window.alert(`Inscription impossible : ${error.message}`);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await window.ReviewsStore.signOut();
    } catch (error) {
      window.alert(`Erreur : ${error.message}`);
    }
  });
}

if (blocksList) setBlocks([]);
if (topItemsList) setTopItems([]);
if (form) configureMetaFields(form.elements.category.value || "jeu");
setContentMode("blocks");
renderAll();







