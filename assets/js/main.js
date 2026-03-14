const menuToggle = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");
const pageParams = new URLSearchParams(window.location.search);
const requestedEditReviewId = String(pageParams.get("edit") || "").trim();
const requestedNewTopCreation = pageParams.get("newTop") === "1";

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

const activeMenuLink = document.querySelector(`.menu a[href="${window.location.pathname.split("/").pop() || "index.html"}"]`);
if (activeMenuLink) activeMenuLink.setAttribute("aria-current", "page");

const reviewsGrid = document.getElementById("reviews-grid");
const managerSection = document.getElementById("manager");
const managerGuestMessage = document.getElementById("manager-guest-message");
const managerList = document.getElementById("manager-list");
const form = document.getElementById("review-form");
const formTitle = document.getElementById("form-title");
const addBtn = document.getElementById("new-review");
const cancelBtn = document.getElementById("cancel-form");
const blocksList = document.getElementById("blocks-list");
const addBlockBtn = document.getElementById("add-block-btn");
const externalLinksList = document.getElementById("external-links-list");
const addExternalLinkBtn = document.getElementById("add-external-link-btn");
const previewBox = document.getElementById("review-preview");
const filterButtonsHost = document.querySelector(".filters");
const reviewsSortSelect = document.getElementById("reviews-sort");
const reviewsUserFilterSelect = document.getElementById("reviews-user-filter");
const quickCreateReviewBtn = document.getElementById("quick-create-review");
const reviewsSearchInput = document.getElementById("reviews-search");
const reviewsResetBtn = document.getElementById("reviews-reset");
const reviewsResultsMeta = document.getElementById("reviews-results-meta");
const managerReviewsSortSelect = document.getElementById("manager-reviews-sort");
const managerReviewsSearchInput = document.getElementById("manager-reviews-search");

const topList = document.getElementById("tops-manager-list");
const topForm = document.getElementById("top-form");
const topFormTitle = document.getElementById("top-form-title");
const newTopBtn = document.getElementById("new-top");
const cancelTopBtn = document.getElementById("cancel-top-form");
const topItemQueryInput = document.getElementById("top-item-query");
const topItemAddBtn = document.getElementById("top-item-add");
const topItemsList = document.getElementById("top-items-list");
const managerTopsSortSelect = document.getElementById("manager-tops-sort");
const managerTopsSearchInput = document.getElementById("manager-tops-search");

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
const metaDirectorRow = document.getElementById("meta-director-row");

const DEFAULT_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'><defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#1a2a36'/><stop offset='1' stop-color='#243b4a'/></linearGradient></defs><rect width='1200' height='630' fill='url(#g)'/><text x='50%' y='50%' text-anchor='middle' fill='#b8c2cc' font-size='54' font-family='Arial, sans-serif'>Sans cover</text></svg>"
  );
const DEFAULT_POSTER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 900'><defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#1a2a36'/><stop offset='1' stop-color='#243b4a'/></linearGradient></defs><rect width='600' height='900' fill='url(#g)'/><text x='50%' y='50%' text-anchor='middle' fill='#b8c2cc' font-size='30' font-family='Arial, sans-serif'>Sans affiche</text></svg>"
  );
const TMDB_API_KEY = "db0d1dbaf15190e0a5574538dc4e579f";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const TMDB_AUTOCOMPLETE_MIN_CHARS = 2;

let selectedFilter = "all";
let selectedSort = "date-desc";
let selectedUserFilter = "all";
let selectedReviewsSearch = "";
let selectedManagerReviewSort = "date-desc";
let selectedManagerTopSort = "date-desc";
let selectedManagerReviewSearch = "";
let selectedManagerTopSearch = "";
let editingId = null;
let editingTopId = null;
let reviewFormDirty = false;
let topFormDirty = false;
let editingTopStatus = "published";
let suppressListingUrlSync = false;
let cachedReviews = [];
let activeTextArea = null;
let editingAccent = "";
let currentContentMode = "blocks";
let currentUser = null;
const ADMIN_USERNAME = "admin";
let selectedRichMediaWrapper = null;
let richMediaResizeState = null;
let pendingEditReviewId = requestedEditReviewId || "";
let pendingCreateTop = requestedNewTopCreation;
let pendingSearchDebounce = null;
let pendingManagerSearchDebounce = null;
let reviewTmdbBindDone = false;
let topTmdbBindDone = false;
let reviewTmdbSelectionToken = 0;
const blockEditorHistory = new WeakMap();
const MAX_EXTERNAL_LINKS = 3;
const REVIEWS_SORT_MODES = new Set(["date-desc", "date-asc", "score-desc", "score-asc"]);
const isReviewsListingPage = Boolean(reviewsGrid);

function applyReviewsListingStateFromUrl() {
  if (!isReviewsListingPage) return;
  const params = new URLSearchParams(window.location.search);
  const nextFilter = String(params.get("cat") || "all").trim() || "all";
  const nextSort = String(params.get("sort") || "date-desc").trim();
  const nextUser = String(params.get("user") || "all").trim() || "all";
  const nextSearch = String(params.get("q") || "");
  selectedFilter = nextFilter;
  selectedSort = REVIEWS_SORT_MODES.has(nextSort) ? nextSort : "date-desc";
  selectedUserFilter = nextUser;
  selectedReviewsSearch = nextSearch;
  if (reviewsSortSelect) reviewsSortSelect.value = selectedSort;
  if (reviewsUserFilterSelect) reviewsUserFilterSelect.value = selectedUserFilter;
  if (reviewsSearchInput) reviewsSearchInput.value = selectedReviewsSearch;
}

function syncReviewsListingStateToUrl() {
  if (!isReviewsListingPage || suppressListingUrlSync) return;
  const params = new URLSearchParams(window.location.search);
  if (selectedFilter && selectedFilter !== "all") params.set("cat", selectedFilter);
  else params.delete("cat");
  if (selectedSort && selectedSort !== "date-desc") params.set("sort", selectedSort);
  else params.delete("sort");
  if (selectedUserFilter && selectedUserFilter !== "all") params.set("user", selectedUserFilter);
  else params.delete("user");
  const search = String(selectedReviewsSearch || "").trim();
  if (search) params.set("q", search);
  else params.delete("q");
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash || ""}`;
  window.history.replaceState(null, "", nextUrl);
}

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
    cover: tmdbImageUrl(entry.backdrop_path, "w1280")
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
    director: directorNames.join(", ") || creators.join(", ")
  };
}

function createTmdbAutocomplete(input, options = {}) {
  if (!input || !TMDB_API_KEY) return null;
  const host = input.parentElement;
  if (!host) return null;
  host.classList.add("has-tmdb-autocomplete");
  const list = document.createElement("ul");
  list.className = "tmdb-suggestion-box";
  list.hidden = true;
  host.appendChild(list);
  let timer = null;
  let requestId = 0;
  let hasResults = false;

  const hide = () => {
    hasResults = false;
    list.innerHTML = "";
    list.hidden = true;
  };

  const render = (results = []) => {
    list.innerHTML = "";
    hasResults = results.length > 0;
    list.hidden = !hasResults;
    results.forEach((item) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tmdb-suggestion-btn";
      const yearLabel = item.year ? ` (${item.year})` : "";
      btn.textContent = `${item.title || "Sans titre"}${yearLabel}`;
      btn.addEventListener("mousedown", (event) => {
        event.preventDefault();
        options.onSelect?.(item);
        hide();
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
  };

  input.addEventListener("input", () => {
    const query = String(input.value || "").trim();
    const mediaType = options.getMediaType?.();
    if (query.length < TMDB_AUTOCOMPLETE_MIN_CHARS || !mediaType) {
      hide();
      return;
    }
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      const currentRequest = ++requestId;
      try {
        const results = await searchTmdbTitles(query, mediaType);
        if (currentRequest !== requestId) return;
        render(results);
      } catch {
        if (currentRequest !== requestId) return;
        hide();
      }
    }, 220);
  });

  input.addEventListener("focus", () => {
    if (hasResults) list.hidden = false;
  });

  input.addEventListener("blur", () => {
    window.setTimeout(hide, 130);
  });

  return { hide };
}

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

function normalizePublicationStatus(value) {
  return String(value || "").trim().toLowerCase() === "draft" ? "draft" : "published";
}

function categoryLabelWithCount(category, count) {
  const labels = {
    film: count > 1 ? "Films" : "Film",
    serie: count > 1 ? "Séries" : "Série",
    livre: count > 1 ? "Livres" : "Livre",
    musique: count > 1 ? "Musiques" : "Musique",
    jeu: count > 1 ? "Jeux vidéo" : "Jeu vidéo"
  };
  const base = labels[category] || window.ReviewsStore?.categories?.[category] || category || "Autre";
  return `${base} (${count})`;
}

function publicationStatusLabel(value) {
  return normalizePublicationStatus(value) === "draft" ? "Brouillon" : "Publié";
}

function confirmReviewDeletion(title) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-dialog" role="dialog" aria-modal="true" aria-label="Confirmer la suppression">
        <p class="confirm-title">Supprimer cette review ?</p>
        <p class="confirm-text">"${escapeHtml(title || "Sans titre")}"</p>
        <div class="confirm-actions">
          <button type="button" class="action-btn secondary" data-confirm-action="cancel">Annuler</button>
          <button type="button" class="action-btn danger" data-confirm-action="delete">Supprimer</button>
        </div>
      </div>
    `;

    const cleanup = () => {
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
    };

    const close = (confirmed) => {
      cleanup();
      resolve(Boolean(confirmed));
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }
    };

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close(false);
    });

    overlay.querySelector('[data-confirm-action="cancel"]')?.addEventListener("click", () => close(false));
    overlay.querySelector('[data-confirm-action="delete"]')?.addEventListener("click", () => close(true));

    document.addEventListener("keydown", onKeyDown);
    document.body.appendChild(overlay);
    overlay.querySelector('[data-confirm-action="cancel"]')?.focus();
  });
}

function readExternalLinksFromForm() {
  if (!externalLinksList) return [];
  return [...externalLinksList.querySelectorAll(".external-link-row")]
    .map((entry) => ({
      label: String(entry.querySelector('[data-link-field="label"]')?.value || "").trim(),
      url: String(entry.querySelector('[data-link-field="url"]')?.value || "").trim()
    }))
    .filter((entry) => entry.label && entry.url);
}

function updateExternalLinksUiState() {
  if (!addExternalLinkBtn || !externalLinksList) return;
  const count = externalLinksList.querySelectorAll(".external-link-row").length;
  addExternalLinkBtn.disabled = count >= MAX_EXTERNAL_LINKS;
}

function refreshExternalLinksLabels() {
  if (!externalLinksList) return;
  [...externalLinksList.querySelectorAll(".external-link-row")].forEach((row, idx) => {
    const num = idx + 1;
    const nameLabel = row.querySelector('[data-link-label="name"]');
    const urlLabel = row.querySelector('[data-link-label="url"]');
    if (nameLabel) nameLabel.textContent = `Nom bouton ${num}`;
    if (urlLabel) urlLabel.textContent = `Lien bouton ${num}`;
  });
}

function createExternalLinkRow(entry = {}) {
  const row = document.createElement("div");
  row.className = "external-link-row";
  row.innerHTML = `
    <label>
      <span class="label-row"><span class="field-label-text" data-link-label="name">Nom bouton</span><span class="field-hint">optionnel</span></span>
      <input data-link-field="label" type="text" placeholder="Ex: Trailer" value="${escapeHtml(entry.label || "")}" />
    </label>
    <label>
      <span class="label-row"><span class="field-label-text" data-link-label="url">Lien bouton</span><span class="field-hint">optionnel</span></span>
      <input data-link-field="url" type="url" placeholder="https://..." value="${escapeHtml(entry.url || "")}" />
    </label>
    <button type="button" class="action-btn secondary remove-external-link-btn">Supprimer</button>
  `;
  row.querySelector(".remove-external-link-btn")?.addEventListener("click", () => {
    row.remove();
    refreshExternalLinksLabels();
    updateExternalLinksUiState();
  });
  return row;
}

function fillExternalLinksInForm(review) {
  if (!externalLinksList) return;
  externalLinksList.innerHTML = "";
  const links = Array.isArray(review?.externalLinks) ? review.externalLinks.slice(0, MAX_EXTERNAL_LINKS) : [];
  links.forEach((entry) => externalLinksList.appendChild(createExternalLinkRow(entry)));
  refreshExternalLinksLabels();
  updateExternalLinksUiState();
}

function confirmDiscardChanges(kind) {
  return window.confirm(`Des changements non enregistres existent sur ce ${kind}. Continuer sans enregistrer ?`);
}

function markReviewFormDirty() {
  if (!form || form.classList.contains("hidden")) return;
  reviewFormDirty = true;
}

function markTopFormDirty() {
  if (!topForm || topForm.classList.contains("hidden")) return;
  topFormDirty = true;
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

function openRequestedTopCreation() {
  if (!pendingCreateTop) return;
  pendingCreateTop = false;
  if (!topForm) return;
  openTopForm();
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
  if (!Number.isFinite(score)) return "\u2606\u2606\u2606\u2606\u2606";
  const full = Math.max(0, Math.min(5, Math.round(score / 2)));
  return "\u2605".repeat(full) + "\u2606".repeat(5 - full);
}

function formatScoreValue(score) {
  if (!Number.isFinite(Number(score))) return "";
  const value = Number(score);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function reviewCard(item) {
  const article = document.createElement("article");
  article.className = "review-card";
  article.dataset.type = item.category;
  const isDraft = normalizePublicationStatus(item.status) === "draft";
  article.classList.toggle("is-draft", isDraft);
  article.tabIndex = 0;
  article.setAttribute("role", "link");
  const accent = item.accent || "#f25f29";
  const target = `review.html?id=${encodeURIComponent(item.id)}`;

  const ownerMeta = item.ownerUsername ? `, par ${ownerBadge(item.ownerUsername)}` : "";
  const metaPrefix = isDraft ? "Brouillon" : "Publié";
  const draftBadge = isDraft ? '<span class="draft-pill">Brouillon</span>' : "";
  article.innerHTML = `
    <img src="${item.cover || DEFAULT_COVER}" alt="${escapeHtml(item.title || "Review")}" />
    <div class="card-body">
      <p class="meta">${metaPrefix} le ${fmtDate(item.date)}${ownerMeta}</p>
      <h3>${escapeHtml(item.title || "Sans titre")}</h3>
      <p>${escapeHtml(item.summary || "Aucun résumé.")}</p>
      <div class="card-footer">
        <span class="score" style="color:${accent}">${scoreToStars(item.score)}${Number.isFinite(item.score) ? ` (${formatScoreValue(item.score)}/10)` : ""}</span>
        ${draftBadge}
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
  const ownerMeta = item.ownerUsername ? ` &middot; ${escapeHtml(item.ownerUsername)}` : "";
  const statusMeta = `<span class="status-text status-${normalizePublicationStatus(item.status)}">${publicationStatusLabel(item.status)}</span>`;
  row.innerHTML = `
    <div>
      <div class="manager-title-row">
        <strong>${escapeHtml(item.title || "Sans titre")}</strong>
        ${statusMeta}
      </div>
      <span class="manager-meta">${window.ReviewsStore.categories[item.category] || item.category} &middot; ${fmtDate(item.date)}${ownerMeta}</span>
    </div>
    <div class="row-actions">
      <button class="action-btn secondary" data-action="edit">Éditer</button>
      <button class="action-btn secondary" data-action="duplicate">Dupliquer</button>
      <button class="action-btn danger" data-action="delete">Supprimer</button>
    </div>
  `;

  row.querySelector('[data-action="edit"]').addEventListener("click", () => openForm(item));
  row.querySelector('[data-action="duplicate"]').addEventListener("click", () => openForm(item, { duplicate: true }));
  row.querySelector('[data-action="delete"]').addEventListener("click", async () => {
    const confirmed = await confirmReviewDeletion(item.title || "Sans titre");
    if (!confirmed) return;
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
  const statusMeta = `<span class="status-text status-${normalizePublicationStatus(item.status)}">${publicationStatusLabel(item.status)}</span>`;
  row.innerHTML = `
    <div>
      <div class="manager-title-row">
        <strong>${escapeHtml(item.title || "Sans titre")}</strong>
        ${statusMeta}
      </div>
      <span>${window.ReviewsStore.categories[item.category] || item.category || "Autre"}${item.year ? ` &middot; ${item.year}` : ""}${ownerMeta}</span>
    </div>
    <div class="row-actions">
      <button class="action-btn secondary" data-action="edit-top">Éditer</button>
      <button class="action-btn secondary" data-action="duplicate-top">Dupliquer</button>
      <button class="action-btn danger" data-action="delete-top">Supprimer</button>
    </div>
  `;

  row.querySelector('[data-action="edit-top"]').addEventListener("click", () => openTopForm(item));
  row.querySelector('[data-action="duplicate-top"]').addEventListener("click", () => openTopForm(item, { duplicate: true }));
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
      <div class="block-media-pair">
        <input class="block-url" type="url" placeholder="URL image" value="${escapeHtml(block.url || "")}" />
        <input class="block-caption" type="text" placeholder="Legende image (optionnel)" value="${escapeHtml(block.caption || "")}" />
      </div>
      <textarea class="block-content" rows="5" placeholder="Texte a cote de l'image...">${escapeHtml(block.content || "")}</textarea>
    `;
  }
  if (type === "two-images") {
    return `
      <div class="block-media-pair">
        <input class="block-url" type="url" placeholder="URL image gauche" value="${escapeHtml(block.url || "")}" />
        <input class="block-caption" type="text" placeholder="Legende image gauche (optionnel)" value="${escapeHtml(block.caption || "")}" />
      </div>
      <div class="block-media-pair">
        <input class="block-url-2" type="url" placeholder="URL image droite" value="${escapeHtml(block.url2 || "")}" />
        <input class="block-caption-2" type="text" placeholder="Legende image droite (optionnel)" value="${escapeHtml(block.caption2 || "")}" />
      </div>
    `;
  }
  return `
    <div class="block-media-pair">
      <input class="block-url" type="url" placeholder="URL" value="${escapeHtml(block.url || "")}" />
      <input class="block-caption" type="text" placeholder="Legende (optionnel)" value="${escapeHtml(block.caption || "")}" />
    </div>
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
  head.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${scoreToStars(score)}${Number.isFinite(score) ? ` (${formatScoreValue(score)}/10)` : ""}</span>`;
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
  const directorLabel = metaDirectorRow?.querySelector(".field-label-text");
  if (metaDirectorRow) metaDirectorRow.classList.remove("hidden");
  if (directorLabel) directorLabel.textContent = "Réalisation";
}

function setupReviewTmdbAutocomplete() {
  if (!form || reviewTmdbBindDone) return;
  const titleInput = form.elements.title;
  if (!titleInput) return;
  createTmdbAutocomplete(titleInput, {
    getMediaType: () => {
      const category = form.elements.category?.value || "";
      if (!["film", "serie"].includes(String(category).trim().toLowerCase())) return null;
      return tmdbMediaTypeFromCategory(category);
    },
    onSelect: async (choice) => {
      reviewTmdbSelectionToken += 1;
      const token = reviewTmdbSelectionToken;
      form.elements.title.value = choice.title || form.elements.title.value;
      form.elements.poster.value = choice.poster || form.elements.poster.value;
      form.elements.cover.value = choice.cover || form.elements.cover.value;
      form.elements.releaseYear.value = choice.year || form.elements.releaseYear.value;
      try {
        const details = await getTmdbDetails(choice.id, choice.mediaType);
        if (token !== reviewTmdbSelectionToken) return;
        if (details.title) form.elements.title.value = details.title;
        if (details.poster) form.elements.poster.value = details.poster;
        if (details.cover) form.elements.cover.value = details.cover;
        if (details.year) form.elements.releaseYear.value = details.year;
        if (details.director) form.elements.director.value = details.director;
      } catch {
        // Keep base search values if TMDB details fail.
      }
      markReviewFormDirty();
      renderPreview();
    }
  });
  reviewTmdbBindDone = true;
}

function setupTopTmdbAutocomplete() {
  if (!topForm || !topItemQueryInput || topTmdbBindDone) return;
  createTmdbAutocomplete(topItemQueryInput, {
    getMediaType: () => {
      const category = topForm.elements.category?.value || "";
      if (!["film", "serie"].includes(String(category).trim().toLowerCase())) return null;
      return tmdbMediaTypeFromCategory(category);
    },
    onSelect: async (choice) => {
      const baseItem = {
        title: choice.title || "",
        poster: choice.poster || "",
        cover: choice.cover || "",
        releaseYear: choice.year || "",
        tmdbId: String(choice.id || ""),
        tmdbMediaType: choice.mediaType || ""
      };
      try {
        const details = await getTmdbDetails(choice.id, choice.mediaType);
        if (details.title) baseItem.title = details.title;
        if (details.poster) baseItem.poster = details.poster;
        if (details.cover) baseItem.cover = details.cover;
        if (details.year) baseItem.releaseYear = details.year;
        if (details.director) baseItem.director = details.director;
      } catch {
        // Keep TMDB search values if details fetch fails.
      }
      addTopItemCard(baseItem);
      topItemQueryInput.value = "";
    }
  });
  topTmdbBindDone = true;
}

function createBlockRow(block = { type: "text", content: "", url: "", caption: "" }) {
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
          <option value="video">Vidéo</option>
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

function updateTopItemIndex() {
  if (!topItemsList) return;
  [...topItemsList.querySelectorAll(".top-form-item")].forEach((row, idx) => {
    const index = row.querySelector(".top-poster-rank");
    if (index) index.textContent = String(idx + 1);
  });
}

function normalizeTopFormItem(item = {}) {
  const noteValue = Number(item?.note);
  return {
    title: String(item?.title || "").trim(),
    comment: String(item?.comment || "").trim(),
    reviewId: String(item?.reviewId || "").trim(),
    poster: String(item?.poster || "").trim(),
    cover: String(item?.cover || "").trim(),
    releaseYear: String(item?.releaseYear || "").trim(),
    director: String(item?.director || "").trim(),
    tmdbId: String(item?.tmdbId || "").trim(),
    tmdbMediaType: String(item?.tmdbMediaType || "").trim(),
    note: Number.isFinite(noteValue) ? noteValue : null
  };
}

function topFormItemMeta(item) {
  const parts = [];
  if (item.releaseYear) parts.push(item.releaseYear);
  if (item.director) parts.push(item.director);
  return parts.join(" - ");
}

function addTopItemCard(item, options = {}) {
  if (!topItemsList) return;
  const normalized = normalizeTopFormItem(item);
  if (!normalized.title && !normalized.reviewId) return;
  topItemsList.appendChild(createTopItemRow(normalized));
  updateTopItemIndex();
  if (options.markDirty !== false) markTopFormDirty();
}

function addTopItemFromQuery() {
  if (!topItemQueryInput) return;
  const rawTitle = String(topItemQueryInput.value || "").trim();
  if (!rawTitle) return;
  const normalizedCategory = String(topForm?.elements?.category?.value || "").trim().toLowerCase();
  const normalizedTitle = normalizeSearchValue(rawTitle);
  const linkedReview = cachedReviews.find((review) => {
    if (normalizeSearchValue(review?.title) !== normalizedTitle) return false;
    if (normalizedCategory === "autre") return true;
    return String(review?.category || "").trim().toLowerCase() === normalizedCategory;
  });

  if (linkedReview) {
    addTopItemCard({
      reviewId: linkedReview.id,
      title: linkedReview.title || rawTitle,
      poster: linkedReview.poster || linkedReview.cover || "",
      cover: linkedReview.cover || "",
      releaseYear: linkedReview.releaseYear || extractYear(linkedReview.date),
      director: linkedReview.director || "",
      comment: "",
      note: Number.isFinite(Number(linkedReview.score)) ? Number(linkedReview.score) : null
    });
  } else {
    addTopItemCard({ title: rawTitle, comment: "" });
  }

  topItemQueryInput.value = "";
  topItemQueryInput.focus();
}

function createTopItemRow(item = { title: "", comment: "", reviewId: "", poster: "", cover: "", releaseYear: "", director: "", tmdbId: "", tmdbMediaType: "", note: null }) {
  const normalized = normalizeTopFormItem(item);
  const meta = topFormItemMeta(normalized);
  const scoreText = Number.isFinite(Number(normalized.note))
    ? `${scoreToStars(Number(normalized.note))} (${formatScoreValue(Number(normalized.note))}/10)`
    : "";
  const row = document.createElement("div");
  row.className = "top-form-item top-item top-item-poster";
  row.innerHTML = `
    <div class="top-poster-card top-poster-card-static">
      <span class="top-poster-rank">1</span>
      <img class="top-poster-image" src="${escapeHtml(normalized.poster || DEFAULT_POSTER)}" alt="${escapeHtml(normalized.title || "Item")}" />
      <div class="top-poster-content">
        <h3>${escapeHtml(normalized.title || "Sans titre")}</h3>
        ${meta ? `<p class="top-poster-meta">${escapeHtml(meta)}</p>` : ""}
        ${normalized.comment ? `<p class="top-poster-comment">${escapeHtml(normalized.comment)}</p>` : ""}
        ${scoreText ? `<p class="score">${escapeHtml(scoreText)}</p>` : ""}
      </div>
      <div class="top-form-item-actions row-actions">
        <button type="button" class="action-btn secondary top-up" aria-label="Monter l'item">&uarr;</button>
        <button type="button" class="action-btn secondary top-down" aria-label="Descendre l'item">&darr;</button>
        <button type="button" class="action-btn danger top-delete">Supprimer</button>
      </div>
    </div>
    <input class="top-review-id" type="hidden" value="${escapeHtml(normalized.reviewId)}" />
    <input class="top-title" type="hidden" value="${escapeHtml(normalized.title)}" />
    <input class="top-comment" type="hidden" value="${escapeHtml(normalized.comment)}" />
    <input class="top-poster" type="hidden" value="${escapeHtml(normalized.poster)}" />
    <input class="top-cover" type="hidden" value="${escapeHtml(normalized.cover)}" />
    <input class="top-release-year" type="hidden" value="${escapeHtml(normalized.releaseYear)}" />
    <input class="top-director" type="hidden" value="${escapeHtml(normalized.director)}" />
    <input class="top-tmdb-id" type="hidden" value="${escapeHtml(normalized.tmdbId)}" />
    <input class="top-tmdb-media-type" type="hidden" value="${escapeHtml(normalized.tmdbMediaType)}" />
    <input class="top-note" type="hidden" value="${Number.isFinite(Number(normalized.note)) ? String(Number(normalized.note)) : ""}" />
  `;
  row.querySelector(".top-delete").addEventListener("click", () => {
    row.remove();
    updateTopItemIndex();
    markTopFormDirty();
  });
  row.querySelector(".top-up").addEventListener("click", () => {
    const prev = row.previousElementSibling;
    if (prev && topItemsList) {
      topItemsList.insertBefore(row, prev);
      updateTopItemIndex();
      markTopFormDirty();
    }
  });
  row.querySelector(".top-down").addEventListener("click", () => {
    const next = row.nextElementSibling;
    if (next && topItemsList) {
      topItemsList.insertBefore(next, row);
      updateTopItemIndex();
      markTopFormDirty();
    }
  });
  return row;
}

function setTopItems(items) {
  if (!topItemsList) return;
  topItemsList.innerHTML = "";
  if (Array.isArray(items) && items.length) items.forEach((item) => addTopItemCard(item, { markDirty: false }));
  updateTopItemIndex();
}

function readTopItems() {
  if (!topItemsList) return [];
  return [...topItemsList.querySelectorAll(".top-form-item")]
    .map((row) => ({
      reviewId: row.querySelector(".top-review-id")?.value || "",
      title: row.querySelector(".top-title")?.value || "",
      comment: row.querySelector(".top-comment")?.value.trim() || "",
      poster: row.querySelector(".top-poster")?.value.trim() || "",
      cover: row.querySelector(".top-cover")?.value.trim() || "",
      releaseYear: row.querySelector(".top-release-year")?.value.trim() || "",
      director: row.querySelector(".top-director")?.value.trim() || "",
      tmdbId: row.querySelector(".top-tmdb-id")?.value.trim() || "",
      tmdbMediaType: row.querySelector(".top-tmdb-media-type")?.value.trim() || "",
      note: row.querySelector(".top-note")?.value === "" ? null : Number(row.querySelector(".top-note")?.value)
    }))
    .filter((item) => item.title || item.reviewId);
}

function getReviewPublicationTimestamp(item) {
  const published = Number(item?.publishedAt);
  if (Number.isFinite(published) && published > 0) return published;
  const parsed = Date.parse(String(item?.date || ""));
  if (Number.isFinite(parsed)) return parsed;
  const updated = Number(item?.updatedAt);
  return Number.isFinite(updated) && updated > 0 ? updated : 0;
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

async function resetListingFilters() {
  selectedFilter = "all";
  selectedSort = "date-desc";
  selectedUserFilter = "all";
  selectedReviewsSearch = "";
  if (reviewsSortSelect) reviewsSortSelect.value = selectedSort;
  if (reviewsUserFilterSelect) reviewsUserFilterSelect.value = selectedUserFilter;
  if (reviewsSearchInput) reviewsSearchInput.value = "";
  await renderAll();
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

function managerReviewMatchesSearch(item, rawQuery) {
  const query = normalizeSearchValue(rawQuery);
  if (!query) return true;
  const haystack = [
    item?.title,
    item?.summary,
    item?.category,
    item?.date,
    item?.ownerUsername,
    item?.author,
    item?.director,
    item?.studio,
    publicationStatusLabel(item?.status)
  ]
    .map((value) => normalizeSearchValue(value))
    .join(" ");
  return haystack.includes(query);
}

function managerTopMatchesSearch(item, rawQuery) {
  const query = normalizeSearchValue(rawQuery);
  if (!query) return true;
  const haystack = [
    item?.title,
    item?.subtitle,
    item?.category,
    item?.year,
    item?.ownerUsername,
    publicationStatusLabel(item?.status)
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

function createListingState(message) {
  const node = document.createElement("div");
  node.className = "listing-state";
  node.textContent = message;
  return node;
}

function createSkeletonCard() {
  const article = document.createElement("article");
  article.className = "review-card skeleton";
  article.setAttribute("aria-hidden", "true");
  article.innerHTML = `
    <img alt="" src="${DEFAULT_COVER}" />
    <div class="card-body">
      <div class="skeleton-line meta"></div>
      <div class="skeleton-line title"></div>
      <div class="skeleton-line text"></div>
      <div class="skeleton-line text short"></div>
    </div>
  `;
  return article;
}

function renderListingLoadingState() {
  if (!reviewsGrid) return;
  reviewsGrid.innerHTML = "";
  for (let i = 0; i < 6; i += 1) {
    reviewsGrid.appendChild(createSkeletonCard());
  }
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
  const countByCategory = reviews.reduce((acc, item) => {
    const key = String(item?.category || "");
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  if (selectedFilter !== "all" && !categories.includes(selectedFilter)) {
    selectedFilter = "all";
  }
  filterButtonsHost.innerHTML = `<button class="filter-btn${selectedFilter === "all" ? " active" : ""}" data-filter="all">Tout (${reviews.length})</button>`;
  categories.forEach((cat) => {
    const count = Number(countByCategory[cat] || 0);
    const name = categoryLabelWithCount(cat, count);
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
  if (reviewsGrid) renderListingLoadingState();
  if (reviewsResultsMeta) reviewsResultsMeta.textContent = "Chargement des contenus...";
  try {
    reviews = await window.ReviewsStore.getAll(managerList ? {} : (currentUser ? {} : { status: "published" }));
  } catch (error) {
    if (reviewsGrid || managerList) window.alert(`Impossible de charger les reviews : ${error.message}`);
    if (reviewsGrid) {
      reviewsGrid.innerHTML = "";
      reviewsGrid.appendChild(createListingState("Impossible de charger les reviews pour le moment."));
    }
    if (reviewsResultsMeta) reviewsResultsMeta.textContent = "Erreur de chargement.";
    return;
  }

  const sortedReviews = sortReviews(reviews);
  const managerVisibleReviews = managerList
    ? (isAdminUser(currentUser)
      ? sortReviews(sortedReviews, selectedManagerReviewSort)
      : sortReviews(sortedReviews.filter((item) => !item.ownerId || item.ownerId === currentUser?.uid), selectedManagerReviewSort))
    : sortedReviews;
  cachedReviews = managerVisibleReviews;
  const listingVisibleReviews = managerList
    ? sortedReviews
    : sortedReviews.filter((item) => {
      const status = normalizePublicationStatus(item.status);
      if (status === "published") return true;
      return status === "draft" && Boolean(currentUser?.uid) && item.ownerId === currentUser.uid;
    });
  const facetedReviews = listingVisibleReviews
    .filter((item) => selectedUserFilter === "all" || normalizeUsernameValue(item.ownerUsername) === selectedUserFilter)
    .filter((item) => reviewMatchesSearch(item, selectedReviewsSearch));
  buildFilterButtons(facetedReviews);
  buildUserFilterOptions(listingVisibleReviews);

  if (reviewsGrid) {
    reviewsGrid.innerHTML = "";
    const visibleReviews = facetedReviews
      .filter((item) => selectedFilter === "all" || item.category === selectedFilter);
    visibleReviews.forEach((item) => reviewsGrid.appendChild(reviewCard(item)));
    if (!visibleReviews.length) {
      reviewsGrid.appendChild(createListingState("Bah y'a plus rien là, t'as abusé sur les filtres"));
    }
    if (reviewsResultsMeta) {
      const count = visibleReviews.length;
      const reviewLabel = count > 1 ? "reviews" : "review";
      const dispoLabel = count > 1 ? "dispos" : "dispo";
      reviewsResultsMeta.textContent = `${count} super ${reviewLabel} ${dispoLabel}.`;
    }
  }
  if (managerList) {
    managerList.innerHTML = "";
    const managerFilteredReviews = managerVisibleReviews.filter((item) => managerReviewMatchesSearch(item, selectedManagerReviewSearch));
    managerFilteredReviews.forEach((item) => managerList.appendChild(managerRow(item)));
    if (!managerFilteredReviews.length) {
      managerList.appendChild(createListingState("Aucune review ne correspond a cette recherche."));
    }
  }
  syncReviewsListingStateToUrl();
}

async function renderTopsManager() {
  if (!topList) return;
  try {
    const tops = await window.ReviewsStore.getAllTops();
    const managerVisibleTops = isAdminUser(currentUser)
      ? tops
      : tops.filter((item) => !item.ownerId || item.ownerId === currentUser?.uid);
    const managerSortedTops = sortManagerTops(managerVisibleTops, selectedManagerTopSort);
    const managerFilteredTops = managerSortedTops.filter((item) => managerTopMatchesSearch(item, selectedManagerTopSearch));
    topList.innerHTML = "";
    managerFilteredTops.forEach((item) => topList.appendChild(topRow(item)));
    if (!managerFilteredTops.length) {
      topList.appendChild(createListingState("Aucun top ne correspond a cette recherche."));
    }
  } catch (error) {
    window.alert(`Impossible de charger les tops : ${error.message}`);
  }
}

function openForm(item = null, options = {}) {
  if (!form) return;
  if (!form.classList.contains("hidden") && reviewFormDirty && !confirmDiscardChanges("brouillon")) return;
  const duplicate = Boolean(options?.duplicate);
  const today = new Date().toISOString().slice(0, 10);
  editingId = item && !duplicate ? item.id : null;
  form.classList.remove("hidden");
  formTitle.textContent = duplicate ? "Dupliquer la review" : (item ? "Modifier la review" : "Ajouter une review");
  form.elements.title.value = duplicate ? `${item?.title || "Sans titre"} (copie)` : (item?.title || "");
  form.elements.category.value = item?.category || "film";
  form.elements.date.value = duplicate || !item ? today : (item?.date || "");
  if (form.elements.status) form.elements.status.value = normalizePublicationStatus(duplicate ? "draft" : (item?.status || "published"));
  form.elements.score.value = Number.isFinite(item?.score) ? String(item.score) : "";
  form.elements.cover.value = item?.cover || "";
  form.elements.poster.value = item?.poster || "";
  editingAccent = item?.accent || "";
  form.elements.summary.value = item?.summary || "";
  form.elements.director.value = item?.director || "";
  form.elements.releaseYear.value = item?.releaseYear || "";
  if (form.elements.bgMusic) form.elements.bgMusic.value = item?.bgMusic || "";
  fillExternalLinksInForm(item);
  configureMetaFields(form.elements.category.value || "film");
  setRichHtml(item?.bodyHtml || "");
  const nextMode = item?.contentMode || (item?.bodyHtml ? "rich" : "blocks");
  setContentMode(nextMode);
  setBlocks(item?.blocks || []);
  reviewFormDirty = false;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeForm(force = false) {
  if (!form) return;
  if (!force && reviewFormDirty && !confirmDiscardChanges("brouillon")) return;
  editingId = null;
  editingAccent = "";
  form.reset();
  form.classList.add("hidden");
  setContentMode("blocks");
  setRichHtml("");
  if (blocksList) blocksList.innerHTML = "";
  fillExternalLinksInForm(null);
  reviewFormDirty = false;
  renderPreview();
}

function openTopForm(item = null, options = {}) {
  if (!topForm) return;
  if (!topForm.classList.contains("hidden") && topFormDirty && !confirmDiscardChanges("top")) return;
  const duplicate = Boolean(options?.duplicate);
  editingTopId = item && !duplicate ? item.id : null;
  editingTopStatus = normalizePublicationStatus(duplicate ? "draft" : (item?.status || "published"));
  topForm.classList.remove("hidden");
  topFormTitle.textContent = duplicate ? "Dupliquer un top" : (item ? "Modifier un top" : "Ajouter un top");
  topForm.elements.title.value = duplicate ? `${item?.title || "Sans titre"} (copie)` : (item?.title || "");
  topForm.elements.category.value = item?.category || "film";
  topForm.elements.year.value = item?.year || "";
  topForm.elements.subtitle.value = item?.subtitle || "";
  if (topItemQueryInput) topItemQueryInput.value = "";
  setTopItems(item?.items || []);
  topFormDirty = false;
  topForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeTopForm(force = false) {
  if (!topForm) return;
  if (!force && topFormDirty && !confirmDiscardChanges("top")) return;
  editingTopId = null;
  editingTopStatus = "published";
  topForm.reset();
  topForm.classList.add("hidden");
  if (topItemsList) topItemsList.innerHTML = "";
  if (topItemQueryInput) topItemQueryInput.value = "";
  topFormDirty = false;
}

if (form) {
  form.addEventListener("input", markReviewFormDirty);
  form.addEventListener("change", markReviewFormDirty);
  form.elements.title.addEventListener("input", renderPreview);
  form.elements.score.addEventListener("input", renderPreview);
  form.elements.summary.addEventListener("input", renderPreview);
  form.elements.category.addEventListener("change", () => configureMetaFields(form.elements.category.value || "film"));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = form.elements.title.value.trim() || "Sans titre";
    const selectedCategory = form.elements.category.value || "film";
    const directorValue = form.elements.director.value.trim();
    const payload = {
      id: editingId || window.ReviewsStore.slugify(title),
      title,
      category: selectedCategory,
      status: normalizePublicationStatus(form.elements.status?.value || "published"),
      date: form.elements.date.value,
      score: form.elements.score.value === "" ? null : Number(form.elements.score.value),
      cover: form.elements.cover.value.trim(),
      poster: form.elements.poster.value.trim(),
      accent: editingAccent,
      summary: form.elements.summary.value.trim(),
      author: "",
      director: directorValue,
      studio: "",
      releaseYear: form.elements.releaseYear.value.trim(),
      genre: "",
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
    reviewFormDirty = false;
    closeForm(true);
    await renderAll();
  });
}

if (topForm) {
  topForm.addEventListener("input", markTopFormDirty);
  topForm.addEventListener("change", markTopFormDirty);
  topForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = topForm.elements.title.value.trim() || "Sans titre";
    const payload = {
      id: editingTopId || window.ReviewsStore.slugify(title),
      title,
      category: topForm.elements.category.value || "film",
      status: normalizePublicationStatus(editingTopStatus || "published"),
      year: topForm.elements.year.value.trim(),
      subtitle: topForm.elements.subtitle.value.trim(),
      items: readTopItems()
    };
    try {
      await window.ReviewsStore.upsertTop(payload);
    } catch (error) {
      window.alert(`Sauvegarde top impossible : ${error.message}`);
      return;
    }
    topFormDirty = false;
    closeTopForm(true);
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
if (addExternalLinkBtn && externalLinksList) {
  addExternalLinkBtn.addEventListener("click", () => {
    const count = externalLinksList.querySelectorAll(".external-link-row").length;
    if (count >= MAX_EXTERNAL_LINKS) return;
    externalLinksList.appendChild(createExternalLinkRow());
    refreshExternalLinksLabels();
    updateExternalLinksUiState();
  });
}
if (newTopBtn) newTopBtn.addEventListener("click", () => openTopForm());
if (cancelTopBtn) cancelTopBtn.addEventListener("click", closeTopForm);
if (topItemAddBtn) {
  topItemAddBtn.addEventListener("click", () => {
    addTopItemFromQuery();
  });
}
if (topItemQueryInput) {
  topItemQueryInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addTopItemFromQuery();
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

applyReviewsListingStateFromUrl();

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
  reviewsSearchInput.addEventListener("input", () => {
    selectedReviewsSearch = reviewsSearchInput.value || "";
    window.clearTimeout(pendingSearchDebounce);
    pendingSearchDebounce = window.setTimeout(() => {
      renderAll();
    }, 150);
  });
  reviewsSearchInput.addEventListener("keydown", async (event) => {
    if (event.key !== "Escape") return;
    if (!reviewsSearchInput.value) return;
    reviewsSearchInput.value = "";
    selectedReviewsSearch = "";
    await renderAll();
  });
}

if (reviewsResetBtn) {
  reviewsResetBtn.addEventListener("click", () => {
    resetListingFilters();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "/") return;
  if (!reviewsSearchInput) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  const tag = String(target?.tagName || "").toLowerCase();
  const isTypingTarget = tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
  if (isTypingTarget) return;
  event.preventDefault();
  reviewsSearchInput.focus();
  reviewsSearchInput.select();
});

window.addEventListener("popstate", async () => {
  if (!isReviewsListingPage) return;
  suppressListingUrlSync = true;
  applyReviewsListingStateFromUrl();
  await renderAll();
  suppressListingUrlSync = false;
});

document.addEventListener("keydown", (event) => {
  const isSaveShortcut = (event.ctrlKey || event.metaKey) && String(event.key || "").toLowerCase() === "s";
  if (!isSaveShortcut) return;
  if (form && !form.classList.contains("hidden")) {
    event.preventDefault();
    form.requestSubmit();
    return;
  }
  if (topForm && !topForm.classList.contains("hidden")) {
    event.preventDefault();
    topForm.requestSubmit();
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!reviewFormDirty && !topFormDirty) return;
  event.preventDefault();
  event.returnValue = "";
});

if (managerReviewsSortSelect) {
  managerReviewsSortSelect.value = selectedManagerReviewSort;
  managerReviewsSortSelect.addEventListener("change", async () => {
    selectedManagerReviewSort = managerReviewsSortSelect.value || "date-desc";
    await renderAll();
  });
}

if (managerReviewsSearchInput) {
  managerReviewsSearchInput.addEventListener("input", () => {
    selectedManagerReviewSearch = managerReviewsSearchInput.value || "";
    window.clearTimeout(pendingManagerSearchDebounce);
    pendingManagerSearchDebounce = window.setTimeout(() => {
      renderAll();
    }, 120);
  });
}

if (managerTopsSortSelect) {
  managerTopsSortSelect.value = selectedManagerTopSort;
  managerTopsSortSelect.addEventListener("change", async () => {
    selectedManagerTopSort = managerTopsSortSelect.value || "date-desc";
    await renderTopsManager();
  });
}

if (managerTopsSearchInput) {
  managerTopsSearchInput.addEventListener("input", () => {
    selectedManagerTopSearch = managerTopsSearchInput.value || "";
    window.clearTimeout(pendingManagerSearchDebounce);
    pendingManagerSearchDebounce = window.setTimeout(() => {
      renderTopsManager();
    }, 120);
  });
}

if (quickCreateReviewBtn) {
  quickCreateReviewBtn.addEventListener("click", (event) => {
    if (window.ReviewsStore?.getCurrentUser?.()) return;
    event.preventDefault();
    window.alert("Connexion requise pour créer une review.");
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
    if (quickCreateReviewBtn) quickCreateReviewBtn.classList.toggle("hidden", !unlocked);
    if (managerGuestMessage) managerGuestMessage.classList.toggle("hidden", unlocked);
    if (logoutBtn) logoutBtn.classList.toggle("hidden", !unlocked);
    if (authStatus) {
      authStatus.textContent = unlocked
        ? `Connecté en tant que @${currentUser?.username || "utilisateur"}`
        : "Non connecté";
    }
    if (unlocked) {
      await renderAll();
      await renderTopsManager();
      openRequestedTopCreation();
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
fillExternalLinksInForm(null);
if (form) configureMetaFields(form.elements.category.value || "film");
setupReviewTmdbAutocomplete();
setupTopTmdbAutocomplete();
setContentMode("blocks");
renderAll();
