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
const STUDIO_HISTORY_LIMIT = 120;
let studioHistory = [];
let studioHistoryIndex = -1;

function getEditorHtml() {
  return String(studioEditor?.innerHTML || "");
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
  shell.style.display = "inline-block";
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
  const editorRect = studioEditor.getBoundingClientRect();
  const rect = wrapper.getBoundingClientRect();
  studioMediaResizeState = {
    wrapper,
    startX: event.clientX,
    startWidth: rect.width,
    minWidth: 120,
    maxWidth: Math.max(140, editorRect.width - 24)
  };
  window.addEventListener("pointermove", onStudioMediaResizeMove);
  window.addEventListener("pointerup", stopStudioMediaResize);
}

function onStudioMediaResizeMove(event) {
  if (!studioMediaResizeState) return;
  const { wrapper, startX, startWidth, minWidth, maxWidth } = studioMediaResizeState;
  const deltaX = event.clientX - startX;
  const nextWidth = Math.max(minWidth, Math.min(maxWidth, Math.round(startWidth + deltaX)));
  wrapper.classList.remove("rich-media-size-small", "rich-media-size-medium", "rich-media-size-large");
  wrapper.style.display = "inline-block";
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
  target.style.display = "inline-block";
  target.classList.remove("rich-media-float-left", "rich-media-float-right", "rich-media-center");
  const cls = align === "left" ? "rich-media-float-left" : align === "right" ? "rich-media-float-right" : "rich-media-center";
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
  wrapper.style.display = "inline-block";
  wrapper.innerHTML = innerHtml;
  const selection = window.getSelection();
  if (selection && selection.rangeCount) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(wrapper);
  } else {
    studioEditor.appendChild(wrapper);
  }
  placeCaretAfterNode(wrapper);
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
        studioSelectedTmdb = { id: item.id, mediaType: item.mediaType, provider: item.provider || "tmdb" };
        studioMetaForm.elements.tmdbId.value = String(item.id || "");
        studioMetaForm.elements.tmdbMediaType.value = String(item.mediaType || "");
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
          studioSelectedTmdb = { id: item.id, mediaType: item.mediaType, provider: item.provider || "tmdb" };
          studioMetaForm.elements.tmdbId.value = String(item.id || "");
          studioMetaForm.elements.tmdbMediaType.value = String(item.mediaType || "");
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
  studioSelectedTmdb = item?.tmdbId
    ? {
      id: item.tmdbId,
      mediaType: String(item.tmdbMediaType || (isGameCategory(item?.category) ? "igdb_game" : tmdbMediaTypeFromCategory(item?.category || "film"))),
      provider: String(item.tmdbMediaType || "").trim().toLowerCase().startsWith("igdb") ? "igdb" : (isGameCategory(item?.category) ? "igdb" : "tmdb")
    }
    : null;
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
          studioSelectedTmdb = { id: best.id, mediaType: best.mediaType, provider: best.provider || (isGame ? "igdb" : "tmdb") };
          studioMetaForm.elements.tmdbId.value = String(best.id);
          studioMetaForm.elements.tmdbMediaType.value = String(best.mediaType || "");
        }
      } catch {
        // Keep studio usable even if TMDB fallback lookup fails.
      }
    }
  }
  studioEditor.innerHTML = item?.contentMode === "rich"
    ? String(item?.bodyHtml || "")
    : blocksToSimpleHtml(item?.blocks || []);
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
    contentMode: "rich",
    bodyHtml: String(studioEditor.innerHTML || "").trim(),
    blocks: []
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
      handleStudioAction(action);
      if (action !== "undo" && action !== "redo") queueHistorySnapshot();
    });
  });
}

if (studioToolColorApply) {
  studioToolColorApply.addEventListener("click", () => {
    if (!studioEditor) return;
    studioEditor.focus();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("foreColor", false, studioToolColor?.value || "#f2f2ee");
    queueHistorySnapshot();
  });
}

if (studioToolSizeApply) {
  studioToolSizeApply.addEventListener("click", () => {
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
  studioEditor.addEventListener("input", () => {
    if (selectedStudioMediaWrapper && !studioEditor.contains(selectedStudioMediaWrapper)) {
      selectedStudioMediaWrapper = null;
    }
    pushStudioHistorySnapshot(false);
  });
}

document.addEventListener("keydown", (event) => {
  if (!studioEditor) return;
  const target = event.target;
  const isInEditor = target instanceof Node && studioEditor.contains(target);
  if (!isInEditor) return;
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
    if (!studioSelectedTmdb?.id) {
      window.alert("Choisis d'abord un média via le titre.");
      return;
    }
    try {
      const useIgdb = studioSelectedTmdb.provider === "igdb" || String(studioSelectedTmdb.mediaType || "").startsWith("igdb");
      const images = useIgdb
        ? await getIgdbImageChoices(studioSelectedTmdb.id)
        : await getTmdbImageChoices(studioSelectedTmdb.id, studioSelectedTmdb.mediaType);
      if (!images.posters.length) {
        window.alert(`Aucune affiche ${useIgdb ? "IGDB" : "TMDB"} disponible pour ce média.`);
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
    if (!studioSelectedTmdb?.id) {
      window.alert("Choisis d'abord un média via le titre.");
      return;
    }
    try {
      const useIgdb = studioSelectedTmdb.provider === "igdb" || String(studioSelectedTmdb.mediaType || "").startsWith("igdb");
      const images = useIgdb
        ? await getIgdbImageChoices(studioSelectedTmdb.id)
        : await getTmdbImageChoices(studioSelectedTmdb.id, studioSelectedTmdb.mediaType);
      if (!images.backdrops.length) {
        window.alert(`Aucune image de couverture ${useIgdb ? "IGDB" : "TMDB"} disponible pour ce média.`);
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
tryLoadEditReview();
setupStudioTmdbAutocomplete();
refreshHeroPreview();
pushStudioHistorySnapshot(true);
