const menuToggle = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");
const pageParams = new URLSearchParams(window.location.search);
const requestedEditReviewId = String(pageParams.get("edit") || "").trim();

const studioCoverBg = document.getElementById("studio-cover-bg");
const studioTitleInput = document.getElementById("studio-title");
const studioSummaryInput = document.getElementById("studio-summary");

const studioGuestNote = document.getElementById("studio-guest-note");
const studioWorkspace = document.getElementById("studio-workspace");
const studioMetaForm = document.getElementById("studio-meta-form");
const studioEditor = document.getElementById("studio-editor");
const studioSynopsisInput = document.getElementById("studio-synopsis-input");
const studioSaveDraftBtn = document.getElementById("studio-save-draft");
const studioSavePublishBtn = document.getElementById("studio-save-publish");
const studioDeleteReviewBtn = document.getElementById("studio-delete-review");
const studioImageBtn = document.getElementById("studio-image-btn");
const studioVideoBtn = document.getElementById("studio-video-btn");
const studioWrapButtons = document.querySelectorAll("[data-studio-wrap]");
const studioActionButtons = document.querySelectorAll("[data-studio-action]");
const studioToolColor = document.getElementById("studio-tool-color");
const studioToolColorApply = document.getElementById("studio-tool-color-apply");
const studioToolSize = document.getElementById("studio-tool-size");
const studioToolSizeApply = document.getElementById("studio-tool-size-apply");
const studioToolHighlight = document.getElementById("studio-tool-highlight");
const studioToolHighlightApply = document.getElementById("studio-tool-highlight-apply");
const studioEyebrow = document.querySelector(".eyebrow");
const studioPosterPickerBtn = document.getElementById("studio-poster-picker-btn");
const studioPosterUrlBtn = document.getElementById("studio-poster-url-btn");
const studioCoverPickerBtn = document.getElementById("studio-cover-picker-btn");
const studioCoverUrlBtn = document.getElementById("studio-cover-url-btn");
const studioContentModeButtons = document.querySelectorAll("[data-studio-content-mode]");
const studioRichEditorSection = document.getElementById("studio-rich-editor-section");
const studioBlocksEditorSection = document.getElementById("studio-blocks-editor-section");
const studioBlocksList = document.getElementById("studio-blocks-list");
const studioAddBlockBtn = document.getElementById("studio-add-block-btn");

const DEFAULT_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'><defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#1a2a36'/><stop offset='1' stop-color='#243b4a'/></linearGradient></defs><rect width='1200' height='630' fill='url(#g)'/><text x='50%' y='50%' text-anchor='middle' fill='#b8c2cc' font-size='54' font-family='Arial, sans-serif'>Nouvelle review</text></svg>"
  );
const TMDB_API_KEY = "db0d1dbaf15190e0a5574538dc4e579f";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const TMDB_AUTOCOMPLETE_MIN_CHARS = 2;
const IGDB_AUTOCOMPLETE_MIN_CHARS = 2;

let currentUser = null;
let studioTmdbToken = 0;
let studioSelectedTmdb = null;
let editingReviewId = requestedEditReviewId || "";
let loadedReviewSnapshot = null;
let pendingEditLoad = false;
let selectedStudioMediaWrapper = null;
let studioMediaResizeState = null;
let studioDropTargetDepth = 0;
let draggedStudioMediaWrapper = null;
let currentStudioContentMode = "rich";
let activeStudioBlockTextarea = null;
const studioBlockEditorHistory = new WeakMap();
const STUDIO_HISTORY_LIMIT = 120;
let studioHistory = [];
let studioHistoryIndex = -1;

function getEditorHtml() {
  return getCleanStudioEditorHtml();
}

function getCleanStudioEditorHtml() {
  if (!studioEditor) return "";
  const clone = studioEditor.cloneNode(true);
  clone.querySelectorAll(".rich-media-resize-handle").forEach((node) => node.remove());
  clone.querySelectorAll(".rich-media-selected").forEach((node) => node.classList.remove("rich-media-selected"));
  return String(clone.innerHTML || "").trim();
}

function ensureStudioShellClasses(shell) {
  if (!(shell instanceof HTMLElement)) return;
  shell.setAttribute("contenteditable", "false");
  shell.setAttribute("draggable", "true");
  const hasSizeClass =
    shell.classList.contains("rich-media-size-small") ||
    shell.classList.contains("rich-media-size-medium") ||
    shell.classList.contains("rich-media-size-large");
  const hasAlignClass =
    shell.classList.contains("rich-media-inline") ||
    shell.classList.contains("rich-media-float-left") ||
    shell.classList.contains("rich-media-float-right") ||
    shell.classList.contains("rich-media-center");
  if (!hasSizeClass) shell.classList.add("rich-media-size-medium");
  if (!hasAlignClass) shell.classList.add("rich-media-center");
}

function normalizeStudioEditorMedia() {
  if (!studioEditor) return;
  studioEditor.querySelectorAll(".rich-media-resize-handle").forEach((node) => node.remove());
  studioEditor.querySelectorAll(".rich-media-shell").forEach((shell) => ensureStudioShellClasses(shell));
  studioEditor.querySelectorAll("img,video,audio").forEach((media) => {
    if (!(media instanceof HTMLElement)) return;
    if (media.closest(".rich-media-shell")) return;
    const shell = ensureStudioMediaShell(media);
    if (shell) ensureStudioShellClasses(shell);
  });
  studioEditor.querySelectorAll("iframe").forEach((frame) => {
    if (!(frame instanceof HTMLElement)) return;
    if (frame.closest(".rich-media-shell")) return;
    const videoWrap = frame.closest(".video-wrap");
    if (videoWrap instanceof HTMLElement && studioEditor.contains(videoWrap)) {
      if (!videoWrap.closest(".rich-media-shell")) {
        const shell = ensureStudioMediaShell(videoWrap);
        if (shell) ensureStudioShellClasses(shell);
      }
      return;
    }
    const shell = ensureStudioMediaShell(frame);
    if (shell) ensureStudioShellClasses(shell);
  });
  ensureStudioEditorHasEditableParagraph();
  updateStudioEditorEmptyState();
}

function moveDraggedStudioMedia(event) {
  if (!studioEditor || !draggedStudioMediaWrapper || !studioEditor.contains(draggedStudioMediaWrapper)) return false;
  let moved = false;
  const dropTarget = event.target instanceof Node ? getStudioMediaWrapperFromNode(event.target) : null;
  if (dropTarget && dropTarget !== draggedStudioMediaWrapper && dropTarget.parentNode) {
    const rect = dropTarget.getBoundingClientRect();
    const insertBefore = event.clientY < rect.top + rect.height / 2;
    dropTarget.parentNode.insertBefore(draggedStudioMediaWrapper, insertBefore ? dropTarget : dropTarget.nextSibling);
    moved = true;
  } else {
    if (!placeStudioCaretAtPoint(event.clientX, event.clientY)) return false;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    range.insertNode(draggedStudioMediaWrapper);
    moved = true;
  }
  const trailingParagraph = ensureStudioParagraphAfterMedia(draggedStudioMediaWrapper);
  if (trailingParagraph) placeStudioCaretInsideNode(trailingParagraph, false);
  else placeCaretAfterNode(draggedStudioMediaWrapper);
  return moved;
}

function clearDraggedStudioMediaState() {
  if (draggedStudioMediaWrapper) draggedStudioMediaWrapper.classList.remove("rich-media-dragging");
  draggedStudioMediaWrapper = null;
}

function isLikelyImageUrl(url) {
  const value = String(url || "").trim();
  if (!/^https?:\/\//i.test(value) && !/^data:image\//i.test(value)) return false;
  const clean = value.split("?")[0].split("#")[0].toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/.test(clean) || /^data:image\//i.test(value);
}

function getImageUrlsFromHtml(html) {
  const text = String(html || "").trim();
  if (!text) return [];
  const doc = new DOMParser().parseFromString(text, "text/html");
  return [...doc.querySelectorAll("img")]
    .map((img) => String(img.getAttribute("src") || "").trim())
    .filter(Boolean);
}

function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Impossible de lire l'image"));
    reader.readAsDataURL(file);
  });
}

function placeStudioCaretAtPoint(clientX, clientY) {
  if (!studioEditor) return false;
  const selection = window.getSelection();
  if (!selection) return false;
  let range = null;
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(clientX, clientY);
  } else if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(clientX, clientY);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
    }
  }
  if (!range) return false;
  if (!studioEditor.contains(range.startContainer) && range.startContainer !== studioEditor) return false;
  selection.removeAllRanges();
  selection.addRange(range);
  studioEditor.focus();
  return true;
}

function getStudioEditorContentWidth() {
  if (!studioEditor) return 0;
  const styles = window.getComputedStyle(studioEditor);
  const paddingLeft = Number.parseFloat(styles.paddingLeft || "0") || 0;
  const paddingRight = Number.parseFloat(styles.paddingRight || "0") || 0;
  return Math.max(0, studioEditor.clientWidth - paddingLeft - paddingRight);
}

function getStudioMediaMaxWidth(wrapper = null) {
  const contentWidth = getStudioEditorContentWidth();
  const isInline = wrapper instanceof HTMLElement && wrapper.classList.contains("rich-media-inline");
  const isFloat =
    wrapper instanceof HTMLElement &&
    (wrapper.classList.contains("rich-media-float-left") || wrapper.classList.contains("rich-media-float-right"));
  const reserve = isInline || isFloat ? 14 : 4;
  return Math.max(140, Math.floor(contentWidth - reserve));
}

function placeStudioCaretInsideNode(node, atEnd = false) {
  if (!(node instanceof Node) || !studioEditor) return;
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(!atEnd);
  selection.removeAllRanges();
  selection.addRange(range);
  studioEditor.focus();
}

function ensureStudioEditorHasEditableParagraph() {
  if (!studioEditor) return null;
  const hasAnyText = String(studioEditor.textContent || "").replace(/\u200B/g, "").trim().length > 0;
  const hasMedia = Boolean(studioEditor.querySelector(".rich-media-shell,img,video,audio,iframe,.video-wrap"));
  if (hasAnyText || hasMedia) return null;
  const p = document.createElement("p");
  p.appendChild(document.createElement("br"));
  studioEditor.appendChild(p);
  return p;
}

function ensureStudioParagraphAfterMedia(mediaNode) {
  if (!(mediaNode instanceof Node) || !studioEditor) return null;
  const nextNode = mediaNode.nextSibling;
  if (nextNode instanceof HTMLElement && nextNode.tagName.toLowerCase() === "p") return nextNode;
  if (nextNode instanceof Text && String(nextNode.textContent || "").trim()) return null;
  const p = document.createElement("p");
  p.appendChild(document.createElement("br"));
  mediaNode.parentNode?.insertBefore(p, nextNode || null);
  return p;
}

function updateStudioEditorEmptyState() {
  if (!studioEditor) return;
  const hasText = String(studioEditor.textContent || "").replace(/\u200B/g, "").trim().length > 0;
  const hasMedia = Boolean(studioEditor.querySelector(".rich-media-shell,img,video,audio,iframe,.video-wrap"));
  studioEditor.classList.toggle("is-editor-empty", !hasText && !hasMedia);
}

function insertStudioPlainText(text) {
  if (!studioEditor) return;
  const value = String(text || "");
  if (!value) return;
  studioEditor.focus();
  if (document.queryCommandSupported && document.queryCommandSupported("insertText")) {
    document.execCommand("insertText", false, value);
    queueHistorySnapshot();
    return;
  }
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) {
    studioEditor.appendChild(document.createTextNode(value));
    queueHistorySnapshot();
    return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(value));
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  queueHistorySnapshot();
}

async function handleStudioDroppedOrPastedImages(files = [], imageUrls = []) {
  if (!studioEditor) return false;
  const fileImages = [...files].filter((file) => file && String(file.type || "").toLowerCase().startsWith("image/"));
  const urls = [...imageUrls].map((entry) => String(entry || "").trim()).filter(Boolean);
  if (!fileImages.length && !urls.length) return false;
  studioEditor.focus();
  for (const url of urls) {
    insertStudioMediaShell(`<img src="${escapeHtml(url)}" alt="image" />`);
  }
  for (const file of fileImages) {
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      if (dataUrl) insertStudioMediaShell(`<img src="${escapeHtml(dataUrl)}" alt="image" />`);
    } catch {
      // Continue with remaining files.
    }
  }
  normalizeStudioEditorMedia();
  queueHistorySnapshot();
  return true;
}

function pushStudioHistorySnapshot(force = false) {
  if (!studioEditor) return;
  const html = getEditorHtml();
  const current = studioHistory[studioHistoryIndex];
  if (!force && current === html) return;
  if (studioHistoryIndex < studioHistory.length - 1) {
    studioHistory = studioHistory.slice(0, studioHistoryIndex + 1);
  }
  studioHistory.push(html);
  if (studioHistory.length > STUDIO_HISTORY_LIMIT) {
    const overflow = studioHistory.length - STUDIO_HISTORY_LIMIT;
    studioHistory.splice(0, overflow);
    studioHistoryIndex = Math.max(0, studioHistoryIndex - overflow);
  }
  studioHistoryIndex = studioHistory.length - 1;
}

function replaceEditorHtmlWithHistory(html) {
  if (!studioEditor) return;
  studioEditor.innerHTML = String(html || "");
  normalizeStudioEditorMedia();
  clearStudioSelectedMedia();
  studioEditor.focus();
}

function studioUndo() {
  if (!studioHistory.length || studioHistoryIndex <= 0) return;
  studioHistoryIndex -= 1;
  replaceEditorHtmlWithHistory(studioHistory[studioHistoryIndex]);
}

function studioRedo() {
  if (!studioHistory.length || studioHistoryIndex >= studioHistory.length - 1) return;
  studioHistoryIndex += 1;
  replaceEditorHtmlWithHistory(studioHistory[studioHistoryIndex]);
}

function queueHistorySnapshot() {
  window.setTimeout(() => pushStudioHistorySnapshot(false), 0);
}

function getStudioSelectedMediaWrapper() {
  if (selectedStudioMediaWrapper && studioEditor?.contains(selectedStudioMediaWrapper)) return selectedStudioMediaWrapper;
  if (!studioEditor) return null;
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return null;
  let node = selection.anchorNode;
  if (!node) return null;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  if (!(node instanceof HTMLElement)) return null;
  if (!studioEditor.contains(node)) return null;
  return getStudioMediaWrapperFromNode(node);
}

function getStudioMediaWrapperFromNode(node) {
  if (!(node instanceof HTMLElement)) return null;
  if (!studioEditor || !studioEditor.contains(node)) return null;
  const mediaFromNode = node.closest("img,video,audio,iframe");
  const media = mediaFromNode instanceof HTMLElement && studioEditor.contains(mediaFromNode) ? mediaFromNode : null;
  if (media instanceof HTMLElement && studioEditor.contains(media)) {
    const shell = media.closest(".rich-media-shell");
    if (shell instanceof HTMLElement && studioEditor.contains(shell)) return shell;
    return ensureStudioMediaShell(media);
  }
  const explicitWrap = node.closest(".video-wrap,.rich-media-shell");
  if (explicitWrap instanceof HTMLElement && studioEditor.contains(explicitWrap)) return explicitWrap;
  return null;
}

function ensureStudioMediaShell(media) {
  if (!(media instanceof HTMLElement)) return null;
  if (!studioEditor || !studioEditor.contains(media)) return null;
  const parent = media.parentElement;
  if (parent?.classList.contains("rich-media-shell")) return parent;
  const shell = document.createElement("span");
  shell.className = "rich-media-shell";
  shell.setAttribute("contenteditable", "false");
  media.parentNode?.insertBefore(shell, media);
  shell.appendChild(media);
  return shell;
}

function getStudioWrapperMediaElement(wrapper) {
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

function ensureStudioMediaFillsWrapper(wrapper) {
  const media = getStudioWrapperMediaElement(wrapper);
  if (!media || media === wrapper) return;
  const tag = media.tagName.toLowerCase();
  if (tag === "img" || tag === "video") {
    media.style.width = "100%";
    media.style.height = "auto";
    media.style.maxWidth = "100%";
    return;
  }
  if (tag === "audio") {
    media.style.width = "100%";
    return;
  }
  if (tag === "iframe") {
    media.style.width = "100%";
    media.style.maxWidth = "100%";
  }
}

function clearStudioSelectedMedia() {
  if (!selectedStudioMediaWrapper) return;
  selectedStudioMediaWrapper.classList.remove("rich-media-selected");
  [...selectedStudioMediaWrapper.children].forEach((child) => {
    if (child.classList?.contains("rich-media-resize-handle")) child.remove();
  });
  selectedStudioMediaWrapper = null;
}

function ensureStudioResizeHandle(wrapper) {
  if (!(wrapper instanceof HTMLElement)) return;
  let handle = [...wrapper.children].find((child) => child.classList?.contains("rich-media-resize-handle"));
  if (handle instanceof HTMLElement) return;
  handle = document.createElement("button");
  handle.type = "button";
  handle.className = "rich-media-resize-handle";
  handle.setAttribute("aria-label", "Redimensionner le média");
  handle.addEventListener("mousedown", (event) => event.preventDefault());
  handle.addEventListener("pointerdown", startStudioMediaResize);
  wrapper.appendChild(handle);
  positionStudioResizeHandle(wrapper, handle);
}

function positionStudioResizeHandle(wrapper, explicitHandle = null) {
  if (!(wrapper instanceof HTMLElement)) return;
  const handle =
    explicitHandle ||
    [...wrapper.children].find((child) => child.classList?.contains("rich-media-resize-handle"));
  if (!(handle instanceof HTMLElement)) return;
  const media = getStudioWrapperMediaElement(wrapper);
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

function selectStudioMedia(wrapper) {
  if (!wrapper || !studioEditor?.contains(wrapper)) return;
  if (selectedStudioMediaWrapper && selectedStudioMediaWrapper !== wrapper) {
    selectedStudioMediaWrapper.classList.remove("rich-media-selected");
    [...selectedStudioMediaWrapper.children].forEach((child) => {
      if (child.classList?.contains("rich-media-resize-handle")) child.remove();
    });
  }
  selectedStudioMediaWrapper = wrapper;
  selectedStudioMediaWrapper.classList.add("rich-media-selected");
  ensureStudioMediaFillsWrapper(selectedStudioMediaWrapper);
  ensureStudioResizeHandle(selectedStudioMediaWrapper);
  positionStudioResizeHandle(selectedStudioMediaWrapper);
}

function startStudioMediaResize(event) {
  const handle = event.currentTarget;
  if (!(handle instanceof HTMLElement) || !studioEditor) return;
  const wrapper = handle.parentElement;
  if (!(wrapper instanceof HTMLElement) || !studioEditor.contains(wrapper)) return;
  event.preventDefault();
  event.stopPropagation();
  selectStudioMedia(wrapper);
  const rect = wrapper.getBoundingClientRect();
  studioMediaResizeState = {
    wrapper,
    startX: event.clientX,
    startWidth: rect.width,
    minWidth: 120,
    maxWidth: getStudioMediaMaxWidth(wrapper)
  };
  window.addEventListener("pointermove", onStudioMediaResizeMove);
  window.addEventListener("pointerup", stopStudioMediaResize);
}

function onStudioMediaResizeMove(event) {
  if (!studioMediaResizeState) return;
  const { wrapper, startX, startWidth, minWidth } = studioMediaResizeState;
  const maxWidth = getStudioMediaMaxWidth(wrapper);
  studioMediaResizeState.maxWidth = maxWidth;
  const deltaX = event.clientX - startX;
  const nextWidth = Math.max(minWidth, Math.min(maxWidth, Math.round(startWidth + deltaX)));
  wrapper.classList.remove("rich-media-size-small", "rich-media-size-medium", "rich-media-size-large");
  wrapper.style.width = `${nextWidth}px`;
  wrapper.style.maxWidth = "100%";
  ensureStudioMediaFillsWrapper(wrapper);
  positionStudioResizeHandle(wrapper);
}

function stopStudioMediaResize() {
  if (!studioMediaResizeState) return;
  studioMediaResizeState = null;
  window.removeEventListener("pointermove", onStudioMediaResizeMove);
  window.removeEventListener("pointerup", stopStudioMediaResize);
  queueHistorySnapshot();
}

function applyStudioMediaAlign(align) {
  const target = getStudioSelectedMediaWrapper();
  if (!target) return false;
  selectStudioMedia(target);
  target.classList.remove("rich-media-inline", "rich-media-float-left", "rich-media-float-right", "rich-media-center");
  const cls =
    align === "left"
      ? "rich-media-float-left"
      : align === "right"
        ? "rich-media-float-right"
        : align === "inline"
          ? "rich-media-inline"
          : "rich-media-center";
  target.classList.add(cls);
  positionStudioResizeHandle(target);
  queueHistorySnapshot();
  return true;
}

function placeCaretAfterNode(node) {
  if (!(node instanceof Node) || !studioEditor) return;
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertStudioMediaShell(innerHtml) {
  if (!studioEditor) return null;
  studioEditor.focus();
  const wrapper = document.createElement("span");
  wrapper.className = "rich-media-shell rich-media-center rich-media-size-medium";
  wrapper.setAttribute("contenteditable", "false");
  wrapper.innerHTML = innerHtml;
  const selection = window.getSelection();
  if (selection && selection.rangeCount) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(wrapper);
  } else {
    studioEditor.appendChild(wrapper);
  }
  const trailingParagraph = ensureStudioParagraphAfterMedia(wrapper);
  if (trailingParagraph) placeStudioCaretInsideNode(trailingParagraph, false);
  else placeCaretAfterNode(wrapper);
  normalizeStudioEditorMedia();
  selectStudioMedia(wrapper);
  queueHistorySnapshot();
  return wrapper;
}

function refreshDeleteButtonState() {
  if (!studioDeleteReviewBtn) return;
  const canDelete = Boolean(editingReviewId);
  studioDeleteReviewBtn.classList.toggle("hidden", !canDelete);
  studioDeleteReviewBtn.disabled = !canDelete;
}

function wrapSelectionWithTag(tag) {
  if (!studioEditor || !tag) return;
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  const selectedText = range.toString();
  if (!selectedText) return;
  const wrapper = document.createElement(tag === "spoiler" ? "button" : tag);
  if (tag === "spoiler") {
    wrapper.className = "spoiler-text";
    wrapper.type = "button";
  }
  wrapper.textContent = selectedText;
  range.deleteContents();
  range.insertNode(wrapper);
  selection.removeAllRanges();
  const next = document.createRange();
  next.selectNodeContents(wrapper);
  selection.addRange(next);
}

function handleStudioAction(action) {
  if (!studioEditor || !action) return;
  studioEditor.focus();
  if (action === "quote") return document.execCommand("formatBlock", false, "blockquote");
  if (action === "strike") return document.execCommand("strikeThrough", false, null);
  if (action === "left") {
    if (applyStudioMediaAlign("left")) return;
    return document.execCommand("justifyLeft", false, null);
  }
  if (action === "center") {
    if (applyStudioMediaAlign("center")) return;
    return document.execCommand("justifyCenter", false, null);
  }
  if (action === "inline") {
    if (applyStudioMediaAlign("inline")) return;
    return;
  }
  if (action === "right") {
    if (applyStudioMediaAlign("right")) return;
    return document.execCommand("justifyRight", false, null);
  }
  if (action === "justify") return document.execCommand("justifyFull", false, null);
  if (action === "ol") return document.execCommand("insertOrderedList", false, null);
  if (action === "ul") return document.execCommand("insertUnorderedList", false, null);
  if (action === "undo") return studioUndo();
  if (action === "redo") return studioRedo();
  if (action === "clear") return document.execCommand("removeFormat", false, null);
  if (action === "url") {
    const url = window.prompt("URL du lien");
    if (!url) return;
    return document.execCommand("createLink", false, url.trim());
  }
}

function closeMenu() {
  if (!menu) return;
  menu.classList.remove("open");
  if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
}

if (menuToggle && menu) {
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.addEventListener("click", () => {
    const next = !menu.classList.contains("open");
    menu.classList.toggle("open", next);
    menuToggle.setAttribute("aria-expanded", next ? "true" : "false");
  });
  document.addEventListener("click", (event) => {
    if (!menu.classList.contains("open")) return;
    if (menu.contains(event.target) || menuToggle.contains(event.target)) return;
    closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

const activeMenuLink = document.querySelector('.menu a[href="index.html"]');
if (activeMenuLink) activeMenuLink.setAttribute("aria-current", "page");

function extractYear(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "";
}

function tmdbImageUrl(path, size = "w780") {
  if (!path) return "";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

function tmdbMediaTypeFromCategory(category) {
  return String(category || "").trim().toLowerCase() === "serie" ? "tv" : "movie";
}

function getTmdbTitle(item) {
  return String(item?.title || item?.name || "").trim();
}

function getTmdbReleaseDate(item) {
  return String(item?.release_date || item?.first_air_date || "").trim();
}

function normalizeYouTubeEmbed(url) {
  try {
    const u = new URL(url);
    const host = String(u.hostname || "").toLowerCase();
    const path = String(u.pathname || "");
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      if (u.searchParams.get("v")) {
        return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
      }
      if (host.includes("youtu.be")) {
        return `https://www.youtube.com/embed/${path.replace("/", "")}`;
      }
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

async function searchTmdbTitles(query, mediaType) {
  const q = String(query || "").trim();
  if (!TMDB_API_KEY || q.length < TMDB_AUTOCOMPLETE_MIN_CHARS) return [];
  if (mediaType !== "movie" && mediaType !== "tv") return [];
  const url = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&language=fr-FR&query=${encodeURIComponent(q)}&include_adult=false`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("TMDB search failed");
  const data = await response.json();
  return (Array.isArray(data?.results) ? data.results : []).slice(0, 8).map((entry) => ({
    id: entry.id,
    mediaType,
    title: getTmdbTitle(entry),
    year: extractYear(getTmdbReleaseDate(entry)),
    poster: tmdbImageUrl(entry.poster_path, "w500"),
    cover: tmdbImageUrl(entry.backdrop_path, "w1280"),
    overview: String(entry?.overview || "").trim()
  }));
}

async function getTmdbDetails(id, mediaType) {
  if (!TMDB_API_KEY || !id) return {};
  const type = mediaType === "tv" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/${type}/${encodeURIComponent(id)}?api_key=${TMDB_API_KEY}&language=fr-FR&append_to_response=credits`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("TMDB details failed");
  const data = await response.json();
  const crew = Array.isArray(data?.credits?.crew) ? data.credits.crew : [];
  const directorNames = crew.filter((person) => person?.job === "Director" && person?.name).map((person) => person.name);
  const creators = Array.isArray(data?.created_by) ? data.created_by.filter((person) => person?.name).map((person) => person.name) : [];
  return {
    title: getTmdbTitle(data),
    year: extractYear(getTmdbReleaseDate(data)),
    poster: tmdbImageUrl(data?.poster_path, "w500"),
    cover: tmdbImageUrl(data?.backdrop_path, "w1280"),
    director: directorNames.join(", ") || creators.join(", "),
    overview: String(data?.overview || "").trim()
  };
}

async function getTmdbImageChoices(id, mediaType) {
  if (!TMDB_API_KEY || !id) return { posters: [], backdrops: [] };
  const type = mediaType === "tv" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/${type}/${encodeURIComponent(id)}/images?api_key=${TMDB_API_KEY}&include_image_language=fr,en,null`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("TMDB images failed");
  const data = await response.json();
  const posters = (Array.isArray(data?.posters) ? data.posters : [])
    .filter((img) => img?.file_path)
    .slice(0, 30)
    .map((img) => tmdbImageUrl(img.file_path, "w500"));
  const backdrops = (Array.isArray(data?.backdrops) ? data.backdrops : [])
    .filter((img) => img?.file_path)
    .slice(0, 30)
    .map((img) => tmdbImageUrl(img.file_path, "w1280"));
  return { posters, backdrops };
}

function isGameCategory(category) {
  return String(category || "").trim().toLowerCase() === "jeu";
}

async function searchIgdbGames(query) {
  const q = String(query || "").trim();
  if (q.length < IGDB_AUTOCOMPLETE_MIN_CHARS) return [];
  const response = await fetch(`/api/igdb?mode=search&q=${encodeURIComponent(q)}&limit=8`);
  if (!response.ok) throw new Error("IGDB search failed");
  const data = await response.json();
  const list = Array.isArray(data?.results) ? data.results : [];
  return list.map((entry) => ({
    id: entry.id,
    mediaType: "igdb_game",
    provider: "igdb",
    title: String(entry?.title || "").trim(),
    year: String(entry?.year || "").trim(),
    poster: String(entry?.poster || "").trim(),
    cover: String(entry?.cover || "").trim(),
    overview: String(entry?.overview || "").trim(),
    studio: String(entry?.studio || "").trim()
  }));
}

async function getIgdbGameDetails(id) {
  if (!id) return {};
  const response = await fetch(`/api/igdb?mode=details&id=${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error("IGDB details failed");
  const data = await response.json();
  const entry = data?.details || {};
  return {
    title: String(entry?.title || "").trim(),
    year: String(entry?.year || "").trim(),
    poster: String(entry?.poster || "").trim(),
    cover: String(entry?.cover || "").trim(),
    studio: String(entry?.studio || "").trim(),
    overview: String(entry?.overview || "").trim()
  };
}

async function getIgdbImageChoices(id) {
  if (!id) return { posters: [], backdrops: [] };
  const response = await fetch(`/api/igdb?mode=images&id=${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error("IGDB images failed");
  const data = await response.json();
  return {
    posters: Array.isArray(data?.images?.posters) ? data.images.posters : [],
    backdrops: Array.isArray(data?.images?.backdrops) ? data.images.backdrops : []
  };
}

function updateAssetButtonsState() {
  if (!studioMetaForm) return;
  const posterValue = String(studioMetaForm.elements.poster.value || "").trim();
  const coverValue = String(studioMetaForm.elements.cover.value || "").trim();
  const category = String(studioMetaForm.elements.category?.value || "").trim().toLowerCase();
  const provider = isGameCategory(category) ? "IGDB" : "TMDB";
  const hasLinkedMedia = Boolean(studioSelectedTmdb?.id);
  const posterFromProvider = hasLinkedMedia && (
    provider === "IGDB"
      ? /images\.igdb\.com/i.test(posterValue)
      : /image\.tmdb\.org/i.test(posterValue)
  );
  const coverFromProvider = hasLinkedMedia && (
    provider === "IGDB"
      ? /images\.igdb\.com/i.test(coverValue)
      : /image\.tmdb\.org/i.test(coverValue)
  );
  if (studioPosterPickerBtn) {
    studioPosterPickerBtn.textContent = posterFromProvider ? `Modifier via ${provider} ✓` : `Modifier via ${provider}`;
    studioPosterPickerBtn.disabled = !hasLinkedMedia;
  }
  if (studioCoverPickerBtn) {
    studioCoverPickerBtn.textContent = coverFromProvider ? `Modifier via ${provider} ✓` : `Modifier via ${provider}`;
    studioCoverPickerBtn.disabled = !hasLinkedMedia;
  }
}

function setStudioLinkedMedia(id, mediaType, providerHint = "") {
  if (!studioMetaForm) return false;
  const normalizedId = String(id || "").trim();
  if (!normalizedId) return false;
  const category = String(studioMetaForm.elements.category?.value || "").trim().toLowerCase();
  const normalizedMediaType = String(mediaType || "").trim() || (isGameCategory(category) ? "igdb_game" : tmdbMediaTypeFromCategory(category));
  const provider =
    String(providerHint || "").trim().toLowerCase() ||
    (normalizedMediaType.startsWith("igdb") ? "igdb" : (isGameCategory(category) ? "igdb" : "tmdb"));
  studioSelectedTmdb = { id: normalizedId, mediaType: normalizedMediaType, provider };
  studioMetaForm.elements.tmdbId.value = normalizedId;
  studioMetaForm.elements.tmdbMediaType.value = normalizedMediaType;
  updateAssetButtonsState();
  return true;
}

async function ensureStudioLinkedMediaForAssetPicker() {
  if (!studioMetaForm || !studioTitleInput) return false;
  if (studioSelectedTmdb?.id) return true;

  const savedId = String(studioMetaForm.elements.tmdbId.value || "").trim();
  const savedType = String(studioMetaForm.elements.tmdbMediaType.value || "").trim();
  if (savedId) {
    return setStudioLinkedMedia(savedId, savedType);
  }

  const title = String(studioTitleInput.value || "").trim();
  const category = String(studioMetaForm.elements.category?.value || "").trim().toLowerCase();
  if (!title || !["film", "serie", "jeu"].includes(category)) return false;

  try {
    const isGame = category === "jeu";
    const results = isGame
      ? await searchIgdbGames(title)
      : await searchTmdbTitles(title, tmdbMediaTypeFromCategory(category));
    const best = (results || []).find((entry) => String(entry.title || "").trim().toLowerCase() === title.toLowerCase()) || results[0];
    if (!best?.id) return false;
    return setStudioLinkedMedia(best.id, best.mediaType, best.provider || (isGame ? "igdb" : "tmdb"));
  } catch {
    return false;
  }
}

function openTmdbImagePicker(images, kindLabel, mode = "poster") {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-dialog studio-image-picker-dialog" role="dialog" aria-modal="true" aria-label="Choisir une image TMDB">
        <p class="confirm-title">Choisir ${kindLabel}</p>
        <div class="studio-image-picker-grid ${mode === "backdrop" ? "is-backdrop" : "is-poster"}"></div>
        <div class="confirm-actions">
          <button type="button" class="action-btn secondary" data-studio-picker-action="cancel">Annuler</button>
        </div>
      </div>
    `;
    const grid = overlay.querySelector(".studio-image-picker-grid");
    if (!grid) return resolve("");
    images.forEach((url) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "studio-image-choice";
      button.innerHTML = `<img src="${url}" alt="${kindLabel}" loading="lazy" />`;
      button.addEventListener("click", () => {
        cleanup();
        resolve(url);
      });
      grid.appendChild(button);
    });
    const cleanup = () => {
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
    };
    const close = () => {
      cleanup();
      resolve("");
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    overlay.querySelector('[data-studio-picker-action="cancel"]')?.addEventListener("click", close);
    document.addEventListener("keydown", onKeyDown);
    document.body.appendChild(overlay);
  });
}

function hideTmdbSuggestions(list) {
  if (!list) return;
  list.innerHTML = "";
  list.hidden = true;
}

function setupStudioTmdbAutocomplete() {
  if (!studioTitleInput || !studioMetaForm) return;
  const host = document.querySelector(".studio-title-wrap") || studioTitleInput.parentElement;
  if (!host) return;
  const list = document.createElement("ul");
  list.className = "tmdb-suggestion-box";
  list.hidden = true;
  host.appendChild(list);
  let debounceTimer = null;
  let requestId = 0;

  const renderSuggestions = (items = []) => {
    list.innerHTML = "";
    if (!items.length) {
      list.hidden = true;
      return;
    }
    items.forEach((item) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tmdb-suggestion-btn";
      button.textContent = `${item.title || "Sans titre"}${item.year ? ` (${item.year})` : ""}`;
      button.addEventListener("mousedown", async (event) => {
        event.preventDefault();
        studioTmdbToken += 1;
        const token = studioTmdbToken;
        setStudioLinkedMedia(item.id, item.mediaType, item.provider || "tmdb");
        studioTitleInput.value = item.title || studioTitleInput.value;
        if (!studioMetaForm.elements.poster.value.trim()) studioMetaForm.elements.poster.value = item.poster || "";
        if (!studioMetaForm.elements.cover.value.trim()) studioMetaForm.elements.cover.value = item.cover || "";
        if (!studioMetaForm.elements.releaseYear.value.trim()) studioMetaForm.elements.releaseYear.value = item.year || "";
        if (!studioMetaForm.elements.director.value.trim() && item.studio) studioMetaForm.elements.director.value = item.studio;
        if (studioSynopsisInput && !studioSynopsisInput.value.trim()) studioSynopsisInput.value = item.overview || "";
        if (item.overview) studioMetaForm.elements.tmdbOverview.value = item.overview;
        hideTmdbSuggestions(list);
        refreshHeroPreview();
        try {
          const details = item.provider === "igdb"
            ? await getIgdbGameDetails(item.id)
            : await getTmdbDetails(item.id, item.mediaType);
          if (token !== studioTmdbToken) return;
          if (details.title) studioTitleInput.value = details.title;
          if (details.poster) studioMetaForm.elements.poster.value = details.poster;
          if (details.cover) studioMetaForm.elements.cover.value = details.cover;
          if (details.year) studioMetaForm.elements.releaseYear.value = details.year;
          if (details.studio) studioMetaForm.elements.director.value = details.studio;
          if (details.director) studioMetaForm.elements.director.value = details.director;
          if (studioSynopsisInput && details.overview && !studioSynopsisInput.value.trim()) studioSynopsisInput.value = details.overview;
          if (details.overview) studioMetaForm.elements.tmdbOverview.value = details.overview;
          setStudioLinkedMedia(item.id, item.mediaType, item.provider || "tmdb");
          refreshHeroPreview();
        } catch {
          // Keep base suggestion values if details request fails.
        }
      });
      li.appendChild(button);
      list.appendChild(li);
    });
    list.hidden = false;
  };

  studioTitleInput.addEventListener("input", () => {
    const query = String(studioTitleInput.value || "").trim();
    const category = String(studioMetaForm.elements.category?.value || "").trim().toLowerCase();
    studioSelectedTmdb = null;
    studioMetaForm.elements.tmdbId.value = "";
    studioMetaForm.elements.tmdbMediaType.value = "";
    updateAssetButtonsState();
    const isFilmOrSerie = ["film", "serie"].includes(category);
    const isGame = isGameCategory(category);
    if (!isFilmOrSerie && !isGame) {
      hideTmdbSuggestions(list);
      return;
    }
    const minChars = isGame ? IGDB_AUTOCOMPLETE_MIN_CHARS : TMDB_AUTOCOMPLETE_MIN_CHARS;
    if (query.length < minChars) {
      hideTmdbSuggestions(list);
      return;
    }
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(async () => {
      const currentRequest = ++requestId;
      try {
        const results = isGame
          ? await searchIgdbGames(query)
          : await searchTmdbTitles(query, tmdbMediaTypeFromCategory(category));
        if (currentRequest !== requestId) return;
        renderSuggestions(results);
      } catch {
        if (currentRequest !== requestId) return;
        hideTmdbSuggestions(list);
      }
    }, 220);
  });

  studioMetaForm.elements.category?.addEventListener("change", () => {
    studioSelectedTmdb = null;
    studioMetaForm.elements.tmdbId.value = "";
    studioMetaForm.elements.tmdbMediaType.value = "";
    updateAssetButtonsState();
    hideTmdbSuggestions(list);
  });

  studioTitleInput.addEventListener("focus", () => {
    if (list.innerHTML.trim()) list.hidden = false;
  });

  studioTitleInput.addEventListener("blur", () => {
    window.setTimeout(() => hideTmdbSuggestions(list), 130);
  });
}

function refreshHeroPreview() {
  if (!studioMetaForm) return;
  const cover = String(studioMetaForm.elements.cover.value || "").trim();
  if (studioCoverBg) {
    studioCoverBg.src = cover || DEFAULT_COVER;
  }
  updateAssetButtonsState();
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setStudioContentMode(mode = "rich") {
  const nextMode = mode === "blocks" ? "blocks" : "rich";
  currentStudioContentMode = nextMode;
  if (studioRichEditorSection) studioRichEditorSection.classList.remove("hidden");
  if (studioEditor) studioEditor.classList.toggle("hidden", nextMode !== "rich");
  if (studioBlocksEditorSection) studioBlocksEditorSection.classList.toggle("hidden", nextMode !== "blocks");
  if (studioAddBlockBtn) {
    const show = nextMode === "blocks";
    studioAddBlockBtn.classList.toggle("hidden", !show);
    studioAddBlockBtn.style.display = show ? "" : "none";
  }
  if (studioImageBtn) {
    const show = nextMode !== "blocks";
    studioImageBtn.classList.toggle("hidden", !show);
    studioImageBtn.style.display = show ? "" : "none";
  }
  if (studioVideoBtn) {
    const show = nextMode !== "blocks";
    studioVideoBtn.classList.toggle("hidden", !show);
    studioVideoBtn.style.display = show ? "" : "none";
  }
  studioContentModeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.studioContentMode === nextMode);
  });
  if (nextMode === "blocks" && studioBlocksList && !studioBlocksList.children.length) {
    setStudioBlocks([]);
  }
  if (nextMode === "rich") {
    normalizeStudioEditorMedia();
  }
}

function getTargetStudioBlockTextarea() {
  if (document.activeElement instanceof HTMLTextAreaElement && document.activeElement.classList.contains("block-content")) {
    activeStudioBlockTextarea = document.activeElement;
    return activeStudioBlockTextarea;
  }
  if (activeStudioBlockTextarea && studioBlocksList?.contains(activeStudioBlockTextarea)) return activeStudioBlockTextarea;
  const fallback = studioBlocksList?.querySelector(".block-content");
  if (fallback instanceof HTMLTextAreaElement) {
    activeStudioBlockTextarea = fallback;
    return fallback;
  }
  return null;
}

function initStudioBlockHistory(textarea) {
  if (!(textarea instanceof HTMLTextAreaElement)) return null;
  let state = studioBlockEditorHistory.get(textarea);
  if (!state) {
    state = { stack: [textarea.value], index: 0, applying: false };
    studioBlockEditorHistory.set(textarea, state);
  }
  return state;
}

function recordStudioBlockHistory(textarea) {
  const state = initStudioBlockHistory(textarea);
  if (!state || state.applying) return;
  const value = textarea.value;
  if (state.stack[state.index] === value) return;
  state.stack = state.stack.slice(0, state.index + 1);
  state.stack.push(value);
  if (state.stack.length > 300) state.stack.shift();
  state.index = state.stack.length - 1;
}

function applyStudioBlockHistoryStep(textarea, direction) {
  const state = initStudioBlockHistory(textarea);
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

function handleStudioBlockTextareaKeydown(event) {
  const textarea = event.currentTarget;
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  if (!(event.ctrlKey || event.metaKey)) return;
  const key = String(event.key || "").toLowerCase();
  if (key === "z" && !event.shiftKey) {
    if (applyStudioBlockHistoryStep(textarea, -1)) event.preventDefault();
    return;
  }
  if (key === "y" || (key === "z" && event.shiftKey)) {
    if (applyStudioBlockHistoryStep(textarea, 1)) event.preventDefault();
  }
}

function insertAtStudioBlockSelection(text) {
  const textarea = getTargetStudioBlockTextarea();
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

function wrapStudioBlockSelection(prefix, suffix) {
  const textarea = getTargetStudioBlockTextarea();
  if (!textarea) return;
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const value = textarea.value;
  const selected = value.slice(start, end) || "Texte";
  textarea.value = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
  textarea.focus();
  textarea.selectionStart = start + prefix.length;
  textarea.selectionEnd = start + prefix.length + selected.length;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function wrapStudioBlockLinesAsList(ordered = false) {
  const textarea = getTargetStudioBlockTextarea();
  if (!textarea) return;
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const value = textarea.value;
  const selected = value.slice(start, end).trim();
  if (!selected) {
    const tag = ordered ? "[list=1]\n[*]Item 1\n[*]Item 2\n[/list]" : "[list]\n[*]Item 1\n[*]Item 2\n[/list]";
    insertAtStudioBlockSelection(tag);
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

function applyStudioBlockAction(action) {
  if (!action) return;
  if (action === "quote") return wrapStudioBlockSelection("[quote]\n", "\n[/quote]");
  if (action === "strike") return wrapStudioBlockSelection("[s]", "[/s]");
  if (action === "left") return wrapStudioBlockSelection("[left]", "[/left]");
  if (action === "center") return wrapStudioBlockSelection("[center]", "[/center]");
  if (action === "right") return wrapStudioBlockSelection("[right]", "[/right]");
  if (action === "justify") return wrapStudioBlockSelection("[justify]", "[/justify]");
  if (action === "undo") {
    const textarea = getTargetStudioBlockTextarea();
    if (!textarea) return;
    applyStudioBlockHistoryStep(textarea, -1);
    return;
  }
  if (action === "redo") {
    const textarea = getTargetStudioBlockTextarea();
    if (!textarea) return;
    applyStudioBlockHistoryStep(textarea, 1);
    return;
  }
  if (action === "clear") {
    const textarea = getTargetStudioBlockTextarea();
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
  if (action === "ul") return wrapStudioBlockLinesAsList(false);
  if (action === "ol") return wrapStudioBlockLinesAsList(true);
  if (action === "url") {
    const url = window.prompt("URL du lien");
    if (!url) return;
    const textarea = getTargetStudioBlockTextarea();
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = textarea.value.slice(start, end).trim();
    const bb = selected ? `[url=${url.trim()}]${selected}[/url]` : `[url]${url.trim()}[/url]`;
    insertAtStudioBlockSelection(bb);
  }
}

function applyStudioBlockColor(color) {
  if (!color) return;
  wrapStudioBlockSelection(`[color=${color}]`, "[/color]");
}

function applyStudioBlockSize(px) {
  const size = Math.max(10, Math.min(72, Number(px) || 16));
  wrapStudioBlockSelection(`[size=${size}]`, "[/size]");
}

function applyStudioBlockHighlight(color) {
  if (!color) return;
  wrapStudioBlockSelection(`[mark=${color}]`, "[/mark]");
}

function appendStudioBlock(block = { type: "text", content: "" }) {
  if (!studioBlocksList) return;
  studioBlocksList.appendChild(createStudioBlockRow(block));
  updateStudioBlockIndex();
  setStudioContentMode("blocks");
}

function updateStudioBlockIndex() {
  if (!studioBlocksList) return;
  [...studioBlocksList.querySelectorAll(".block-item")].forEach((row, idx) => {
    const index = row.querySelector(".block-index");
    if (index) index.textContent = `Bloc ${idx + 1}`;
  });
}

function getStudioBlockFieldsHtml(type, block = {}) {
  if (type === "text") {
    return `<textarea class="block-content" rows="5" placeholder="Ton texte...">${escapeHtml(block.content || "")}</textarea>`;
  }
  if (type === "image-text-left" || type === "image-text-right") {
    return `
      <div class="block-media-pair">
        <input class="block-url" type="url" placeholder="URL image" value="${escapeHtml(block.url || "")}" />
      </div>
      <textarea class="block-content" rows="5" placeholder="Texte à côté de l'image...">${escapeHtml(block.content || "")}</textarea>
    `;
  }
  if (type === "two-images") {
    return `
      <div class="block-media-pair">
        <input class="block-url" type="url" placeholder="URL image gauche" value="${escapeHtml(block.url || "")}" />
        <input class="block-url-2" type="url" placeholder="URL image droite" value="${escapeHtml(block.url2 || "")}" />
      </div>
    `;
  }
  if (type === "gallery") {
    return `<textarea class="block-gallery-urls" rows="6" placeholder="Une URL d'image par ligne...">${escapeHtml(block.content || "")}</textarea>`;
  }
  return `
    <div class="block-media-pair">
      <input class="block-url" type="url" placeholder="URL" value="${escapeHtml(block.url || "")}" />
    </div>
  `;
}

function createStudioBlockRow(block = { type: "text", content: "", url: "", caption: "" }) {
  const row = document.createElement("div");
  row.className = "block-item";
  row.innerHTML = `
    <div class="block-head">
      <strong class="block-index">Bloc</strong>
      <div class="block-type-tools">
        <select class="block-type">
          <option value="text">Texte</option>
          <option value="image">Image</option>
          <option value="image-text-left">Image gauche + Texte droite</option>
          <option value="image-text-right">Texte gauche + Image droite</option>
          <option value="two-images">2 images côte à côte</option>
          <option value="gallery">Galerie screenshots</option>
          <option value="video">Vidéo</option>
          <option value="video-embed">Vidéo embed</option>
          <option value="audio">Audio</option>
        </select>
        <button type="button" class="action-btn secondary block-up" title="Monter le bloc">&uarr;</button>
        <button type="button" class="action-btn secondary block-down" title="Descendre le bloc">&darr;</button>
      </div>
      <div class="row-actions">
        <button type="button" class="action-btn danger block-delete">Supprimer</button>
      </div>
    </div>
    <div class="block-fields"></div>
  `;

  const typeSelect = row.querySelector(".block-type");
  const fields = row.querySelector(".block-fields");
  const renderFields = () => {
    fields.innerHTML = getStudioBlockFieldsHtml(typeSelect.value, block);
    fields.querySelectorAll("input,textarea").forEach((el) => {
      el.addEventListener("input", () => {
        if (el instanceof HTMLTextAreaElement && (el.classList.contains("block-content") || el.classList.contains("block-gallery-urls"))) {
          recordStudioBlockHistory(el);
        }
      });
      if (el instanceof HTMLTextAreaElement && (el.classList.contains("block-content") || el.classList.contains("block-gallery-urls"))) {
        const remember = () => {
          activeStudioBlockTextarea = el;
          initStudioBlockHistory(el);
        };
        el.addEventListener("focus", remember);
        el.addEventListener("click", remember);
        el.addEventListener("keydown", handleStudioBlockTextareaKeydown);
        remember();
      }
    });
  };

  typeSelect.value = block.type || "text";
  renderFields();
  typeSelect.addEventListener("change", () => {
    block.type = typeSelect.value;
    renderFields();
  });
  row.querySelector(".block-delete")?.addEventListener("click", () => {
    row.remove();
    if (studioBlocksList && !studioBlocksList.children.length) {
      studioBlocksList.appendChild(createStudioBlockRow({ type: "text", content: "" }));
    }
    updateStudioBlockIndex();
  });
  row.querySelector(".block-up")?.addEventListener("click", () => {
    const prev = row.previousElementSibling;
    if (prev && studioBlocksList) {
      studioBlocksList.insertBefore(row, prev);
      updateStudioBlockIndex();
      row.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
  row.querySelector(".block-down")?.addEventListener("click", () => {
    const next = row.nextElementSibling;
    if (next && studioBlocksList) {
      studioBlocksList.insertBefore(next, row);
      updateStudioBlockIndex();
      row.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
  return row;
}

function setStudioBlocks(blocks = []) {
  if (!studioBlocksList) return;
  studioBlocksList.innerHTML = "";
  const rows = Array.isArray(blocks) ? blocks : [];
  if (!rows.length) {
    studioBlocksList.appendChild(createStudioBlockRow({ type: "text", content: "" }));
  } else {
    rows.forEach((block) => studioBlocksList.appendChild(createStudioBlockRow(block)));
  }
  updateStudioBlockIndex();
}

function readStudioBlocks() {
  if (!studioBlocksList) return [];
  return [...studioBlocksList.querySelectorAll(".block-item")]
    .map((row) => {
      const type = row.querySelector(".block-type")?.value || "text";
      if (type === "text") {
        const content = row.querySelector(".block-content")?.value.trim() || "";
        return content ? { type, content, url: "", caption: "" } : null;
      }
      if (type === "image-text-left" || type === "image-text-right") {
        const url = row.querySelector(".block-url")?.value.trim() || "";
        const content = row.querySelector(".block-content")?.value.trim() || "";
        return url || content ? { type, content, url, caption: "" } : null;
      }
      if (type === "two-images") {
        const url = row.querySelector(".block-url")?.value.trim() || "";
        const url2 = row.querySelector(".block-url-2")?.value.trim() || "";
        return url || url2 ? { type, content: "", url, caption: "", url2, caption2: "" } : null;
      }
      if (type === "gallery") {
        const content = row.querySelector(".block-gallery-urls")?.value.trim() || "";
        return content ? { type, content, url: "", caption: "" } : null;
      }
      const url = row.querySelector(".block-url")?.value.trim() || "";
      return url ? { type, content: "", url, caption: "" } : null;
    })
    .filter(Boolean);
}

function isAdminUser(user) {
  return String(user?.username || "").trim().toLowerCase() === "admin";
}

function blocksToSimpleHtml(blocks = []) {
  if (!Array.isArray(blocks) || !blocks.length) return "";
  return blocks
    .filter((block) => block?.type === "text" && String(block?.content || "").trim())
    .map((block) => `<p>${escapeHtml(block.content).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

async function tryLoadEditReview() {
  if (!editingReviewId || !currentUser || pendingEditLoad || !studioMetaForm || !studioEditor) return;
  pendingEditLoad = true;
  let item = null;
  try {
    item = await window.ReviewsStore.getById(editingReviewId);
  } catch (error) {
    window.alert(`Impossible de charger la review : ${error.message}`);
    pendingEditLoad = false;
    return;
  }

  const canEdit = isAdminUser(currentUser) || (item?.ownerId && item.ownerId === currentUser.uid);
  if (!canEdit) {
    window.alert("Cette review appartient à un autre utilisateur.");
    window.location.href = `review.html?id=${encodeURIComponent(editingReviewId)}`;
    pendingEditLoad = false;
    return;
  }

  loadedReviewSnapshot = item;
  studioTitleInput.value = item?.title || "";
  studioSummaryInput.value = item?.summary || "";
  studioMetaForm.elements.category.value = item?.category || "film";
  studioMetaForm.elements.date.value = item?.date || new Date().toISOString().slice(0, 10);
  studioMetaForm.elements.status.value = String(item?.status || "draft");
  studioMetaForm.elements.director.value = item?.director || "";
  studioMetaForm.elements.releaseYear.value = item?.releaseYear || "";
  studioMetaForm.elements.score.value = Number.isFinite(Number(item?.score)) ? String(Number(item.score)) : "";
  studioMetaForm.elements.bgMusic.value = item?.bgMusic || "";
  studioMetaForm.elements.poster.value = item?.poster || "";
  studioMetaForm.elements.cover.value = item?.cover || "";
  const loadedSynopsis = String(item?.tmdbOverview || "").trim();
  studioMetaForm.elements.tmdbOverview.value = loadedSynopsis;
  if (studioSynopsisInput) studioSynopsisInput.value = loadedSynopsis;
  studioMetaForm.elements.tmdbId.value = String(item?.tmdbId || "");
  studioMetaForm.elements.tmdbMediaType.value = String(item?.tmdbMediaType || "");
  studioSelectedTmdb = null;
  if (item?.tmdbId) {
    setStudioLinkedMedia(
      item.tmdbId,
      String(item.tmdbMediaType || (isGameCategory(item?.category) ? "igdb_game" : tmdbMediaTypeFromCategory(item?.category || "film"))),
      String(item.tmdbMediaType || "").trim().toLowerCase().startsWith("igdb") ? "igdb" : (isGameCategory(item?.category) ? "igdb" : "tmdb")
    );
  }
  if (!studioSelectedTmdb?.id) {
    const title = String(item?.title || "").trim();
    const category = String(item?.category || "").trim().toLowerCase();
    if (title && (category === "film" || category === "serie" || category === "jeu")) {
      try {
        const isGame = category === "jeu";
        const results = isGame
          ? await searchIgdbGames(title)
          : await searchTmdbTitles(title, tmdbMediaTypeFromCategory(category));
        const best = (results || []).find((entry) => String(entry.title || "").trim().toLowerCase() === title.toLowerCase()) || results[0];
        if (best?.id) {
          setStudioLinkedMedia(best.id, best.mediaType, best.provider || (isGame ? "igdb" : "tmdb"));
        }
      } catch {
        // Keep studio usable even if TMDB fallback lookup fails.
      }
    }
  }
  const loadedMode = String(item?.contentMode || "").trim().toLowerCase() === "rich" ? "rich" : "blocks";
  studioEditor.innerHTML = loadedMode === "rich"
    ? String(item?.bodyHtml || blocksToSimpleHtml(item?.blocks || []))
    : String(item?.bodyHtml || "");
  setStudioBlocks(item?.blocks || []);
  setStudioContentMode(loadedMode);
  normalizeStudioEditorMedia();
  clearStudioSelectedMedia();
  studioHistory = [];
  studioHistoryIndex = -1;
  pushStudioHistorySnapshot(true);
  document.title = `SuperSite - ${studioTitleInput.value.trim() || "Modifier review"}`;
  if (studioEyebrow) {
    const label = String(item?.status || "").trim().toLowerCase() === "published" ? "PUBLIÉ" : "BROUILLON";
    studioEyebrow.textContent = label;
  }
  refreshHeroPreview();
  pendingEditLoad = false;
}

function buildPayload(statusOverride = "") {
  if (!studioMetaForm || !studioTitleInput || !studioSummaryInput || !studioEditor) return null;
  const base = loadedReviewSnapshot || {};
  const title = String(studioTitleInput.value || "").trim() || "Sans titre";
  const status = statusOverride || String(studioMetaForm.elements.status.value || "draft");
  const scoreRaw = String(studioMetaForm.elements.score.value || "").trim();
  const score = scoreRaw === "" ? null : Number(scoreRaw);
  const synopsis = String(studioSynopsisInput?.value || "").trim();
  return {
    id: editingReviewId || window.ReviewsStore.slugify(title),
    title,
    category: studioMetaForm.elements.category.value || "film",
    status,
    date: studioMetaForm.elements.date.value,
    score: Number.isFinite(score) ? score : null,
    cover: String(studioMetaForm.elements.cover.value || "").trim(),
    poster: String(studioMetaForm.elements.poster.value || "").trim(),
    accent: base.accent || "",
    summary: String(studioSummaryInput.value || "").trim(),
    author: base.author || "",
    director: String(studioMetaForm.elements.director.value || "").trim(),
    studio: base.studio || "",
    releaseYear: String(studioMetaForm.elements.releaseYear.value || "").trim(),
    genre: base.genre || "",
    bgMusic: String(studioMetaForm.elements.bgMusic.value || "").trim(),
    tmdbOverview: synopsis,
    tmdbId: String(studioMetaForm.elements.tmdbId.value || "").trim(),
    tmdbMediaType: String(studioMetaForm.elements.tmdbMediaType.value || "").trim(),
    externalLinks: Array.isArray(base.externalLinks) ? base.externalLinks : [],
    contentMode: currentStudioContentMode,
    bodyHtml: currentStudioContentMode === "rich" ? getEditorHtml() : "",
    blocks: currentStudioContentMode === "blocks" ? readStudioBlocks() : []
  };
}

async function saveReview(status) {
  if (!currentUser) {
    window.alert("Connexion requise pour sauvegarder.");
    return;
  }
  const payload = buildPayload(status);
  if (!payload) return;
  if (!payload.title.trim()) {
    window.alert("Titre requis.");
    return;
  }
  if (!payload.date) {
    window.alert("Date requise.");
    return;
  }
  try {
    await window.ReviewsStore.upsert(payload);
    window.location.href = `review.html?id=${encodeURIComponent(payload.id)}`;
  } catch (error) {
    window.alert(`Sauvegarde impossible : ${error.message}`);
  }
}

async function deleteCurrentReview() {
  if (!studioDeleteReviewBtn || !editingReviewId) return;
  if (!currentUser) {
    window.alert("Connexion requise pour supprimer.");
    return;
  }
  const label = String(studioTitleInput?.value || loadedReviewSnapshot?.title || "cette review").trim();
  const confirmed = window.confirm(`Supprimer définitivement la review "${label}" ?`);
  if (!confirmed) return;

  studioDeleteReviewBtn.disabled = true;
  try {
    await window.ReviewsStore.remove(editingReviewId);
    window.location.href = "index.html";
  } catch (error) {
    studioDeleteReviewBtn.disabled = false;
    window.alert(`Suppression impossible : ${error.message}`);
  }
}

function toggleWorkspaceForAuth(user) {
  const unlocked = Boolean(user);
  currentUser = unlocked ? window.ReviewsStore.getCurrentUser() : null;
  if (studioWorkspace) studioWorkspace.classList.toggle("hidden", !unlocked);
  if (studioGuestNote) studioGuestNote.classList.toggle("hidden", unlocked);
}

if (studioMetaForm) {
  const today = new Date().toISOString().slice(0, 10);
  studioMetaForm.elements.date.value = today;
  studioMetaForm.addEventListener("input", refreshHeroPreview);
  studioMetaForm.addEventListener("change", refreshHeroPreview);
  document.querySelectorAll('[form="studio-meta-form"]').forEach((field) => {
    field.addEventListener("input", refreshHeroPreview);
    field.addEventListener("change", refreshHeroPreview);
  });
  studioMetaForm.elements.status?.addEventListener("change", () => {
    if (!studioEyebrow) return;
    const label = String(studioMetaForm.elements.status.value || "").trim().toLowerCase() === "published" ? "PUBLIÉ" : "BROUILLON";
    studioEyebrow.textContent = label;
  });
}

if (studioTitleInput) {
  studioTitleInput.addEventListener("input", () => {
    document.title = `SuperSite - ${studioTitleInput.value.trim() || "Nouvelle review"}`;
  });
}

if (studioWrapButtons.length && studioEditor) {
  studioWrapButtons.forEach((button) => {
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      const tag = button.dataset.studioWrap;
      if (!tag) return;
      if (currentStudioContentMode === "blocks") {
        const open = tag === "spoiler" ? "[spoiler]" : `[${tag}]`;
        const close = tag === "spoiler" ? "[/spoiler]" : `[/${tag}]`;
        wrapStudioBlockSelection(open, close);
        return;
      }
      studioEditor.focus();
      wrapSelectionWithTag(tag);
      queueHistorySnapshot();
    });
  });
}

if (studioActionButtons.length && studioEditor) {
  studioActionButtons.forEach((button) => {
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      const action = button.dataset.studioAction;
      if (!action) return;
      if (currentStudioContentMode === "blocks") {
        applyStudioBlockAction(action);
        return;
      }
      handleStudioAction(action);
      if (action !== "undo" && action !== "redo") queueHistorySnapshot();
    });
  });
}

if (studioContentModeButtons.length) {
  studioContentModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.studioContentMode || "rich";
      setStudioContentMode(mode);
    });
  });
}

if (studioAddBlockBtn && studioBlocksList) {
  studioAddBlockBtn.addEventListener("click", () => {
    studioBlocksList.appendChild(createStudioBlockRow({ type: "text", content: "" }));
    updateStudioBlockIndex();
  });
}

if (studioToolColorApply) {
  studioToolColorApply.addEventListener("click", () => {
    if (currentStudioContentMode === "blocks") {
      applyStudioBlockColor(studioToolColor?.value || "#f2f2ee");
      return;
    }
    if (!studioEditor) return;
    studioEditor.focus();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("foreColor", false, studioToolColor?.value || "#f2f2ee");
    queueHistorySnapshot();
  });
}

if (studioToolSizeApply) {
  studioToolSizeApply.addEventListener("click", () => {
    if (currentStudioContentMode === "blocks") {
      applyStudioBlockSize(studioToolSize?.value || "16");
      return;
    }
    if (!studioEditor) return;
    studioEditor.focus();
    const size = Number(studioToolSize?.value || "16");
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !selection.toString().trim()) return;
    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.style.fontSize = `${size}px`;
    span.textContent = selection.toString();
    range.deleteContents();
    range.insertNode(span);
    queueHistorySnapshot();
  });
}

if (studioToolHighlightApply) {
  studioToolHighlightApply.addEventListener("click", () => {
    if (currentStudioContentMode === "blocks") {
      applyStudioBlockHighlight(studioToolHighlight?.value || "#f7b538");
      return;
    }
    if (!studioEditor) return;
    studioEditor.focus();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("hiliteColor", false, studioToolHighlight?.value || "#f7b538");
    queueHistorySnapshot();
  });
}

if (studioImageBtn && studioEditor) {
  studioImageBtn.addEventListener("mousedown", (event) => event.preventDefault());
  studioImageBtn.addEventListener("click", () => {
    const url = window.prompt("URL de l'image");
    if (!url) return;
    if (currentStudioContentMode === "blocks") {
      appendStudioBlock({ type: "image", url: url.trim(), content: "", caption: "" });
      return;
    }
    insertStudioMediaShell(`<img src="${escapeHtml(url.trim())}" alt="image" />`);
  });
}

if (studioVideoBtn && studioEditor) {
  studioVideoBtn.addEventListener("mousedown", (event) => event.preventDefault());
  studioVideoBtn.addEventListener("click", () => {
    const url = window.prompt("URL vidéo (YouTube ou fichier direct)");
    if (!url) return;
    const clean = url.trim();
    const embed = normalizeYouTubeEmbed(clean);
    if (currentStudioContentMode === "blocks") {
      const type = embed.includes("youtube.com/embed/") ? "video-embed" : "video";
      appendStudioBlock({ type, url: type === "video-embed" ? embed : clean, content: "", caption: "" });
      return;
    }
    if (embed.includes("youtube.com/embed/")) {
      insertStudioMediaShell(`<div class="video-wrap"><iframe src="${escapeHtml(embed)}" title="video" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`);
      return;
    }
    insertStudioMediaShell(`<video controls src="${escapeHtml(clean)}"></video>`);
  });
}

if (studioEditor) {
  studioEditor.addEventListener("mousedown", (event) => {
    const target = getStudioMediaWrapperFromNode(event.target instanceof Node ? event.target : null);
    if (target) {
      selectStudioMedia(target);
      return;
    }
    clearStudioSelectedMedia();
  });
  studioEditor.addEventListener("dragstart", (event) => {
    const target = event.target instanceof Node ? getStudioMediaWrapperFromNode(event.target) : null;
    if (!target) return;
    draggedStudioMediaWrapper = target;
    target.classList.add("rich-media-dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", "__studio_media_move__");
    }
  });
  studioEditor.addEventListener("input", () => {
    if (selectedStudioMediaWrapper && !studioEditor.contains(selectedStudioMediaWrapper)) {
      selectedStudioMediaWrapper = null;
    }
    normalizeStudioEditorMedia();
    pushStudioHistorySnapshot(false);
  });
  studioEditor.addEventListener("dragenter", (event) => {
    if (!(event.dataTransfer?.types || []).includes("Files")) return;
    event.preventDefault();
    studioDropTargetDepth += 1;
    studioEditor.classList.add("is-drop-target");
  });
  studioEditor.addEventListener("dragover", (event) => {
    if (!event.dataTransfer) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = draggedStudioMediaWrapper ? "move" : "copy";
    studioEditor.classList.add("is-drop-target");
  });
  studioEditor.addEventListener("dragleave", () => {
    studioDropTargetDepth = Math.max(0, studioDropTargetDepth - 1);
    if (studioDropTargetDepth === 0) studioEditor.classList.remove("is-drop-target");
  });
  studioEditor.addEventListener("drop", async (event) => {
    event.preventDefault();
    studioDropTargetDepth = 0;
    studioEditor.classList.remove("is-drop-target");
    if (draggedStudioMediaWrapper) {
      const movedShell = draggedStudioMediaWrapper;
      const moved = moveDraggedStudioMedia(event);
      clearDraggedStudioMediaState();
      if (moved) {
        normalizeStudioEditorMedia();
        selectStudioMedia(getStudioMediaWrapperFromNode(event.target instanceof Node ? event.target : null) || movedShell);
        queueHistorySnapshot();
      }
      return;
    }
    placeStudioCaretAtPoint(event.clientX, event.clientY);
    const files = [...(event.dataTransfer?.files || [])];
    const urlListText = String(event.dataTransfer?.getData("text/uri-list") || "").trim();
    const plainText = String(event.dataTransfer?.getData("text/plain") || "").trim();
    const htmlText = String(event.dataTransfer?.getData("text/html") || "");
    const uriUrls = urlListText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    const htmlImageUrls = getImageUrlsFromHtml(htmlText);
    const plainImageUrls = isLikelyImageUrl(plainText) ? [plainText] : [];
    const imageUrls = [...new Set([...uriUrls, ...htmlImageUrls, ...plainImageUrls])];
    const insertedImages = await handleStudioDroppedOrPastedImages(files, imageUrls);
    if (!insertedImages && plainText) insertStudioPlainText(plainText);
  });
  studioEditor.addEventListener("dragend", () => {
    studioDropTargetDepth = 0;
    studioEditor.classList.remove("is-drop-target");
    clearDraggedStudioMediaState();
  });
  studioEditor.addEventListener("paste", async (event) => {
    const files = [...(event.clipboardData?.files || [])];
    const htmlText = String(event.clipboardData?.getData("text/html") || "");
    const plainText = String(event.clipboardData?.getData("text/plain") || "");
    const htmlImageUrls = getImageUrlsFromHtml(htmlText);
    const plainImageUrls = isLikelyImageUrl(plainText) ? [plainText.trim()] : [];
    const shouldHandleImages = files.some((file) => String(file?.type || "").toLowerCase().startsWith("image/")) || htmlImageUrls.length || plainImageUrls.length;
    if (shouldHandleImages) {
      event.preventDefault();
      await handleStudioDroppedOrPastedImages(files, [...htmlImageUrls, ...plainImageUrls]);
      return;
    }
    if (htmlText && plainText) {
      event.preventDefault();
      insertStudioPlainText(plainText);
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (!studioEditor) return;
  const target = event.target;
  const isInEditor = target instanceof Node && studioEditor.contains(target);
  if (!isInEditor) return;
  if (event.key === "Escape") {
    clearStudioSelectedMedia();
    return;
  }
  if (event.key === "Enter") {
    const selected = getStudioSelectedMediaWrapper();
    if (selected && studioEditor.contains(selected)) {
      event.preventDefault();
      const paragraph = ensureStudioParagraphAfterMedia(selected) || ensureStudioEditorHasEditableParagraph();
      if (paragraph) placeStudioCaretInsideNode(paragraph, false);
      clearStudioSelectedMedia();
      queueHistorySnapshot();
      return;
    }
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    const selected = getStudioSelectedMediaWrapper();
    if (selected && studioEditor.contains(selected)) {
      event.preventDefault();
      clearStudioSelectedMedia();
      if (event.key === "ArrowLeft") {
        const previous = selected.previousSibling;
        if (previous instanceof HTMLElement && previous.tagName.toLowerCase() === "p") {
          placeStudioCaretInsideNode(previous, true);
        } else if (previous instanceof Node) {
          placeCaretAfterNode(previous);
        } else {
          const fallback = ensureStudioEditorHasEditableParagraph();
          if (fallback) placeStudioCaretInsideNode(fallback, false);
        }
      } else {
        const paragraph = ensureStudioParagraphAfterMedia(selected) || ensureStudioEditorHasEditableParagraph();
        if (paragraph) placeStudioCaretInsideNode(paragraph, false);
      }
      return;
    }
  }
  if (event.key === "Backspace" || event.key === "Delete") {
    const selected = getStudioSelectedMediaWrapper();
    if (selected && studioEditor.contains(selected)) {
      event.preventDefault();
      const next = selected.nextSibling || selected.previousSibling || studioEditor;
      selected.remove();
      clearStudioSelectedMedia();
      const fallback = ensureStudioEditorHasEditableParagraph();
      if (next instanceof HTMLElement && next.tagName.toLowerCase() === "p") {
        placeStudioCaretInsideNode(next, false);
      } else if (next instanceof Node && next !== studioEditor) {
        placeCaretAfterNode(next);
      } else if (fallback) {
        placeStudioCaretInsideNode(fallback, false);
      }
      updateStudioEditorEmptyState();
      queueHistorySnapshot();
      return;
    }
  }
  if (!(event.ctrlKey || event.metaKey)) return;

  const key = String(event.key || "").toLowerCase();
  if (key === "z" && !event.shiftKey) {
    event.preventDefault();
    studioUndo();
    return;
  }
  if (key === "y" || (key === "z" && event.shiftKey)) {
    event.preventDefault();
    studioRedo();
  }
});

window.addEventListener("resize", () => {
  if (selectedStudioMediaWrapper && studioEditor?.contains(selectedStudioMediaWrapper)) {
    positionStudioResizeHandle(selectedStudioMediaWrapper);
  }
});

if (studioPosterUrlBtn && studioMetaForm) {
  studioPosterUrlBtn.addEventListener("click", () => {
    const current = String(studioMetaForm.elements.poster.value || "").trim();
    const next = window.prompt("URL de l'affiche", current);
    if (next === null) return;
    studioMetaForm.elements.poster.value = String(next || "").trim();
    refreshHeroPreview();
  });
}

if (studioCoverUrlBtn && studioMetaForm) {
  studioCoverUrlBtn.addEventListener("click", () => {
    const current = String(studioMetaForm.elements.cover.value || "").trim();
    const next = window.prompt("URL de la couverture", current);
    if (next === null) return;
    studioMetaForm.elements.cover.value = String(next || "").trim();
    refreshHeroPreview();
  });
}

if (studioPosterPickerBtn && studioMetaForm) {
  studioPosterPickerBtn.addEventListener("click", async () => {
    const linked = await ensureStudioLinkedMediaForAssetPicker();
    if (!linked || !studioSelectedTmdb?.id) {
      window.alert("Choisis d'abord un m�dia via le titre.");
      return;
    }
    try {
      const useIgdb = studioSelectedTmdb.provider === "igdb" || String(studioSelectedTmdb.mediaType || "").startsWith("igdb");
      const images = useIgdb
        ? await getIgdbImageChoices(studioSelectedTmdb.id)
        : await getTmdbImageChoices(studioSelectedTmdb.id, studioSelectedTmdb.mediaType);
      if (!images.posters.length) {
        window.alert(`Aucune affiche ${useIgdb ? "IGDB" : "TMDB"} disponible pour ce m�dia.`);
        return;
      }
      const selected = await openTmdbImagePicker(images.posters, "une affiche", "poster");
      if (!selected) return;
      studioMetaForm.elements.poster.value = selected;
      refreshHeroPreview();
    } catch (error) {
      window.alert(`Impossible de charger les affiches : ${error.message}`);
    }
  });
}

if (studioCoverPickerBtn && studioMetaForm) {
  studioCoverPickerBtn.addEventListener("click", async () => {
    const linked = await ensureStudioLinkedMediaForAssetPicker();
    if (!linked || !studioSelectedTmdb?.id) {
      window.alert("Choisis d'abord un m�dia via le titre.");
      return;
    }
    try {
      const useIgdb = studioSelectedTmdb.provider === "igdb" || String(studioSelectedTmdb.mediaType || "").startsWith("igdb");
      const images = useIgdb
        ? await getIgdbImageChoices(studioSelectedTmdb.id)
        : await getTmdbImageChoices(studioSelectedTmdb.id, studioSelectedTmdb.mediaType);
      if (!images.backdrops.length) {
        window.alert(`Aucune image de couverture ${useIgdb ? "IGDB" : "TMDB"} disponible pour ce m�dia.`);
        return;
      }
      const selected = await openTmdbImagePicker(images.backdrops, "une couverture", "backdrop");
      if (!selected) return;
      studioMetaForm.elements.cover.value = selected;
      refreshHeroPreview();
    } catch (error) {
      window.alert(`Impossible de charger les couvertures : ${error.message}`);
    }
  });
}

if (studioSaveDraftBtn) {
  studioSaveDraftBtn.addEventListener("click", () => saveReview("draft"));
}

if (studioSavePublishBtn) {
  studioSavePublishBtn.addEventListener("click", () => saveReview("published"));
}

if (studioDeleteReviewBtn) {
  studioDeleteReviewBtn.addEventListener("click", deleteCurrentReview);
}

if (window.ReviewsStore?.onAuthChanged) {
  window.ReviewsStore.onAuthChanged((user) => {
    toggleWorkspaceForAuth(user);
    if (user) {
      tryLoadEditReview();
    }
  });
}

toggleWorkspaceForAuth(window.ReviewsStore?.getCurrentUser?.());
refreshDeleteButtonState();
setStudioBlocks([]);
setStudioContentMode("blocks");
tryLoadEditReview();
setupStudioTmdbAutocomplete();
refreshHeroPreview();
normalizeStudioEditorMedia();
pushStudioHistorySnapshot(true);



